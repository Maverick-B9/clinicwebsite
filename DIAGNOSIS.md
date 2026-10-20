# DIAGNOSIS.md — Phase 0 Static Trace

> Generated: 2026-10-20  
> Codebase: Maverick-B9/clinicwebsite (React + Vite + Firebase/Firestore)

---

## 0.1 Static Trace — Every Payment Write Path

### A. `createVisit` (visits.service.ts:24-36)
- Writes to `patients/{pid}/visits/{vid}`:
  ```
  paymentStatus: 'PENDING'   ← always, no exceptions
  isDraft: true
  ```
- **No invoice is ever created here.** ✓

### B. `NewVisitPage.handleSave` → `saveVisit` → `upsertInvoiceForVisit`

**NewVisitPage.tsx:64-116**  
`handleSave` computes `totalFee` locally (line 69) and passes it to `saveVisit`. It passes:
- `paidAmount`, `paymentMethod`, `paymentReference`
- **BUT NEVER `paymentStatus`** — the `paymentStatus` field is omitted from the object passed to `saveVisit` (lines 71-84).

**visits.service.ts:84-111 — `saveVisit`**  
- Writes `{ ...data, isDraft: false }` directly to the visit doc via `updateVisit` (line 94).
- Since `data.paymentStatus` is **undefined** (never passed), Firestore `updateDoc` does NOT overwrite the existing `paymentStatus: 'PENDING'`. The visit stays PENDING.
- `upsertInvoiceForVisit` is only called when `data.totalFee && data.totalFee > 0` (line 108).

**invoices.service.ts:41-63 — `upsertInvoiceForVisit` (CREATE branch)**  
- Line 59: `status: visitData.paymentStatus ?? 'PENDING'`
- Since `visitData.paymentStatus` is undefined (NewVisitPage never passes it), the invoice is always created with `status: 'PENDING'` regardless of what was actually paid.

**invoices.service.ts:64-87 — UPDATE branch**  
- Correctly computes status from `amountDue` when updating an existing invoice. This branch does work correctly.

### C. `VisitDetailPage.handleSaveEdits` → `saveVisit` → `upsertInvoiceForVisit`

**VisitDetailPage.tsx:84-133**  
- Correctly computes `paymentStatus` (lines 94-96) and passes it to `saveVisit` (line 107).
- However `saveVisit` still does **NOT** mirror paymentStatus from the invoice back to the visit after upsert — it just writes whatever `data.paymentStatus` says.
- Also: `clinicalNotes` is never saved (omitted from saveVisit call at line 98-110).
- Deleted prescription rows are NOT deleted (no `deletePrescriptionItem` call).
- Diagnoses edits are NOT persisted (DiagnosesCard is read-only when `disableAutoAppend={true}`).
- `paymentReference` is NOT saved (omitted from saveVisit call).

### D. `BillingPage.handlePayment` → `recordPayment`

**BillingPage.tsx:41-63**  
- `recordedBy` is hardcoded `'system'` (line 52) — not the logged-in user.
- No query invalidation after payment (`queryClient.invalidateQueries` is never called).
- Error path: `console.error(err)` doesn't log `error.code` (line 58).

**invoices.service.ts:90-130 — `recordPayment`**  
- Runs a transaction: logs payment subdoc + updates invoice ✓
- Line 121-128: Also calls `tx.update(visitRef, ...)` inside the **same** transaction to mirror status to visit.
- **CRITICAL**: `tx.update()` will throw `NOT_FOUND` if the visit doc doesn't exist, rolling back the entire transaction (payment lost). But visits always exist if an invoice was created via `saveVisit` — so this is low risk in practice.
- **CRITICAL for RECEPTIONIST**: The Firestore rule for visits is `allow read, write: if isClinical()` (firestore.rules:35). `isClinical()` = `isAdmin() || isDoctor()` (line 16). A RECEPTIONIST calling `tx.update(visitRef, ...)` inside the transaction will get `permission-denied`, **rolling back the entire transaction** — no payment recorded, no invoice updated.

### E. Readers

**PatientProfilePage.tsx:106-134**  
- Reads `visit.paymentStatus` directly (line 122-126) ✓ — correct, shows per-visit status.
- Line 118: `Dr. {v.doctorName}` — if `doctorName` is stored as `"Dr. Foo"` this renders `"Dr. Dr. Foo"`. ✓ CONFIRMED.

**PreviousVisitsPanel.tsx ~line 143-144, 181-183**  
- `₹` (rupee sign) and `·` (middle dot) are corrupted (WINDOWS-1252 encoding): renders as `?` in browser.

