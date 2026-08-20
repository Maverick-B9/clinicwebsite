import {
  collection, doc, getDocs, setDoc, updateDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import type { UserProfile } from '../../types';

export async function listUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(query(collection(db, 'users'), orderBy('name', 'asc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
}

// Note: creation of Auth user requires admin SDK or secondary app. This just creates the doc.
export async function createUserProfile(uid: string, data: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function uploadStaffSignature(uid: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const storageRef = ref(storage, `signatures/${uid}/signature.${ext}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateUserProfile(uid, { signatureUrl: url });
  return url;
}
