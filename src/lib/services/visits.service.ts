import {
  collection, doc, getDoc, getDocs, updateDoc,
  query, orderBy, limit, runTransaction, addDoc, serverTimestamp, increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import type { Visit } from '../../types';
import { upsertInvoiceForVisit, computePaymentStatus } from './invoices.service';

export async function createVisit(
  patientId: string,
  doctorId: string,
  doctorName: string,
): Promise<Visit> {
  const visitsRef = collection(db, 'patients', patientId, 'visits');
  let newVisit!: Visit;

  // NOTE: getDocs inside a transaction is non-transactional (SDK limitation).
  // To avoid duplicate visit numbers on concurrent opens, callers should avoid
  // calling createVisit concurrently for the same patient.
  await runTransaction(db, async (tx) => {
    const q = query(visitsRef, orderBy('visitNumber', 'desc'), limit(1));
    const snap = await getDocs(q);
    const lastNum = snap.empty ? 0 : (snap.docs[0].data().visitNumber as number);

    const visitRef = doc(visitsRef);
    const visitData = {
      visitNumber: lastNum + 1,
      patientId,
      doctorId,
      doctorName,
      date: serverTimestamp(),
      isLocked: false,
      isDraft: true,
      paymentStatus: 'PENDING' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    tx.set(visitRef, visitData);
    newVisit = { id: visitRef.id, ...visitData } as unknown as Visit;
  });

  return newVisit;
}

export async function getVisit(
  patientId: string,
  visitId: string,
): Promise<Visit> {
  if (localStorage.debugPay === '1') {
    console.group('[PAY] getVisit');
    console.log('inputs:', { patientId, visitId });
  }
  const snap = await getDoc(doc(db, 'patients', patientId, 'visits', visitId));
  if (!snap.exists()) throw new Error('Visit not found');

  // NEVER write inside a getter. Auto-lock has been removed.
  const visit = { id: snap.id, ...snap.data() } as Visit;
  if (localStorage.debugPay === '1') {
    console.log('visit:', { paymentStatus: visit.paymentStatus, paidAmount: visit.paidAmount, isLocked: visit.isLocked });
    console.groupEnd();
  }
  return visit;
}

export async function updateVisit(
  patientId: string,
  visitId: string,
  data: Partial<Visit>,
): Promise<void> {
  await updateDoc(
    doc(db, 'patients', patientId, 'visits', visitId),
    { ...data, updatedAt: serverTimestamp() },
  );
}

export async function listVisits(patientId: string): Promise<Visit[]> {
  const snap = await getDocs(
    query(
      collection(db, 'patients', patientId, 'visits'),
      orderBy('visitNumber', 'desc'),
    ),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Visit)).filter(v => !v.deletedAt);
}

export async function saveVisit(
  patientId: string,
  visitId: string,
  data: Partial<Visit>,
): Promise<void> {
  if (localStorage.debugPay === '1') {
    console.group('[PAY] saveVisit');
    console.log('inputs:', { patientId, visitId, data });
  }
  const visitRef = doc(db, 'patients', patientId, 'visits', visitId);
  const snap = await getDoc(visitRef);
  const existing = snap.exists() ? snap.data() : null;
  const wasDraft = existing?.isDraft === true;

  // Compute totalFee and paymentStatus authoritatively here — never trust callers.
  const cf = data.consultationFee ?? existing?.consultationFee ?? 0;
  const mf = data.medicineFee ?? existing?.medicineFee ?? 0;
  const dc = data.discount ?? existing?.discount ?? 0;
  const totalFee = Math.max(0, cf + mf - dc);
  const paidAmount = data.paidAmount ?? existing?.paidAmount ?? 0;
  const paymentStatus = computePaymentStatus(totalFee, paidAmount);

  if (localStorage.debugPay === '1') {
    console.log('computed:', { totalFee, paidAmount, paymentStatus });
  }

  await updateVisit(patientId, visitId, {
    ...data,
    totalFee,
    paymentStatus,
    isDraft: false,
  });

  // Update patient fields carefully:
  // - Only set lastVisitDate when this is the patient's latest non-draft visit.
  // - Use the visit's own visitDate, not today's date.
  // - Never null out nextFollowUpDate if it was not provided in data.
  const allVisits = await listVisits(patientId);
  const nonDrafts = allVisits.filter(v => !v.isDraft && v.id !== visitId);
  const savedVisitDate = data.visitDate ?? existing?.visitDate ?? new Date().toISOString().split('T')[0];

  // Find if this visit is the most recent by date
  const isLatestVisit = nonDrafts.every(v => {
    const otherDate = v.visitDate ?? '';
    return !otherDate || otherDate <= savedVisitDate;
  });

  const patientUpdates: any = { updatedAt: serverTimestamp() };
  if (wasDraft) {
    patientUpdates.visitCount = increment(1);
  }
  if (isLatestVisit || wasDraft) {
    patientUpdates.lastVisitDate = savedVisitDate;
    // Only update nextFollowUpDate if explicitly provided
    if (data.followUpDate !== undefined) {
      patientUpdates.nextFollowUpDate = data.followUpDate ?? null;
    }
  }

  await updateDoc(doc(db, 'patients', patientId), patientUpdates);

  // Upsert invoice when there are fees or any payment
  if (totalFee > 0 || paidAmount > 0) {
    try {
      await upsertInvoiceForVisit(patientId, visitId, {
        ...data,
        totalFee,
        paidAmount,
        paymentStatus,
      });
    } catch (err: any) {
      console.error('[saveVisit] upsertInvoiceForVisit failed:', err?.code, err?.message);
      // Re-throw so UI can show error to user
      throw err;
    }
  }

  if (localStorage.debugPay === '1') {
    console.log('saveVisit complete');
    console.groupEnd();
  }
}

export async function repeatLastPrescription(
  patientId: string,
  targetVisitId: string,
): Promise<void> {
  const visits = await listVisits(patientId);
  const previousVisit = visits.find(v => v.id !== targetVisitId && !v.isDraft);
  if (!previousVisit) return;

  const snap = await getDocs(
    collection(db, 'patients', patientId, 'visits', previousVisit.id, 'prescriptionItems'),
  );

  const batch = [];
  for (const d of snap.docs) {
    const item = d.data();
    batch.push(
      addDoc(
        collection(db, 'patients', patientId, 'visits', targetVisitId, 'prescriptionItems'),
        { ...item, id: undefined, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
      ),
    );
  }
  await Promise.all(batch);
}

export async function saveSignature(
  patientId: string,
  visitId: string,
  dataUrl: string,
): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const storageRef = ref(storage, `patients/${patientId}/visits/${visitId}/signature.png`);
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  await updateVisit(patientId, visitId, { signatureUrl: url });
  return url;
}
