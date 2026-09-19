import * as admin from 'firebase-admin';

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

async function migrate() {
  console.log('Starting prescription field migration...');
  let fixed = 0;
  let checked = 0;

  const patients = await db.collection('patients').get();
  console.log(`Found ${patients.docs.length} patients`);

  for (const patient of patients.docs) {
    const visits = await db
      .collection('patients').doc(patient.id)
      .collection('visits').get();

    for (const visit of visits.docs) {
      const items = await db
        .collection('patients').doc(patient.id)
        .collection('visits').doc(visit.id)
        .collection('prescriptionItems').get();

      for (const item of items.docs) {
        checked++;
        const data = item.data();
        const updates: Record<string, any> = {};

        // Fix medicine → medicineName
        if (data.medicine && !data.medicineName) {
          updates.medicineName = data.medicine;
          updates.medicine = admin.firestore.FieldValue.delete();
        }

        // Fix notes → instructions
        if (data.notes !== undefined && !data.instructions) {
          updates.instructions = data.notes;
          updates.notes = admin.firestore.FieldValue.delete();
        }

        if (Object.keys(updates).length > 0) {
          await item.ref.update(updates);
          fixed++;
          console.log(`  Fixed item ${item.id} in visit ${visit.id} (patient ${patient.id})`);
        }
      }
    }
  }

  console.log(`\nDone. Checked ${checked} items, fixed ${fixed}.`);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
