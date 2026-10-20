/**
 * diagnose-payments.ts  (READ-ONLY — never writes)
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json pnpm tsx scripts/diagnose-payments.ts
 *
 * Outputs:
 *   diagnose-output.json   — full data per visit
 *   diagnose-output.csv    — spreadsheet-friendly
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { createWriteStream, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ── Bootstrap ──────────────────────────────────────────────────────────────
const credPath = join(process.cwd(), 'serviceAccount.json');
const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));

initializeApp({ credential: cert(serviceAccount) });
const db: Firestore = getFirestore();

// ── Types ─────────────────────────────────────────────────────────────────
type Bucket = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'I';

interface DiagRow {
  patientId:    string;
  patientRefId: string;
  visitId:      string;
  visitNumber:  number;
  visitDate:    string;
  visitStatus:  string;
  invoiceStatus: string;
  invoiceId:    string;
  total:        number;
  paid:         number;
  paidSubcol:   number;
  invoiceCount: number;
  isLocked:     boolean;
  bucket:       Bucket;
  notes:        string;
}

const EXAMPLE_LIMIT = 20;

// ── Helpers ────────────────────────────────────────────────────────────────
function tsToMs(ts: any): number {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts._seconds != null) return ts._seconds * 1000;
  return 0;
}

function escCsv(v: any): string {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function run() {
  console.log('[diagnose-payments] Loading all invoices...');

  // Index invoices by visitId
  const invoicesByVisit = new Map<string, any[]>();
  const allInvoiceSnap = await db.collection('invoices').get();
  for (const idoc of allInvoiceSnap.docs) {
    const d = idoc.data();
    const vid = d.visitId ?? '';
    if (!invoicesByVisit.has(vid)) invoicesByVisit.set(vid, []);
    invoicesByVisit.get(vid)!.push({ id: idoc.id, ...d });
  }
  console.log(`[diagnose-payments] Loaded ${allInvoiceSnap.size} invoices across ${invoicesByVisit.size} visitIds.`);

  // Detect invoices with duplicate visitId
  const duplicateVisitIds: string[] = [];
  for (const [vid, invs] of invoicesByVisit.entries()) {
    if (vid && invs.length > 1) duplicateVisitIds.push(vid);
  }
  if (duplicateVisitIds.length > 0) {
    console.warn(`\n[WARN] ${duplicateVisitIds.length} visitId(s) have >1 invoice (duplicates):`);
    for (const vid of duplicateVisitIds.slice(0, 20)) {
      const invs = invoicesByVisit.get(vid)!;
      console.warn(`   visitId=${vid} -> ${invs.map((i: any) => i.id).join(', ')}`);
    }
  }

  // Walk all patients and their visits
  console.log('\n[diagnose-payments] Walking patients/*/visits/*...');
  const patientsSnap = await db.collection('patients').get();

  const rows: DiagRow[] = [];
  const buckets: Record<string, DiagRow[]> = { A:[], B:[], C:[], D:[], E:[], F:[], G:[], I:[] };
  let draftCount = 0;
  const now = Date.now();

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
      if (v.isDraft === true) { draftCount++; continue; }
      if (v.deletedAt != null) continue;

      const visitId = vDoc.id;
      const visitNumber = v.visitNumber ?? 0;
      const visitDate = v.visitDate ?? '';
      const visitPayStatus: string = v.paymentStatus ?? 'PENDING';
      const visitPaid: number = v.paidAmount ?? 0;
      const isLocked: boolean = v.isLocked === true;

      // Compute expected total
      const cf: number = v.consultationFee ?? 0;
      const mf: number = v.medicineFee ?? 0;
      const dc: number = v.discount ?? 0;
      const total = Math.max(0, v.totalFee != null ? v.totalFee : cf + mf - dc);

      // Invoice(s) for this visit
      const invs: any[] = invoicesByVisit.get(visitId) ?? [];
      const invoiceCount = invs.length;
      const inv: any = invs[0] ?? null; // use first if multiple
      const invoiceId = inv?.id ?? '';
      const invoiceStatus: string = inv?.status ?? '';
      const invoicePaid: number = inv?.amountPaid ?? 0;

      // Payments subcollection sum
      let paidSubcol = 0;
      if (inv) {
        const paymentsSnap = await db
          .collection('invoices').doc(inv.id)
          .collection('payments')
          .get();
        for (const pd of paymentsSnap.docs) {
          paidSubcol += (pd.data().amount as number) ?? 0;
        }
      }

      // Classify
      let bucket: Bucket = 'I';
      const notes: string[] = [];

      if (total === 0 || (v.totalFee == null && cf === 0 && mf === 0)) {
        bucket = 'F';
        notes.push('total=0 or missing fees');
      } else if (invoiceCount === 0) {
        bucket = 'A';
        notes.push('no invoice, total>0');
      } else {
        // G: subcollection mismatch
        if (Math.abs(paidSubcol - invoicePaid) > 0.01) {
          bucket = 'G';
          notes.push(`payments subcol sum=${paidSubcol} != invoice.amountPaid=${invoicePaid}`);
        }

        // Status mismatches (can co-exist with G, report all)
        if (invoiceStatus !== visitPayStatus) {
          notes.push(`visit.paymentStatus=${visitPayStatus} != invoice.status=${invoiceStatus}`);
          if (bucket === 'I') bucket = 'B';
        }

        // C: invoice paid/partial but visit pending
        if ((invoiceStatus === 'PAID' || invoiceStatus === 'PARTIAL') && visitPayStatus === 'PENDING') {
          notes.push('invoice paid/partial but visit PENDING');
          if (bucket === 'I' || bucket === 'B') bucket = 'C';
        }

        // D: visit paid but invoice pending
        if (visitPayStatus === 'PAID' && invoiceStatus === 'PENDING') {
          notes.push('visit PAID but invoice PENDING');
          if (bucket === 'I' || bucket === 'B') bucket = 'D';
        }

        // E: paidAmount>0 but status PENDING
        if (visitPaid > 0 && (visitPayStatus === 'PENDING' || !v.paymentStatus)) {
          notes.push(`visit.paidAmount=${visitPaid} but paymentStatus=${visitPayStatus}`);
          if (bucket === 'I' || bucket === 'B') bucket = 'E';
        }
      }

      // Annotate locked visits regardless of bucket
      if (isLocked) {
        const createdMs = tsToMs(v.createdAt);
        const ageh = createdMs ? (now - createdMs) / 3_600_000 : Infinity;
        if (ageh < 24) {
          notes.push(`isLocked=true but visit is <24h old!`);
        }
      }

      const row: DiagRow = {
        patientId, patientRefId, visitId, visitNumber, visitDate,
        visitStatus: visitPayStatus, invoiceStatus, invoiceId,
        total, paid: invoicePaid, paidSubcol, invoiceCount,
        isLocked, bucket,
        notes: notes.join(' | '),
      };

      rows.push(row);
      if (!buckets[bucket]) buckets[bucket] = [];
      buckets[bucket].push(row);
    }
  }

  // ── Locked visit summary ──────────────────────────────────────────────────
  const lockedRows = rows.filter(r => r.isLocked);

  // ── Report ────────────────────────────────────────────────────────────────
  console.log('\n============ BUCKET SUMMARY ============');
  const bucketDesc: Record<string, string> = {
    A: 'No invoice, total > 0 (never invoiced)',
    B: 'Invoice exists but invoice.status != visit.paymentStatus',
    C: 'Invoice PAID/PARTIAL but visit PENDING (sync lost)',
    D: 'Visit PAID but invoice PENDING (reverse drift)',
    E: 'visit.paidAmount > 0 but paymentStatus missing/PENDING',
    F: 'total == 0 or missing fees',
    G: 'payments subcollection sum != invoice.amountPaid',
    I: 'Consistent (no issue)',
  };

  for (const [bkt, desc] of Object.entries(bucketDesc)) {
    const arr = buckets[bkt] ?? [];
    console.log(`\n  ${bkt}  ${desc}`);
    console.log(`     Count: ${arr.length}`);
    if (arr.length > 0) {
      const examples = arr.slice(0, EXAMPLE_LIMIT);
      for (const r of examples) {
        console.log(`     - ${r.patientRefId}/${r.visitId}  visit#${r.visitNumber}  total=Rs${r.total}  paid=Rs${r.paid}  visitStatus=${r.visitStatus}  invoiceStatus=${r.invoiceStatus || '-'}  ${r.notes}`);
      }
      if (arr.length > EXAMPLE_LIMIT) console.log(`     ... and ${arr.length - EXAMPLE_LIMIT} more`);
    }
  }

  console.log(`\n  H  isLocked == true  (informational, not a separate bucket)`);
  console.log(`     Count: ${lockedRows.length}`);
  for (const r of lockedRows.slice(0, EXAMPLE_LIMIT)) {
    console.log(`     - ${r.patientRefId}/${r.visitId}  visit#${r.visitNumber}  bucket=${r.bucket}`);
  }

  console.log(`\n  Draft visits skipped: ${draftCount}`);
  console.log(`  Duplicate visitIds: ${duplicateVisitIds.length}`);
  console.log(`\n  Total non-draft visits analysed: ${rows.length}`);

  // ── Write JSON ─────────────────────────────────────────────────────────────
  const jsonPath = join(process.cwd(), 'diagnose-output.json');
  const jsonData = {
    generatedAt: new Date().toISOString(),
    summary: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])),
    lockedCount: lockedRows.length,
    draftCount,
    duplicateVisitIds,
    rows,
  };
  writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
  console.log(`\nWrote ${jsonPath}`);

  // ── Write CSV ─────────────────────────────────────────────────────────────
  const csvPath = join(process.cwd(), 'diagnose-output.csv');
  const headers = [
    'bucket','patientId','patientRefId','visitId','visitNumber','visitDate',
    'visitStatus','invoiceStatus','invoiceId','total','paid','paidSubcol',
    'invoiceCount','isLocked','notes',
  ];
  const csvStream = createWriteStream(csvPath, { encoding: 'utf8' });
  csvStream.write('\uFEFF'); // BOM for Excel
  csvStream.write(headers.join(',') + '\n');
  for (const r of rows) {
    const line = [
      r.bucket, r.patientId, r.patientRefId, r.visitId, r.visitNumber, r.visitDate,
      r.visitStatus, r.invoiceStatus, r.invoiceId, r.total, r.paid, r.paidSubcol,
      r.invoiceCount, r.isLocked, r.notes,
    ].map(escCsv).join(',');
    csvStream.write(line + '\n');
  }
  await new Promise<void>(res => csvStream.end(res));
  console.log(`Wrote ${csvPath}`);
}

run().catch(err => {
  console.error('[diagnose-payments] FATAL:', err);
  process.exit(1);
});
