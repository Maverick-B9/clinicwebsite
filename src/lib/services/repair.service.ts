import { collection, doc, getDocs, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { computePaymentStatus, generateInvoiceNumber } from './invoices.service';
import type { Invoice, Visit, Patient } from '../../types';

export interface RepairSummary {
  totalVisits: number;
  unlockedCount: number;
  bucketACreated: number;
  syncedBCDE: number;
  bucketGReportOnly: number;
  duplicatesReportOnly: number;
  details: string[];
}

export async function repairPaymentRecords(
  onProgress?: (msg: string) => void
): Promise<RepairSummary> {
  const summary: RepairSummary = {
    totalVisits: 0,
    unlockedCount: 0,
    bucketACreated: 0,
    syncedBCDE: 0,
    bucketGReportOnly: 0,
    duplicatesReportOnly: 0,
    details: [],
  };

  onProgress?.('Fetching all invoices...');
  const invoicesSnap = await getDocs(collection(db, 'invoices'));
  const invoicesByVisit = new Map<string, Array<{ id: string; ref: any } & Invoice>>();

  for (const idoc of invoicesSnap.docs) {
    const d = idoc.data() as Invoice;
    const vid = d.visitId ?? '';
    if (!invoicesByVisit.has(vid)) invoicesByVisit.set(vid, []);
    invoicesByVisit.get(vid)!.push({ id: idoc.id, ref: idoc.ref, ...d });
  }

  // Detect duplicates
  const duplicateVisitIds = new Set<string>();
  for (const [vid, invs] of invoicesByVisit.entries()) {
    if (vid && invs.length > 1) {
      duplicateVisitIds.add(vid);
      summary.duplicatesReportOnly++;
      summary.details.push(`Duplicate: visit ${vid} has ${invs.length} invoices (Report only)`);
    }
  }

  onProgress?.('Fetching patients and visits...');
  const patientsSnap = await getDocs(collection(db, 'patients'));

  for (const patDoc of patientsSnap.docs) {
    const patData = patDoc.data() as Patient;
    const patientId = patDoc.id;
    const patientRefId = patData.patientRefId ?? '';

    const visitsSnap = await getDocs(collection(db, 'patients', patientId, 'visits'));

    for (const vDoc of visitsSnap.docs) {
      const v = vDoc.data() as Visit;
      if (v.isDraft === true || v.deletedAt != null) continue;
      summary.totalVisits++;

      const visitId = vDoc.id;
      const visitRef = vDoc.ref;

      // Unlock if locked
      if (v.isLocked === true) {
        summary.unlockedCount++;
        await updateDoc(visitRef, { isLocked: false, updatedAt: serverTimestamp() });
        summary.details.push(`Unlocked: Patient ${patientRefId} visit #${v.visitNumber}`);
      }

      if (duplicateVisitIds.has(visitId)) continue;

      const cf = v.consultationFee ?? 0;
      const mf = v.medicineFee ?? 0;
      const dc = v.discount ?? 0;
      const total = Math.max(0, v.totalFee != null ? v.totalFee : cf + mf - dc);
      const visitPaid = v.paidAmount ?? 0;
      const visitPayStatus = v.paymentStatus ?? 'PENDING';

      const invs = invoicesByVisit.get(visitId) ?? [];

      if (invs.length === 0) {
        if (total > 0) {
          // Bucket A: Missing invoice
          summary.bucketACreated++;
          const newStatus = computePaymentStatus(total, visitPaid);
          const amountDue = Math.max(0, total - visitPaid);
          const invoiceNumber = await generateInvoiceNumber();

          const invDoc: Omit<Invoice, 'id'> = {
            invoiceNumber,
            patientId,
            patientName: patData.name || '',
            patientRefId,
            visitId,
            consultationFee: cf,
            medicineFee: mf,
            discount: dc,
            subtotal: cf + mf,
            gstPercent: 0,
            gstAmount: 0,
            total,
            amountPaid: visitPaid,
            amountDue,
            status: newStatus,
            createdAt: v.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          await addDoc(collection(db, 'invoices'), invDoc);

          if (visitPayStatus !== newStatus || v.totalFee !== total) {
            await updateDoc(visitRef, {
              paymentStatus: newStatus,
              totalFee: total,
              paidAmount: visitPaid,
              updatedAt: serverTimestamp(),
            });
          }
          summary.details.push(`Created Invoice: Patient ${patientRefId} visit #${v.visitNumber} (${invoiceNumber})`);
        }
      } else if (invs.length === 1) {
        const inv = invs[0];
        const paymentsSnap = await getDocs(collection(db, 'invoices', inv.id, 'payments'));
        let paidSubcol = 0;
        for (const pd of paymentsSnap.docs) {
          paidSubcol += (pd.data()?.amount as number) ?? 0;
        }

        const isBucketG = Math.abs(paidSubcol - inv.amountPaid) > 0.01;
        if (isBucketG) {
          summary.bucketGReportOnly++;
          summary.details.push(`Bucket G: Patient ${patientRefId} visit #${v.visitNumber} payments subcol (₹${paidSubcol}) != invoice.amountPaid (₹${inv.amountPaid}) (Report only)`);
          continue;
        }

        // B / C / D / E sync
        const invoiceStatus = inv.status;
        const mismatch =
          invoiceStatus !== visitPayStatus ||
          ((invoiceStatus === 'PAID' || invoiceStatus === 'PARTIAL') && visitPayStatus === 'PENDING') ||
          (visitPayStatus === 'PAID' && invoiceStatus === 'PENDING') ||
          (visitPaid > 0 && visitPayStatus === 'PENDING');

        if (mismatch) {
          summary.syncedBCDE++;
          const correctStatus = computePaymentStatus(inv.total, inv.amountPaid);
          const correctDue = Math.max(0, inv.total - inv.amountPaid);

          await updateDoc(inv.ref, {
            status: correctStatus,
            amountDue: correctDue,
            updatedAt: serverTimestamp(),
          });

          await updateDoc(visitRef, {
            paymentStatus: correctStatus,
            paidAmount: inv.amountPaid,
            totalFee: inv.total,
            updatedAt: serverTimestamp(),
          });

          summary.details.push(`Synced: Patient ${patientRefId} visit #${v.visitNumber} status -> ${correctStatus}`);
        }
      }
    }
  }

  return summary;
}
