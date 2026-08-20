import jsPDF from 'jspdf';
import { Invoice } from '../../types';

export async function generateReceiptPDF(
  invoice: Invoice,
  clinicSettings: Record<string, string>,
): Promise<void> {
  const doc = new jsPDF({ format: 'a5' });

  // Header
  doc.setFontSize(16);
  doc.text(clinicSettings.clinicName ?? 'Asoka Homoeopathic Medical Centre', 14, 15);
  doc.setFontSize(10);
  doc.text(clinicSettings.clinicAddress ?? '', 14, 20);
  doc.text(`Ph: ${clinicSettings.clinicPhone ?? ''}  GST: ${clinicSettings.clinicGST ?? '-'}`, 14, 25);
  doc.line(14, 28, 134, 28);

  // Invoice Info
  doc.setFontSize(14);
  doc.text('PAYMENT RECEIPT', 14, 35);
  
  doc.setFontSize(10);
  doc.text(`Receipt No: ${invoice.invoiceNumber}`, 14, 42);
  const date = invoice.createdAt?.toDate ? invoice.createdAt.toDate().toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  doc.text(`Date: ${date}`, 100, 42);
  doc.line(14, 45, 134, 45);

  // Patient Info
  doc.text(`Patient: ${invoice.patientName}`, 14, 52);
  doc.text(`Ref ID: ${invoice.patientRefId}`, 100, 52);
  doc.line(14, 55, 134, 55);

  // Line Items
  let y = 65;
  doc.setFont(undefined, 'bold');
  doc.text('Description', 14, y);
  doc.text('Amount', 110, y);
  doc.setFont(undefined, 'normal');
  y += 6;
  doc.line(14, y, 134, y);
  y += 6;

  if (invoice.consultationFee > 0) {
    doc.text('Consultation Fee', 14, y);
    doc.text(`Rs. ${invoice.consultationFee.toFixed(2)}`, 110, y);
    y += 8;
  }
  
  if (invoice.medicineFee > 0) {
    doc.text('Medicines / Treatment', 14, y);
    doc.text(`Rs. ${invoice.medicineFee.toFixed(2)}`, 110, y);
    y += 8;
  }

  y += 2;
  doc.line(14, y, 134, y);
  y += 6;

  // Totals
  doc.text('Subtotal:', 80, y);
  doc.text(`Rs. ${invoice.subtotal.toFixed(2)}`, 110, y);
  y += 6;

  if (invoice.discount > 0) {
    doc.text('Discount:', 80, y);
    doc.text(`- Rs. ${invoice.discount.toFixed(2)}`, 110, y);
    y += 6;
  }

  if (invoice.gstAmount > 0) {
    doc.text(`GST (${invoice.gstPercent}%):`, 80, y);
    doc.text(`Rs. ${invoice.gstAmount.toFixed(2)}`, 110, y);
    y += 6;
  }

  doc.setFont(undefined, 'bold');
  doc.text('Total Amount:', 80, y);
  doc.text(`Rs. ${invoice.total.toFixed(2)}`, 110, y);
  y += 8;

  doc.text('Amount Paid:', 80, y);
  doc.text(`Rs. ${invoice.amountPaid.toFixed(2)}`, 110, y);
  y += 6;

  doc.text('Balance Due:', 80, y);
  doc.text(`Rs. ${invoice.amountDue.toFixed(2)}`, 110, y);
  doc.setFont(undefined, 'normal');

  y += 20;
  doc.setFontSize(9);
  doc.text('Thank you for your visit. Wishing you a speedy recovery!', 14, y);
  
  doc.save(`Receipt_${invoice.invoiceNumber}.pdf`);
}
