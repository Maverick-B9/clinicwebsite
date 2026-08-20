import {
  collection, doc, getDocs, setDoc, getDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

export async function getClinicSettings(): Promise<Record<string, string>> {
  const snap = await getDocs(collection(db, 'clinicSettings'));
  const settings: Record<string, string> = {};
  snap.forEach(d => {
    settings[d.id] = d.data().value;
  });
  return settings;
}

export async function setClinicSetting(key: string, value: string): Promise<void> {
  await setDoc(doc(db, 'clinicSettings', key), {
    value,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
