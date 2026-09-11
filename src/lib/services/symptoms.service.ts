import {
  collection, addDoc, updateDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { SymptomNote } from '../../types';

/** Get all unique symptoms for a patient (grouped by symptomNumber, ascending) */
export async function listPatientSymptoms(
  patientId: string,
): Promise<{ number: number; label: string }[]> {
  const snap = await getDocs(
    query(
      collection(db, 'patients', patientId, 'symptomNotes'),
      orderBy('symptomNumber', 'asc'),
    ),
  );
  const seen = new Map<number, string>();
  snap.docs.forEach(d => {
    const data = d.data();
    if (!seen.has(data.symptomNumber)) {
      seen.set(data.symptomNumber, data.symptomLabel);
    }
  });
  return Array.from(seen.entries()).map(([number, label]) => ({ number, label }));
}

/** Get all notes for a specific symptom number across all visits */
export async function getSymptomHistory(
  patientId: string,
  symptomNumber: number,
): Promise<SymptomNote[]> {
  const snap = await getDocs(
    query(
      collection(db, 'patients', patientId, 'symptomNotes'),
      where('symptomNumber', '==', symptomNumber),
      orderBy('visitNumber', 'asc'),
    ),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SymptomNote));
}

/** Add or update a symptom note for the current visit (upsert by symptomNumber + visitId) */
export async function saveSymptomNote(
  patientId: string,
  data: Omit<SymptomNote, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<SymptomNote> {
  const existing = await getDocs(
    query(
      collection(db, 'patients', patientId, 'symptomNotes'),
      where('symptomNumber', '==', data.symptomNumber),
      where('visitId', '==', data.visitId),
    ),
  );
  if (!existing.empty) {
    const docRef = existing.docs[0].ref;
    await updateDoc(docRef, { notes: data.notes, updatedAt: serverTimestamp() });
    return { id: docRef.id, ...data, createdAt: new Date() as any, updatedAt: new Date() as any };
  }
  const docRef = await addDoc(
    collection(db, 'patients', patientId, 'symptomNotes'),
    { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
  );
  return { id: docRef.id, ...data, createdAt: new Date() as any, updatedAt: new Date() as any };
}