**BillingPage.tsx**  
- Reads from `invoices` collection directly. Source of truth is invoice, not visit.
- Does NOT invalidate React state after payment — calls `reload()` (line 55) which re-fetches, so UI does update (but no react-query invalidation since this page uses local state).

**useInvoices.ts:6-10**  
- `useQuery` key is `['invoices', status]` — does NOT auto-invalidate on payment from `BillingPage` (which uses imperative calls). `useRecordPayment` mutation on success only invalidates `['invoices']` key.

---

## 0.2 Suspect Verdicts

### S1 — CONFIRMED ✓
**`NewVisitPage.handleSave` never passes `paymentStatus` to `saveVisit`**

- `NewVisitPage.tsx:71-84`: the object passed to `saveVisit` has no `paymentStatus` field.
- `visits.service.ts:94`: `updateDoc` with `{ ...data, isDraft: false }` — since `data.paymentStatus` is undefined, Firestore `updateDoc` leaves the field at its existing value (`'PENDING'`).
- `invoices.service.ts:59`: new invoice gets `status: visitData.paymentStatus ?? 'PENDING'` — always `'PENDING'` because `NewVisitPage` never passes it.
- **Effect**: Every visit saved from `NewVisitPage` has `paymentStatus: 'PENDING'` in the visit doc AND `status: 'PENDING'` in the invoice, regardless of how much was paid.

### S2 — CONFIRMED ✓
**`saveVisit` only calls `upsertInvoiceForVisit` when `data.totalFee > 0`**

- `visits.service.ts:108`: `if (data.totalFee && data.totalFee > 0)` — draft saves, zero-fee saves, and saves where caller doesn't pass `totalFee` create no invoice.
- **Effect**: Visits with zero fee or draft saves have no invoice → Billing page has no "Record" button for those visits.

### S3 — CONFIRMED (partial) ✓
**RECEPTIONIST's transaction is rejected by Firestore rules**

- `firestore.rules:35`: `allow read, write: if isClinical();` — RECEPTIONIST is excluded.
- `invoices.service.ts:122-128`: `tx.update(visitRef, ...)` inside the same transaction as the invoice update and payment subdoc write.
- When a RECEPTIONIST calls `recordPayment`, the `tx.update(visitRef, ...)` call fails with `permission-denied`, **rolling back the entire transaction** — the payment subdoc and invoice update are also rolled back. **No payment is ever recorded when a RECEPTIONIST tries.**
- Also: `tx.update(visitRef)` (not `tx.set(visitRef, ..., {merge:true})`) will throw if the visit doc doesn't exist, though this is less likely in practice.

> **Note**: `BillingPage.handlePayment` catches the error and shows `alert('Failed to record payment. Check console.')` — but doesn't surface `error.code` (only raw `console.error(err)`).

### S4 — CONFIRMED (likely) ✓
**Visits created before invoice syncing existed have no invoice**

- `saveVisit:108`: invoice upsert was added later. Old visits saved before this code existed have `paymentStatus: 'PENDING'` in the visit doc and zero invoices.
- These visits show in `PatientProfilePage` visits tab as PENDING and show no "Record" button in Billing.

### S5 — CONFIRMED ✓
**Two sources of truth that can diverge**

- `visit.paymentStatus` is written by `saveVisit` (from caller-provided data, which `NewVisitPage` never provides).
- `invoice.status` is computed correctly in the UPDATE branch of `upsertInvoiceForVisit`.
- `recordPayment` mirrors invoice → visit inside transaction, but RECEPTIONIST permission fails (S3), so visit stays PENDING.
- **Effect**: Invoice can be PAID while visit shows PENDING, or vice versa.

### S6 — CONFIRMED (multiple issues) ✓
**Other paths found:**

1. **Stale react-query cache**: `BillingPage` doesn't use react-query — uses local `reload()`. `PatientProfilePage` and `VisitDetailPage` use direct service calls without react-query. `useInvoices.ts` has the react-query hook but it's not used by BillingPage or PatientProfilePage. Cache invalidation is a non-issue for these pages but `useRecordPayment` in `useInvoices.ts` only invalidates `['invoices']` not `['visits', patientId]`.

2. **`where('visitId','==',visitId)` in `upsertInvoiceForVisit`**: `invoices.service.ts:33`. This query is correct assuming `visitId` is properly stored. However, if `invoice.visitId` is empty/undefined (e.g. from old data), the query returns 0 results and a duplicate invoice is created.

3. **Duplicate invoices per visit**: If `saveVisit` is called twice rapidly (e.g. double-click), `upsertInvoiceForVisit` runs twice. The `getDocs` query in the first call may not have committed before the second call starts, creating two invoices for the same visit.

