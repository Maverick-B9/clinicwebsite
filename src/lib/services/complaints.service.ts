import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Complaint } from '../../types';

export async function addComplaint(
  patientId: string,
  visitId: string,
  data: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Complaint> {
  const ref = await addDoc(collection(db, 'patients', patientId, 'visits', visitId, 'complaints'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ...data, createdAt: new Date() as any, updatedAt: new Date() as any };
}

export async function updateComplaint(
  patientId: string,
  visitId: string,
  complaintId: string,
  data: Partial<Complaint>,
): Promise<void> {
  await updateDoc(
    doc(db, 'patients', patientId, 'visits', visitId, 'complaints', complaintId),
    { ...data, updatedAt: serverTimestamp() },
  );
}

export async function deleteComplaint(
  patientId: string,
  visitId: string,
  complaintId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'patients', patientId, 'visits', visitId, 'complaints', complaintId));
}

export async function listComplaints(
  patientId: string,
  visitId: string,
): Promise<Complaint[]> {
  const snap = await getDocs(
    query(
      collection(db, 'patients', patientId, 'visits', visitId, 'complaints'),
      orderBy('sortOrder', 'asc'),
    ),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Complaint));
}
