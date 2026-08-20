import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Usage: GOOGLE_APPLICATION_CREDENTIALS=... pnpm tsx scripts/sync-visit-counts.ts

initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

async function run() {
  console.log('Syncing visit counts...');
  const patientsSnap = await db.collection('patients').get();
  let updated = 0;

  for (const doc of patientsSnap.docs) {
    const visitsSnap = await db.collection('patients').doc(doc.id).collection('visits').get();
    let count = 0;
    visitsSnap.docs.forEach(v => {
      if (v.data().isDraft === false) count++;
    });
    
    if (doc.data().visitCount !== count) {
      await doc.ref.update({ visitCount: count });
      updated++;
      console.log(`Updated ${doc.id}: ${doc.data().visitCount} -> ${count}`);
    }
  }

  console.log(`Finished. Updated ${updated} patients.`);
}

run().catch(console.error);
