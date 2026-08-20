import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, firebaseConfig } from './firebase';
import { useAuthStore } from '../store/auth.store';
import { UserProfile } from '../types';

export const initAuthListener = () => {
  const { setUser, setLoading } = useAuthStore.getState();

  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() } as UserProfile);
        } else {
          console.error('User document not found for authenticated user.');
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  });
};

export async function loginUser(email: string, password: string): Promise<UserProfile> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, 'users', credential.user.uid));
  if (!snap.exists()) {
    await firebaseSignOut(auth);
    throw new Error('Account not configured. Contact your administrator.');
  }
  return { id: snap.id, ...snap.data() } as UserProfile;
}

export async function createStaffAccount(data: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>, password: string): Promise<void> {
  // Use a secondary app so the admin doesn't get logged out
  const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
  const secondaryAuth = getAuth(secondaryApp);
  
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, data.email, password);
    await setDoc(doc(db, 'users', credential.user.uid), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } finally {
    await firebaseSignOut(secondaryAuth);
  }
}

export async function resetStaffPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}
