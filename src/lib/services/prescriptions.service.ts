import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { PrescriptionItem } from '../../types';

export async function addPrescriptionItem(
  patientId: string,
  visitId: string,
  data: Omit<PrescriptionItem, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<PrescriptionItem> {
  const ref = await addDoc(collection(db, 'patients', patientId, 'visits', visitId, 'prescriptionItems'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ...data, createdAt: new Date() as any, updatedAt: new Date() as any };
}

export async function updatePrescriptionItem(
  patientId: string,
  visitId: string,
  itemId: string,
  data: Partial<PrescriptionItem>,
): Promise<void> {
  await updateDoc(
    doc(db, 'patients', patientId, 'visits', visitId, 'prescriptionItems', itemId),
    { ...data, updatedAt: serverTimestamp() },
  );
}

export async function deletePrescriptionItem(
  patientId: string,
  visitId: string,
  itemId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'patients', patientId, 'visits', visitId, 'prescriptionItems', itemId));
}

export async function listPrescriptionItems(
  patientId: string,
  visitId: string,
): Promise<PrescriptionItem[]> {
  const snap = await getDocs(
    query(
      collection(db, 'patients', patientId, 'visits', visitId, 'prescriptionItems'),
      orderBy('sortOrder', 'asc'),
    ),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PrescriptionItem));
}