4. **`createVisit` uses `getDocs` (not `tx.get`) inside a transaction**: `visits.service.ts:20`. `getDocs` is NOT a transactional read — it doesn't participate in the transaction's conflict detection. This means concurrent `createVisit` calls can generate duplicate visit numbers.

5. **Empty draft visit on every page open**: `NewVisitPage.tsx:51-58`: `createVisit` is called in `useEffect` on mount, creating a draft visit doc immediately — even if the user closes the page without saving. These orphaned drafts accumulate.

6. **`saveVisit` always overwrites `lastVisitDate` and `nextFollowUpDate`**: `visits.service.ts:96-100`: 
   - `lastVisitDate: new Date().toISOString().split('T')[0]` — uses TODAY, not the visit's own `visitDate`.
   - `nextFollowUpDate: data.followUpDate ?? null` — nulls out follow-up date if `followUpDate` is not passed (and `NewVisitPage` passes `followUpDays` not `followUpDate`).
   - Editing an old visit resets the patient's `lastVisitDate` to today.

### S7 — CONFIRMED (partial) ✓
**Role gating issues**

- `AppSidebar.tsx:49`: Billing nav item is visible to ALL signed-in users. ✓ No gating problem for sidebar.
- `App.tsx:58`: `/billing` route has no role guard — accessible to all. ✓
- `PatientProfilePage.tsx:20`: `tab` includes `'billing'` — the billing tab is shown to all users. ✓
- **PROBLEM**: `VisitDetailPage.tsx:210-212`: "Edit visit" button is shown only when `!visit?.isLocked && !isEditing` — and `getVisit` auto-locks visits older than 24h (visits.service.ts:51-58), hiding the edit button for ALL old visits including for ADMIN/DOCTOR.
- **PROBLEM**: `getVisit` is a READ function that WRITES `isLocked: true` to any visit older than 24h (visits.service.ts:51-58) — **a read that writes**, violating the rule.
- **PROBLEM**: RECEPTIONIST has no role-based restriction on any specific action in the UI — the role is purely decorative in the sidebar badge. However in Firestore rules, RECEPTIONIST cannot write visits, so server rejects their payments (S3).
- `user.role` is loaded from Firestore `users/{uid}.role` in `auth.ts:14-16` as part of `UserProfile`. The role is `'ADMIN'`, `'DOCTOR'`, or `'RECEPTIONIST'` (types/index.ts:3). This is correctly propagated to `useAuthStore().user.role`.
- `BillingPage.tsx:52`: `recordedBy: 'system'` — not the logged-in user's ID. Should be `user.id` from `useAuthStore`.

---

## 0.3 Additional Issues Found

### Auto-lock in `getVisit` (visits.service.ts:51-58)
A pure getter writes `isLocked: true` to visits older than 24h. This:
1. Hides "Edit visit" for **all** roles on visits > 24h old.
2. Is a hidden side-effect in a read function.
3. Once a visit is locked, it stays locked even if you try to edit it (VisitDetailPage shows "locked (read-only)" banner).
4. `PatientProfilePage` shows `[Locked]` badge for these visits.

### `VisitDetailPage` data loss on save
- `handleSaveEdits:98-110`: `clinicalNotes` is NOT included in the `saveVisit` call.
- `paymentReference` is NOT included.
- Removed prescription rows are never deleted.
- Diagnoses edits: `DiagnosesCard` is rendered with `disableAutoAppend={true}` but there's no save button for diagnoses in edit mode.
- `saveVisit` calls `patientUpdates.nextFollowUpDate = data.followUpDate ?? null` — `followUpDate` is never in `data` from `VisitDetailPage`, so it's always nulled.

### Encoding issue (PreviousVisitsPanel.tsx, ClinicalNotesCard.tsx, MedicinesPage.tsx)
- These files are NOT valid UTF-8. When read as UTF-8, `₹` becomes `?` and `·` becomes `?`.
- Confirmed via Node.js: `\u{FFFD}` replacement characters appear at lines ~143-144, 181-183 of PreviousVisitsPanel.

### "Dr. Dr. Sankaranarayanan P" double prefix
- `PatientProfilePage.tsx:118`: renders `Dr. {v.doctorName}` 
- If `doctorName` was stored as `"Dr. Sankaranarayanan P"`, this renders `"Dr. Dr. Sankaranarayanan P"`.
- `PreviousVisitsPanel` has the same pattern.

---

## 0.4 Ordered Root Causes

