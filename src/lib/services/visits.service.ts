import {
  collection, doc, getDoc, getDocs, updateDoc,
  query, orderBy, limit, runTransaction, addDoc, serverTimestamp, increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import type { Visit } from '../../types';
import { upsertInvoiceForVisit } from './invoices.service';

export async function createVisit(
  patientId: string,
  doctorId: string,
  doctorName: string,
): Promise<Visit> {
  const visitsRef = collection(db, 'patients', patientId, 'visits');
  let newVisit!: Visit;

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
  const snap = await getDoc(doc(db, 'patients', patientId, 'visits', visitId));
  if (!snap.exists()) throw new Error('Visit not found');

  const visit = { id: snap.id, ...snap.data() } as Visit;
  if (!visit.isLocked && visit.createdAt) {
    // Need to handle timestamp safely, it might be a server timestamp pending resolution
    const createdAtMillis = typeof visit.createdAt?.toMillis === 'function' ? visit.createdAt.toMillis() : Date.now();
    const hoursSince = (Date.now() - createdAtMillis) / 3_600_000;
    if (hoursSince >= 24) {
      await updateDoc(snap.ref, { isLocked: true });
      visit.isLocked = true;
    }
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
  const visitRef = doc(db, 'patients', patientId, 'visits', visitId);
  const snap = await getDoc(visitRef);
  const existing = snap.exists() ? snap.data() : null;
  const wasDraft = existing?.isDraft === true;

  await updateVisit(patientId, visitId, { ...data, isDraft: false });

  const patientUpdates: any = {
    lastVisitDate: new Date().toISOString().split('T')[0],
    nextFollowUpDate: data.followUpDate ?? null,
    updatedAt: serverTimestamp(),
  };

  if (wasDraft) {
    patientUpdates.visitCount = increment(1);
  }

  await updateDoc(doc(db, 'patients', patientId), patientUpdates);

  if (data.totalFee && data.totalFee > 0) {
    await upsertInvoiceForVisit(patientId, visitId, data);
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
