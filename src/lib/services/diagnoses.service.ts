import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Diagnosis } from '../../types';

export async function addDiagnosis(
  patientId: string,
  visitId: string,
  data: Omit<Diagnosis, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Diagnosis> {
  const ref = await addDoc(collection(db, 'patients', patientId, 'visits', visitId, 'diagnoses'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ...data, createdAt: new Date() as any, updatedAt: new Date() as any };
}

export async function updateDiagnosis(
  patientId: string,
  visitId: string,
  diagnosisId: string,
  data: Partial<Diagnosis>,
): Promise<void> {
  await updateDoc(
    doc(db, 'patients', patientId, 'visits', visitId, 'diagnoses', diagnosisId),
    { ...data, updatedAt: serverTimestamp() },
  );
}

export async function deleteDiagnosis(
  patientId: string,
  visitId: string,
  diagnosisId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'patients', patientId, 'visits', visitId, 'diagnoses', diagnosisId));
}

export async function listDiagnoses(
  patientId: string,
  visitId: string,
): Promise<Diagnosis[]> {
  const snap = await getDocs(
    query(
      collection(db, 'patients', patientId, 'visits', visitId, 'diagnoses'),
      orderBy('sortOrder', 'asc'),
    ),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Diagnosis));
}
