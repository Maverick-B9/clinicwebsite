import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Appointment } from '../../types';

export async function createAppointment(
  data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Appointment> {
  const ref = await addDoc(collection(db, 'appointments'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
  });
  return { id: ref.id, ...data, createdAt: new Date() as any, updatedAt: new Date() as any, deletedAt: null };
}

export async function getAppointment(id: string): Promise<Appointment> {
  const snap = await getDoc(doc(db, 'appointments', id));
  if (!snap.exists()) throw new Error('Appointment not found');
  return { id: snap.id, ...snap.data() } as Appointment;
}

export async function updateAppointment(
  id: string,
  data: Partial<Appointment>,
): Promise<void> {
  await updateDoc(doc(db, 'appointments', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function listAppointments(opts: {
  from: Date;
  to: Date;
}): Promise<Appointment[]> {
  const snap = await getDocs(
    query(
      collection(db, 'appointments'),
      where('scheduledAt', '>=', Timestamp.fromDate(opts.from)),
      where('scheduledAt', '<=', Timestamp.fromDate(opts.to)),
      orderBy('scheduledAt', 'asc'),
    ),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)).filter(a => a.deletedAt === null || a.deletedAt === undefined);
}
