import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, setDoc,
  query, where, orderBy, limit, runTransaction, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Invoice, Payment, Visit, Patient, PaymentStatus, PaymentMethod } from '../../types';

// ── Single source of truth for payment status computation ─────────────────
export function computePaymentStatus(total: number, paid: number): PaymentStatus {
  if (paid >= total && total > 0) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  return 'PENDING';
}

export async function generateInvoiceNumber(): Promise<string> {
  const seqRef = doc(db, 'sequences', 'invoices');
  let invoiceNumber = '';
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(seqRef);
    const year = new Date().getFullYear();
    const storedYear = snap.exists() ? snap.data().year : year;
    const current = snap.exists() && storedYear === year ? snap.data().current : 0;
    const next = current + 1;
    tx.set(seqRef, { current: next, year }, { merge: true });
    invoiceNumber = `INV-${year}-${String(next).padStart(4, '0')}`;
  });
  return invoiceNumber;
}

export async function upsertInvoiceForVisit(
  patientId: string,
  visitId: string,
  visitData: Partial<Visit>,
): Promise<void> {
  if (localStorage.debugPay === '1') {
    console.group('[PAY] upsertInvoiceForVisit');
    console.log('inputs:', { patientId, visitId, visitData });
  }
  try {
    const patientSnap = await getDoc(doc(db, 'patients', patientId));
    if (!patientSnap.exists()) throw new Error('Patient not found');
    const patient = patientSnap.data() as Patient;

    const invoicesSnap = await getDocs(
      query(collection(db, 'invoices'), where('visitId', '==', visitId))
    );

    const subtotal = visitData.totalFee ?? 0;
    const gstPercent = 0;
    const gstAmount = subtotal * (gstPercent / 100);
    const total = subtotal + gstAmount;
    const amountPaid = visitData.paidAmount ?? 0;
    const status = computePaymentStatus(total, amountPaid);

    if (localStorage.debugPay === '1') {
      console.log('computed:', { total, amountPaid, status, invoiceCount: invoicesSnap.size });
    }

    if (invoicesSnap.empty) {
      // CREATE — use computePaymentStatus, never trust visitData.paymentStatus
      const invoiceNumber = await generateInvoiceNumber();
      const docData: Omit<Invoice, 'id'> = {
        invoiceNumber,
        patientId,
        patientName: patient.name,
        patientRefId: patient.patientRefId,
        visitId,
        consultationFee: visitData.consultationFee ?? 0,
        medicineFee: visitData.medicineFee ?? 0,
        discount: visitData.discount ?? 0,
        subtotal,
        gstPercent,
        gstAmount,
        total,
        amountPaid,
        amountDue: Math.max(0, total - amountPaid),
        status,  // ← computed, not from visitData.paymentStatus
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };
      if (localStorage.debugPay === '1') {
        console.log('creating invoice:', docData);
      }
      const newRef = await addDoc(collection(db, 'invoices'), docData);
      if (localStorage.debugPay === '1') {
        console.log('invoice created:', newRef.id);
      }
    } else {
      // UPDATE
      const invoiceDoc = invoicesSnap.docs[0];
      const existingData = invoiceDoc.data() as Invoice;
      const newAmountPaid = visitData.paidAmount !== undefined ? visitData.paidAmount : existingData.amountPaid;
      const newStatus = computePaymentStatus(total, newAmountPaid);
      const amountDue = Math.max(0, total - newAmountPaid);

      if (localStorage.debugPay === '1') {
        console.log('updating invoice:', invoiceDoc.id, { newAmountPaid, newStatus, amountDue });
      }
      await updateDoc(invoiceDoc.ref, {
        consultationFee: visitData.consultationFee ?? existingData.consultationFee,
        medicineFee: visitData.medicineFee ?? existingData.medicineFee,
        discount: visitData.discount ?? existingData.discount,
        subtotal,
        gstAmount,
        total,
        amountPaid: newAmountPaid,
        amountDue,
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err: any) {
    console.error('[upsertInvoiceForVisit] error:', err?.code, err?.message, err);
    throw err; // re-throw so callers can surface to user
  } finally {
    if (localStorage.debugPay === '1') {
      console.groupEnd();
    }
  }
}

export async function recordPayment(
  invoiceId: string,
  payment: Omit<Payment, 'id'>,
): Promise<{ visitSynced: boolean }> {
  if (localStorage.debugPay === '1') {
    console.group('[PAY] recordPayment');
    console.log('inputs:', { invoiceId, payment });
  }

  let patientId: string | undefined;
  let visitId: string | undefined;
  let newStatus: PaymentStatus;
  let newAmountPaid: number;

  try {
    // TRANSACTION: invoice + payments subdoc only (no visit write inside)
    await runTransaction(db, async (tx) => {
      const invoiceRef = doc(db, 'invoices', invoiceId);
      const invoiceSnap = await tx.get(invoiceRef);
      if (!invoiceSnap.exists()) throw new Error('Invoice not found');

      const invoice = invoiceSnap.data() as Invoice;
      patientId = invoice.patientId;
      visitId = invoice.visitId;
      newAmountPaid = invoice.amountPaid + payment.amount;
      const newAmountDue = Math.max(0, invoice.total - newAmountPaid);
      newStatus = computePaymentStatus(invoice.total, newAmountPaid);

      if (localStorage.debugPay === '1') {
        console.log('invoice fetched:', { patientId, visitId, total: invoice.total, prev: invoice.amountPaid, newAmountPaid, newStatus });
      }

      // Log payment sub-doc
      const paymentRef = doc(collection(invoiceRef, 'payments'));
      tx.set(paymentRef, { ...payment, createdAt: serverTimestamp() });

      // Update the invoice
      tx.update(invoiceRef, {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      if (localStorage.debugPay === '1') {
        console.log('transaction writes queued for invoice', invoiceId);
      }
      // NOTE: visit update is intentionally NOT inside this transaction.
      // A Receptionist can write invoices but not visits. Splitting allows
      // the payment to succeed even if the visit mirror fails.
    });

    if (localStorage.debugPay === '1') {
      console.log('transaction committed. Now mirroring to visit...');
    }
  } catch (err: any) {
    console.error('[recordPayment] transaction failed:', err?.code, err?.message, err);
    if (localStorage.debugPay === '1') console.groupEnd();
    throw err;
  }

  // MIRROR to visit — separate updateDoc, best-effort (receptionist may not have write access)
  let visitSynced = false;
  if (patientId && visitId) {
    const visitRef = doc(db, 'patients', patientId!, 'visits', visitId!);
    const syncPayload = {
      paymentStatus: newStatus!,
      paidAmount: newAmountPaid!,
      ...(newStatus! === 'PAID' ? { paidAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    };
    if (localStorage.debugPay === '1') {
      console.log('mirroring to visit:', visitRef.path, syncPayload);
    }
    try {
      await updateDoc(visitRef, syncPayload);
      visitSynced = true;
      if (localStorage.debugPay === '1') console.log('visit mirror: success');
    } catch (mirrorErr: any) {
      // Do NOT throw — the payment was already committed successfully.
      console.error('[recordPayment] visit mirror failed (payment still recorded):', mirrorErr?.code, mirrorErr?.message);
      if (localStorage.debugPay === '1') console.log('visit mirror: FAILED (payment still saved)');
    }
  }

  if (localStorage.debugPay === '1') console.groupEnd();
  return { visitSynced };
}

export async function listInvoices(opts: { status?: string }): Promise<Invoice[]> {
  let q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
  if (opts.status && opts.status !== 'ALL') {
    q = query(collection(db, 'invoices'), where('status', '==', opts.status), orderBy('createdAt', 'desc'));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice));
}

export async function recordVisitPayment(
  patientId: string,
  visitId: string,
  amount: number,
  method: PaymentMethod,
  reference?: string,
  recordedBy?: string
): Promise<{ visitSynced: boolean }> {
  // Find invoice for this visit
  const invoicesSnap = await getDocs(
    query(collection(db, 'invoices'), where('visitId', '==', visitId), limit(1))
  );
  let invoiceId: string;
  if (invoicesSnap.empty) {
    let totalFee = amount;
    try {
      const vSnap = await getDoc(doc(db, 'patients', patientId, 'visits', visitId));
      if (vSnap.exists()) {
        const vData = vSnap.data() as Visit;
        totalFee = vData.totalFee ?? amount;
      }
    } catch {
      // ignore
    }
    await upsertInvoiceForVisit(patientId, visitId, {
      totalFee,
      paidAmount: 0,
      paymentMethod: method,
      paymentReference: reference,
    });
    const recheck = await getDocs(
      query(collection(db, 'invoices'), where('visitId', '==', visitId), limit(1))
    );
    if (recheck.empty) throw new Error('Failed to create invoice for visit');
    invoiceId = recheck.docs[0].id;
  } else {
    invoiceId = invoicesSnap.docs[0].id;
  }

  return await recordPayment(invoiceId, {
    amount,
    method,
    reference: reference || '',
    recordedBy: recordedBy || 'Receptionist',
    paidAt: new Date() as any,
  });
}

export async function clearAllInvoices(): Promise<void> {
  const snap = await getDocs(collection(db, 'invoices'));
  const batch = [];
  for (const invoice of snap.docs) {
    batch.push(deleteDoc(invoice.ref));
  }
  await Promise.all(batch);

  await setDoc(doc(db, 'sequences', 'invoices'), { current: 0, year: new Date().getFullYear() }, { merge: true });
}