| # | Root Cause | Suspect | Severity |
|---|-----------|---------|---------|
| 1 | `NewVisitPage.handleSave` never passes `paymentStatus` → visit and invoice permanently PENDING | S1 | **CRITICAL** |
| 2 | RECEPTIONIST `recordPayment` fails with `permission-denied` because `tx.update(visitRef)` is inside the same transaction as invoice updates, and visits rules deny RECEPTIONIST write | S3 | **CRITICAL** |
| 3 | `getVisit` auto-locks visits older than 24h (a read that writes), hiding Edit button for all roles | S7/Phase 2 | **HIGH** |
| 4 | Two sources of truth (visit.paymentStatus vs invoice.status) — no reliable mirroring | S5 | **HIGH** |
| 5 | Old visits have no invoice (created before invoice syncing); no "Record" button shown | S4 | **HIGH** |
| 6 | `saveVisit` only upserts invoice when `totalFee > 0` — zero-fee visits never invoiced | S2 | **MEDIUM** |
| 7 | `saveVisit` always writes `lastVisitDate=today` and `nextFollowUpDate=null` on every save | S6 | **MEDIUM** |
| 8 | `VisitDetailPage.handleSaveEdits` silently drops `clinicalNotes`, `paymentReference`, deleted Rx rows | S6 | **MEDIUM** |
| 9 | `createVisit` uses `getDocs` (non-transactional) inside transaction → duplicate visit numbers on double-open | S6 | **MEDIUM** |
| 10 | Empty draft visit created on every `NewVisitPage` mount (even if user navigates away) | S6 | **LOW** |
| 11 | `BillingPage`: `recordedBy:'system'` hardcoded; no `error.code` in error handler | S7 | **LOW** |
| 12 | PreviousVisitsPanel/ClinicalNotesCard/MedicinesPage: WINDOWS-1252 encoding — `₹` and `·` corrupt | S6 | **LOW** |
| 13 | "Dr. Dr." double-prefix in PatientProfilePage and PreviousVisitsPanel | S6 | **LOW** |

---

## 0.5 Files to Fix Per Phase

**Phase 1 (Payments)**:
- `src/lib/services/invoices.service.ts` — `computePaymentStatus`, fix CREATE branch, fix `recordPayment` (split transaction from visit mirror)
- `src/lib/services/visits.service.ts` — `saveVisit`: compute paymentStatus/totalFee itself; fix lastVisitDate/followUpDate logic; upsert invoice condition
- `src/app/pages/NewVisitPage.tsx` — remove inline paymentStatus; let saveVisit own it
- `src/app/pages/VisitDetailPage.tsx` — fix handleSaveEdits to include clinicalNotes, paymentReference, prescription deletes
- `src/app/pages/BillingPage.tsx` — use logged-in user for recordedBy; better error handling
- `firestore.rules` — add RECEPTIONIST visit read + limited-field update rule
- `scripts/diagnose-payments.ts` — new
- `scripts/repair-payments.ts` — new

**Phase 2 (Locking)**:
- `src/lib/services/visits.service.ts` — remove auto-lock from `getVisit`
- `src/app/pages/VisitDetailPage.tsx` — always show Edit button (Admin/Doctor); add Unlock button

**Phase 3 (Quantity)**:
- `src/types/index.ts` — add `quantity?: string` to `PrescriptionItem`
- `src/app/components/visits/PrescriptionCard.tsx` — add Quantity column
- `src/app/pages/NewVisitPage.tsx` + `VisitDetailPage.tsx` — map quantity field
- `src/lib/pdf/prescription.ts` — include quantity in PDF

**Phase 4 (Mobile)**:
- `src/app/components/layout/AppShell.tsx` / `AppSidebar.tsx` — hamburger on mobile
- `src/app/components/visits/PrescriptionCard.tsx` — stacked card on mobile
- `src/app/components/visits/PreviousVisitsPanel.tsx` — fix encoding + mobile layout
- `src/app/components/visits/ClinicalNotesCard.tsx` — fix encoding
- `src/app/pages/MedicinesPage.tsx` — fix encoding
- `src/app/pages/NewVisitPage.tsx` + `VisitDetailPage.tsx` — fee grid mobile

---

## 0.6 Instructions for Running Diagnosis Script

After Phase 0 code is created, run:
```bash
# With service account (server-side, full access):
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json pnpm tsx scripts/diagnose-payments.ts

# Output files: diagnose-output.json and diagnose-output.csv
```

The script will print bucket counts and first-20 examples for buckets A–I, and write CSV/JSON for all records.

An in-app Admin-only diagnosis button will be added to `SettingsPage` for users without a service account.
