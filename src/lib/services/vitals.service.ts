import {
  collection, doc, getDoc, getDocs, updateDoc, setDoc,
  query, orderBy, limit, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Vitals } from '../../types';

export async function saveVitals(
  patientId: string,
  visitId: string,
  data: Partial<Vitals>,
): Promise<void> {
  await setDoc(
    doc(db, 'patients', patientId, 'visits', visitId, 'vitals', 'record'),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function getVitals(
  patientId: string,
  visitId: string,
): Promise<Vitals | null> {
  const snap = await getDoc(doc(db, 'patients', patientId, 'visits', visitId, 'vitals', 'record'));
  if (!snap.exists()) return null;
  return snap.data() as Vitals;
}

export async function getLastFiveVitals(patientId: string): Promise<Vitals[]> {
  const visitsSnap = await getDocs(
    query(collection(db, 'patients', patientId, 'visits'), orderBy('visitNumber', 'desc'), limit(5))
  );
  const vitals = [];
  for (const visitDoc of visitsSnap.docs) {
    const v = await getVitals(patientId, visitDoc.id);
    if (v) vitals.push(v);
  }
  return vitals;
}
