import {
  collection, doc, getDocs, addDoc, updateDoc,
  query, where, orderBy, limit, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Medicine } from '../../types';

export async function searchMedicines(
  q: string,
): Promise<{ id: string; name: string; potencies: string[] }[]> {
  const snap = await getDocs(
    query(
      collection(db, 'medicines'),
      where('name', '>=', q),
      where('name', '<=', q + '\uf8ff'),
      limit(20),
    ),
  );
  return snap.docs
    .filter(d => d.data().isActive === true)
    .slice(0, 8)
    .map(d => ({
      id: d.id,
      name: d.data().name,
      potencies: d.data().potencies,
    }));
}

export async function listMedicines(opts: { category?: string; activeOnly?: boolean }): Promise<Medicine[]> {
  let q = query(collection(db, 'medicines'), orderBy('name', 'asc'));
  
  const snap = await getDocs(q);
  let meds = snap.docs.map(d => ({ id: d.id, ...d.data() } as Medicine)).filter(m => !m.deletedAt);
  
  if (opts.category && opts.category !== 'ALL') {
    meds = meds.filter(m => m.category === opts.category);
  }
  if (opts.activeOnly) {
    meds = meds.filter(m => m.isActive === true);
  }
  return meds;
}

export async function createMedicine(data: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medicine> {
  const ref = await addDoc(collection(db, 'medicines'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ...data, createdAt: new Date() as any, updatedAt: new Date() as any };
}

export async function updateMedicine(id: string, data: Partial<Medicine>): Promise<void> {
  await updateDoc(doc(db, 'medicines', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
