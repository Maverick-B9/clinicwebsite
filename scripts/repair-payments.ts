/**
 * repair-payments.ts
 *
 * Usage:
 *   pnpm tsx scripts/repair-payments.ts             # Dry run (default, no writes)
 *   pnpm tsx scripts/repair-payments.ts --apply     # Apply writes
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

const credPath = join(process.cwd(), 'serviceAccount.json');
const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));

initializeApp({ credential: cert(serviceAccount) });
const db: Firestore = getFirestore();

function computePaymentStatus(total: number, paid: number): 'PAID' | 'PARTIAL' | 'PENDING' {
  if (paid >= total && total > 0) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  return 'PENDING';
}

async function getNextInvoiceNumber(): Promise<string> {
  const seqRef = db.collection('sequences').doc('invoices');
  const now = new Date();
  const year = now.getFullYear();

  return await db.runTransaction(async (tx) => {
    const snap = await tx.get(seqRef);
    let current = 0;
    if (snap.exists) {
      const data = snap.data();
      if (data?.year === year) {
        current = data.current || 0;
      }
    }
    const next = current + 1;
    tx.set(seqRef, { current: next, year }, { merge: true });
    return `INV-${year}-${String(next).padStart(4, '0')}`;
  });
}

async function main() {
  const isApply = process.argv.includes('--apply');
  console.log(`\n=== REPAIR PAYMENTS SCRIPT ===`);
  console.log(`Mode: ${isApply ? 'APPLY (Writing changes to Firestore)' : 'DRY RUN (No writes performed. Use --apply to execute.)'}\n`);

  // Index invoices by visitId
  const invoicesByVisit = new Map<string, any[]>();
  const allInvoiceSnap = await db.collection('invoices').get();
  for (const idoc of allInvoiceSnap.docs) {
    const d = idoc.data();
    const vid = d.visitId ?? '';
    if (!invoicesByVisit.has(vid)) invoicesByVisit.set(vid, []);
    invoicesByVisit.get(vid)!.push({ id: idoc.id, ref: idoc.ref, ...d });
  }

  // Detect duplicate visitIds
  const duplicateVisitIds = new Set<string>();
  for (const [vid, invs] of invoicesByVisit.entries()) {
    if (vid && invs.length > 1) {
      duplicateVisitIds.add(vid);
      console.warn(`[DUPLICATE REPORT] visitId ${vid} has ${invs.length} invoices: ${invs.map(i => i.id).join(', ')} (Report only - no auto-edit)`);
    }
  }

  const patientsSnap = await db.collection('patients').get();

  let unlockedCount = 0;
  let bucketACount = 0;
  let syncedCount = 0;
  let bucketGCount = 0;
  let totalVisitsProcessed = 0;

  for (const patDoc of patientsSnap.docs) {
    const patData = patDoc.data();
    const patientId = patDoc.id;
    const patientRefId = patData.patientRefId ?? '';

    const visitsSnap = await db
      .collection('patients').doc(patientId)
      .collection('visits')
      .get();

    for (const vDoc of visitsSnap.docs) {
      const v = vDoc.data();
      if (v.isDraft === true || v.deletedAt != null) continue;
      totalVisitsProcessed++;

      const visitId = vDoc.id;
      const visitRef = vDoc.ref;
      const isLocked = v.isLocked === true;

      // Rule 5: Set isLocked: false on every visit
      if (isLocked) {
        unlockedCount++;
        console.log(`[UNLOCK] Patient ${patientRefId} visit #${v.visitNumber} (${visitId}) was locked.`);
        if (isApply) {
          await visitRef.update({ isLocked: false, updatedAt: FieldValue.serverTimestamp() });
        }
      }

      // Skip duplicate visit invoices from money repair (report only)
      if (duplicateVisitIds.has(visitId)) {
        continue;
      }

      const cf = v.consultationFee ?? 0;
      const mf = v.medicineFee ?? 0;
      const dc = v.discount ?? 0;
      const total = Math.max(0, v.totalFee != null ? v.totalFee : cf + mf - dc);
      const visitPaid = v.paidAmount ?? 0;
      const visitPayStatus = v.paymentStatus ?? 'PENDING';

      const invs = invoicesByVisit.get(visitId) ?? [];

      if (invs.length === 0) {
        if (total > 0) {
          // BUCKET A: No invoice, total > 0
          bucketACount++;
          const newStatus = computePaymentStatus(total, visitPaid);
          const amountDue = Math.max(0, total - visitPaid);
          console.log(`[BUCKET A] Creating missing invoice for ${patientRefId} visit #${v.visitNumber} (${visitId}): total=Rs${total}, paid=Rs${visitPaid}, status=${newStatus}`);

          if (isApply) {
            const invoiceNumber = await getNextInvoiceNumber();
            const invDoc = {
              invoiceNumber,
              patientId,
              visitId,
              consultationFee: cf,
              medicineFee: mf,
              discount: dc,
              subtotal: cf + mf,
              gstAmount: 0,
              total,
              amountPaid: visitPaid,
              amountDue,
              status: newStatus,
              createdAt: v.createdAt || FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            };
            await db.collection('invoices').add(invDoc);

            if (visitPayStatus !== newStatus || v.totalFee !== total) {
              await visitRef.update({
                paymentStatus: newStatus,
                totalFee: total,
                paidAmount: visitPaid,
                updatedAt: FieldValue.serverTimestamp(),
              });
            }
          }
        }
      } else if (invs.length === 1) {
        const inv = invs[0];
        // Check payments subcollection
        const paymentsSnap = await db.collection('invoices').doc(inv.id).collection('payments').get();
        let paidSubcol = 0;
        for (const p of paymentsSnap.docs) {
          paidSubcol += (p.data().amount as number) ?? 0;
        }

        const isBucketG = Math.abs(paidSubcol - inv.amountPaid) > 0.01;
        if (isBucketG) {
          bucketGCount++;
          console.warn(`[BUCKET G REPORT] Visit ${patientRefId} #${v.visitNumber} (${visitId}) / Invoice ${inv.id}: payments subcol sum (Rs${paidSubcol}) != invoice.amountPaid (Rs${inv.amountPaid}). (Report only - manual review needed)`);
          continue;
        }

        // BUCKETS B / C / D / E:
        const invoiceStatus = inv.status;
        const mismatch =
          invoiceStatus !== visitPayStatus ||
          ((invoiceStatus === 'PAID' || invoiceStatus === 'PARTIAL') && visitPayStatus === 'PENDING') ||
          (visitPayStatus === 'PAID' && invoiceStatus === 'PENDING') ||
          (visitPaid > 0 && visitPayStatus === 'PENDING');

        if (mismatch) {
          syncedCount++;
          const correctStatus = computePaymentStatus(inv.total, inv.amountPaid);
          const correctDue = Math.max(0, inv.total - inv.amountPaid);
          console.log(`[SYNC B/C/D/E] ${patientRefId} visit #${v.visitNumber} (${visitId}) invoice ${inv.id}: setting status=${correctStatus}, paid=${inv.amountPaid}, total=${inv.total}`);

          if (isApply) {
            await inv.ref.update({
              status: correctStatus,
              amountDue: correctDue,
              updatedAt: FieldValue.serverTimestamp(),
            });
            await visitRef.update({
              paymentStatus: correctStatus,
              paidAmount: inv.amountPaid,
              totalFee: inv.total,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        }
      }
    }
  }

  console.log(`\n================ REPAIR SUMMARY ================`);
  console.log(`Total non-draft visits processed: ${totalVisitsProcessed}`);
  console.log(`Visits to unlock (isLocked -> false): ${unlockedCount}`);
  console.log(`Missing invoices to create (Bucket A): ${bucketACount}`);
  console.log(`Visits/Invoices to synchronize (Buckets B/C/D/E): ${syncedCount}`);
  console.log(`Bucket G items requiring manual review: ${bucketGCount}`);
  console.log(`Duplicates requiring manual review: ${duplicateVisitIds.size}`);
  console.log(`Mode: ${isApply ? 'CHANGES APPLIED' : 'DRY RUN ONLY (pass --apply to execute)'}`);
}

main().catch(err => {
  console.error('[repair-payments] Fatal error:', err);
  process.exit(1);
});
