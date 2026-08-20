import {
  collection, doc, getDocs, addDoc, updateDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import type { PatientDocument, DocumentType } from '../../types';

export async function uploadDocument(
  patientId: string,
  visitId: string | undefined,
  file: File,
  type: DocumentType,
  uploadedBy: string,
  onProgress?: (progress: number) => void
): Promise<PatientDocument> {
  const ext = file.name.split('.').pop();
  const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const storageRef = ref(storage, `patients/${patientId}/documents/${filename}`);
  
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        const docData = {
          patientId,
          visitId: visitId || null,
          filename,
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          storageUrl: url,
          type,
          uploadedBy,
          createdAt: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, 'patients', patientId, 'documents'), docData);
        resolve({ id: docRef.id, ...docData, createdAt: new Date() as any } as PatientDocument);
      }
    );
  });
}

export async function listDocuments(patientId: string): Promise<PatientDocument[]> {
  const snap = await getDocs(
    query(
      collection(db, 'patients', patientId, 'documents'),
      orderBy('createdAt', 'desc')
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PatientDocument)).filter(d => !d.deletedAt);
}

export async function deleteDocument(patientId: string, documentId: string): Promise<void> {
  await updateDoc(doc(db, 'patients', patientId, 'documents', documentId), {
    deletedAt: serverTimestamp(),
  });
}
