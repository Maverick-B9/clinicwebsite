# Asoka HMS — Homoeopathic Medical Centre

Clinical Management System for Asoka Homoeopathic Medical Centre, Bengaluru.

## Tech stack
React 18 · Vite 6 · Tailwind CSS v4 · Firebase (Auth + Firestore + Storage) · TypeScript

## Setup

### Prerequisites
- Node.js 20+
- pnpm
- A Firebase project (Blaze plan for Storage)

### 1. Clone and install
pnpm install

### 2. Configure Firebase
Copy .env.example to .env and fill in your Firebase project credentials:
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

### 3. Deploy Firestore rules
firebase deploy --only firestore:rules

### 4. Seed the database
Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path, then:
pnpm seed

This creates 3 users, 35 medicines, sequences, and clinic settings.

### 5. Run the app
pnpm dev

Open http://localhost:5173

## Login credentials (after seeding)
| Role         | Email                    | Password     |
|--------------|--------------------------|--------------|
| Admin        | admin@asoka.clinic       | Admin@1234   |
| Doctor       | sharma@asoka.clinic      | Doctor@1234  |
| Receptionist | front@asoka.clinic       | Recept@1234  |

## Key features
- Patient registration with auto-generated ASK-XXXX IDs
- Multi-diagnosis visits (FINAL / PROVISIONAL / DIFFERENTIAL)
- Prescription builder with medicine autocomplete
- 7 payment methods with conditional reference fields
- Signature capture and PDF generation
- Role-based access (Receptionist blocked from clinical data)
- Firestore security rules enforced server-side
- Dark mode support