import {
  collection, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { AuditLog } from '../../types';

export async function writeAuditLog(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> {
  // Never blocks the main operation, catch errors silently
  addDoc(collection(db, 'auditLogs'), {
    ...data,
    createdAt: serverTimestamp(),
  }).catch((err) => {
    console.error('Failed to write audit log:', err);
  });
}
