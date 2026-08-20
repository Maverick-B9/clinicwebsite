import jsPDF from 'jspdf';
import { Patient, Visit } from '../../types';

export async function generateInvoicePDF(
  patient: Patient,
  visit: Visit,
  invoiceData: any
) {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('INVOICE', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('Asoka Homoeopathic Medical Centre', 14, 35);
  doc.setFontSize(10);
  doc.text('No. 12, 3rd Cross, JP Nagar, Bengaluru - 560078', 14, 40);

  doc.text(`Invoice No: INV-${visit.id.substring(0, 6)}`, 140, 35);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 140, 40);

  doc.line(14, 45, 196, 45);

  doc.text(`Bill To:`, 14, 55);
  doc.text(`${patient.name}`, 14, 60);
  doc.text(`Patient ID: ${patient.patientRefId}`, 14, 65);

  let y = 80;
  doc.text('Description', 14, y);
  doc.text('Amount (INR)', 170, y);
  doc.line(14, y + 2, 196, y + 2);

  y += 10;
  doc.text('Consultation Fee', 14, y);
  doc.text(`${invoiceData.consultationFee || 0}`, 170, y);
  
  y += 10;
  doc.text('Medicine Fee', 14, y);
  doc.text(`${invoiceData.medicineFee || 0}`, 170, y);

  y += 10;
  doc.text('Discount', 14, y);
  doc.text(`-${invoiceData.discount || 0}`, 170, y);

  doc.line(14, y + 5, 196, y + 5);
  y += 12;

  const total = (Number(invoiceData.consultationFee || 0) + Number(invoiceData.medicineFee || 0) - Number(invoiceData.discount || 0));
  doc.setFontSize(12);
  doc.text('Total Amount', 14, y);
  doc.text(`${total}`, 170, y);

  doc.save(`Invoice_${patient.patientRefId}_${visit.id}.pdf`);
}
