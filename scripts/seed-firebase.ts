import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json pnpm seed
//
// This script is idempotent — safe to run multiple times.
// Users are only created if they don't already exist.
// Sequences and settings use set() which overwrites safely.

initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();
const auth = getAuth();

async function seed() {
  console.log('🌱 Seeding Asoka HMS...\n');

  // 1. Sequences
  await db.doc('sequences/patients').set({ current: 0, prefix: 'ASK' });
  await db.doc('sequences/invoices').set({ current: 0, year: new Date().getFullYear() });
  console.log('✓ Sequences initialised');

  // 2. Clinic settings
  const settings: Record<string, string> = {
    clinicName: 'Asoka Homoeopathic Medical Centre',
    clinicAddress: 'Bengaluru, Karnataka, India',
    clinicPhone: '+91 XXXXX XXXXX',
    clinicGST: '',
    prescriptionHeader: '',
    invoiceFooter: '',
    defaultFollowUpDays: '30',
    patientIdPrefix: 'ASK',
  };
  const batch1 = db.batch();
  for (const [key, value] of Object.entries(settings)) {
    batch1.set(db.doc(`clinicSettings/${key}`), { value });
  }
  await batch1.commit();
  console.log('✓ Clinic settings');

  // 3. Users
  const users: {
    email: string;
    password: string;
    name: string;
    role: string;
    qualification?: string;
    regNumber?: string;
    phone?: string;
  }[] = [
    {
      email: 'admin@asoka.clinic',
      password: 'Admin@1234',
      name: 'Admin',
      role: 'ADMIN',
    },
    {
      email: 'sharma@asoka.clinic',
      password: 'Doctor@1234',
      name: 'Dr. Priya Sharma',
      role: 'DOCTOR',
      qualification: 'BHMS, MD (Hom.)',
      regNumber: 'KMC-2019-0842',
      phone: '+91 98765 00001',
    },
    {
      email: 'front@asoka.clinic',
      password: 'Recept@1234',
      name: 'Lakshmi Nair',
      role: 'RECEPTIONIST',
      phone: '+91 98765 00002',
    },
  ];

  for (const u of users) {
    let uid: string;
    try {
      const existing = await auth.getUserByEmail(u.email);
      uid = existing.uid;
      console.log(`  ↻ User already exists: ${u.email} (${uid})`);
    } catch {
      const created = await auth.createUser({
        email: u.email,
        password: u.password,
        displayName: u.name,
      });
      uid = created.uid;
      console.log(`  + Created user: ${u.email} (${uid})`);
    }

    await db.doc(`users/${uid}`).set(
      {
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: true,
        avatarUrl: null,
        signatureUrl: null,
        qualification: u.qualification ?? null,
        regNumber: u.regNumber ?? null,
        phone: u.phone ?? null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  console.log('✓ Users');

  // 4. Medicines — 35 common homoeopathic medicines
  const medicines: { name: string; mfr: string; cat: string }[] = [
    { name: 'Arnica Montana',           mfr: 'SBL',     cat: 'PLANT'    },
    { name: 'Belladonna',               mfr: 'SBL',     cat: 'PLANT'    },
    { name: 'Nux Vomica',               mfr: 'SBL',     cat: 'PLANT'    },
    { name: 'Sulphur',                  mfr: 'Boiron',  cat: 'MINERAL'  },
    { name: 'Lycopodium Clavatum',      mfr: 'Schwabe', cat: 'PLANT'    },
    { name: 'Pulsatilla Nigricans',     mfr: 'Boiron',  cat: 'PLANT'    },
    { name: 'Natrum Muriaticum',        mfr: 'Schwabe', cat: 'MINERAL'  },
    { name: 'Bryonia Alba',             mfr: 'Schwabe', cat: 'PLANT'    },
    { name: 'Rhus Toxicodendron',       mfr: 'SBL',     cat: 'PLANT'    },
    { name: 'Arsenicum Album',          mfr: 'SBL',     cat: 'MINERAL'  },
    { name: 'Phosphorus',               mfr: 'SBL',     cat: 'MINERAL'  },
    { name: 'Calcarea Carbonica',       mfr: 'SBL',     cat: 'MINERAL'  },
    { name: 'Sepia Officinalis',        mfr: 'Boiron',  cat: 'ANIMAL'   },
    { name: 'Lachesis Mutus',           mfr: 'Schwabe', cat: 'ANIMAL'   },
    { name: 'Ignatia Amara',            mfr: 'Boiron',  cat: 'PLANT'    },
    { name: 'Gelsemium Sempervirens',   mfr: 'SBL',     cat: 'PLANT'    },
    { name: 'Apis Mellifica',           mfr: 'Schwabe', cat: 'ANIMAL'   },
    { name: 'Aconitum Napellus',        mfr: 'SBL',     cat: 'PLANT'    },
    { name: 'Hepar Sulphuris Calcareum',mfr: 'SBL',     cat: 'MINERAL'  },
    { name: 'Mercurius Solubilis',      mfr: 'Boiron',  cat: 'MINERAL'  },
    { name: 'Silicea',                  mfr: 'Schwabe', cat: 'MINERAL'  },
    { name: 'Thuja Occidentalis',       mfr: 'SBL',     cat: 'PLANT'    },
    { name: 'Sanguinaria Canadensis',   mfr: 'SBL',     cat: 'PLANT'    },
    { name: 'Kali Bichromicum',         mfr: 'Schwabe', cat: 'MINERAL'  },
    { name: 'China Officinalis',        mfr: 'SBL',     cat: 'PLANT'    },
    { name: 'Colocynthis',              mfr: 'Boiron',  cat: 'PLANT'    },
    { name: 'Magnesia Phosphorica',     mfr: 'SBL',     cat: 'MINERAL'  },
    { name: 'Veratrum Album',           mfr: 'Schwabe', cat: 'PLANT'    },
    { name: 'Hypericum Perforatum',     mfr: 'SBL',     cat: 'PLANT'    },
    { name: 'Calendula Officinalis',    mfr: 'SBL',     cat: 'PLANT'    },
    { name: 'Chamomilla',               mfr: 'Boiron',  cat: 'PLANT'    },
    { name: 'Allium Cepa',              mfr: 'SBL',     cat: 'PLANT'    },
    { name: 'Euphrasia Officinalis',    mfr: 'Schwabe', cat: 'PLANT'    },
    { name: 'Cantharis Vesicatoria',    mfr: 'SBL',     cat: 'ANIMAL'   },
    { name: 'Staphysagria',             mfr: 'Boiron',  cat: 'PLANT'    },
  ];

  // Check if medicines already seeded (avoid duplicates)
  const existingMedsSnap = await db.collection('medicines').limit(1).get();
  if (!existingMedsSnap.empty) {
    console.log(`✓ Medicines already seeded — skipping (${medicines.length} medicines)`);
  } else {
    const batch2 = db.batch();
    for (const m of medicines) {
      const ref = db.collection('medicines').doc();
      batch2.set(ref, {
        name: m.name,
        manufacturer: m.mfr,
        category: m.cat,
        potencies: ['6C', '30C', '200C', '1M', '10M'],
        isActive: true,
        notes: null,
        deletedAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch2.commit();
    console.log(`✓ ${medicines.length} medicines`);
  }

  console.log('\n✅ Seed complete!\n');
  console.log('Login credentials:');
  console.log('  Admin:        admin@asoka.clinic        / Admin@1234');
  console.log('  Doctor:       sharma@asoka.clinic       / Doctor@1234');
  console.log('  Receptionist: front@asoka.clinic        / Recept@1234');
  console.log('\nNext steps:');
  console.log('  1. Fill in your .env file with Firebase config');
  console.log('  2. Run: pnpm dev');
}

seed().catch((err: unknown) => {
  console.error('\n❌ Seed failed:', err);
  process.exit(1);
});
