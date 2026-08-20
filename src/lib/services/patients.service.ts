import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, limit, startAfter, runTransaction,
  serverTimestamp, DocumentSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import type { Patient } from '../../types';

export async function generatePatientRefId(): Promise<string> {
  const seqRef = doc(db, 'sequences', 'patients');
  let newId = '';
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(seqRef);
    const current = snap.exists() ? (snap.data().current as number) : 0;
    const prefix = snap.exists() ? (snap.data().prefix as string) : 'ASK';
    const next = current + 1;
    tx.set(seqRef, { current: next, prefix }, { merge: true });
    newId = `${prefix}-${String(next).padStart(4, '0')}`;
  });
  return newId;
}

export async function createPatient(
  data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'patientRefId' | 'visitCount'>,
  createdBy: string,
): Promise<Patient> {
  const patientRefId = await generatePatientRefId();
  const ref = await addDoc(collection(db, 'patients'), {
    ...data,
    patientRefId,
    visitCount: 0,
    isActive: true,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
  });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() } as Patient;
}

export async function getPatient(patientId: string): Promise<Patient> {
  const snap = await getDoc(doc(db, 'patients', patientId));
  if (!snap.exists()) throw new Error('Patient not found');
  return { id: snap.id, ...snap.data() } as Patient;
}

export async function updatePatient(
  patientId: string,
  data: Partial<Patient>,
): Promise<void> {
  await updateDoc(doc(db, 'patients', patientId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function softDeletePatient(patientId: string): Promise<void> {
  await updateDoc(doc(db, 'patients', patientId), {
    deletedAt: serverTimestamp(),
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

export async function syncVisitCounts(): Promise<void> {
  const snap = await getDocs(collection(db, 'patients'));
  for (const docSnap of snap.docs) {
    const visitsSnap = await getDocs(collection(db, 'patients', docSnap.id, 'visits'));
    const count = visitsSnap.docs.filter(d => d.data().isDraft === false).length;
    if (docSnap.data().visitCount !== count) {
      await updateDoc(docSnap.ref, { visitCount: count });
    }
  }
}

export async function listPatients(opts: {
  search?: string;
  status?: string;
  pageSize?: number;
  lastDoc?: DocumentSnapshot;
}): Promise<{ patients: Patient[]; lastDoc: DocumentSnapshot | null }> {
  let q = query(
    collection(db, 'patients'),
    orderBy('name'),
    limit(opts.pageSize ?? 25),
  );
  if (opts.lastDoc) q = query(q, startAfter(opts.lastDoc));
  const snap = await getDocs(q);
  // Filter out soft-deleted patients client-side to avoid composite index requirements
  let patients = snap.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
  patients = patients.filter(p => p.deletedAt === null || p.deletedAt === undefined);
  const filtered = opts.search
    ? patients.filter(p =>
        p.name.toLowerCase().includes(opts.search!.toLowerCase()) ||
        p.mobile.includes(opts.search!) ||
        p.patientRefId.toLowerCase().includes(opts.search!.toLowerCase()),
      )
    : patients;
  return {
    patients: filtered,
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
  };
}

export async function searchPatients(q: string): Promise<Patient[]> {
  const snap = await getDocs(
    query(
      collection(db, 'patients'),
      where('name', '>=', q),
      where('name', '<=', q + '\uf8ff'),
      limit(8),
    ),
  );
  let patients = snap.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
  return patients.filter(p => p.deletedAt === null || p.deletedAt === undefined);
}

export async function uploadPatientPhoto(
  patientId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split('.').pop();
  const storageRef = ref(storage, `patients/${patientId}/photo.${ext}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, 'patients', patientId), { avatarUrl: url });
  return url;
}
