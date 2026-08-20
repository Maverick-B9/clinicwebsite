import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, setDoc,
  query, where, orderBy, runTransaction, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Invoice, Payment, Visit, Patient } from '../../types';

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
  const patientSnap = await getDoc(doc(db, 'patients', patientId));
  if (!patientSnap.exists()) throw new Error('Patient not found');
  const patient = patientSnap.data() as Patient;

  const invoicesSnap = await getDocs(
    query(collection(db, 'invoices'), where('visitId', '==', visitId))
  );

  const subtotal = visitData.totalFee ?? 0;
  const gstPercent = 0; // Customize if needed
  const gstAmount = subtotal * (gstPercent / 100);
  const total = subtotal + gstAmount;

  if (invoicesSnap.empty) {
    // Create new
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
      amountPaid: visitData.paidAmount ?? 0,
      amountDue: total - (visitData.paidAmount ?? 0),
      status: visitData.paymentStatus ?? 'PENDING',
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };
    await addDoc(collection(db, 'invoices'), docData);
  } else {
    // Update existing
    const invoiceDoc = invoicesSnap.docs[0];
    const existingData = invoiceDoc.data() as Invoice;
    const amountDue = total - existingData.amountPaid;
    let status = existingData.status;
    if (amountDue <= 0) status = 'PAID';
    else if (existingData.amountPaid > 0) status = 'PARTIAL';
    else status = 'PENDING';

    await updateDoc(invoiceDoc.ref, {
      consultationFee: visitData.consultationFee ?? existingData.consultationFee,
      medicineFee: visitData.medicineFee ?? existingData.medicineFee,
      discount: visitData.discount ?? existingData.discount,
      subtotal,
      gstAmount,
      total,
      amountDue,
      status,
      updatedAt: serverTimestamp(),
    });
  }
}

export async function recordPayment(
  invoiceId: string,
  payment: Omit<Payment, 'id'>,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceSnap = await tx.get(invoiceRef);
    if (!invoiceSnap.exists()) throw new Error('Invoice not found');

    const invoice = invoiceSnap.data() as Invoice;
    const newAmountPaid = invoice.amountPaid + payment.amount;
    const newAmountDue = invoice.total - newAmountPaid;
    
    let status = invoice.status;
    if (newAmountDue <= 0) status = 'PAID';
    else if (newAmountPaid > 0) status = 'PARTIAL';

    const paymentRef = doc(collection(invoiceRef, 'payments'));
    tx.set(paymentRef, payment);

    tx.update(invoiceRef, {
      amountPaid: newAmountPaid,
      amountDue: newAmountDue,
      status,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function listInvoices(opts: { status?: string }): Promise<Invoice[]> {
  let q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
  if (opts.status && opts.status !== 'ALL') {
    q = query(collection(db, 'invoices'), where('status', '==', opts.status), orderBy('createdAt', 'desc'));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice));
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
