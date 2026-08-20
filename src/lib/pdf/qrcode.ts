import jsPDF from 'jspdf';
import { Patient } from '../../types';

export async function generateQRCardPDF(
  patient: Patient,
  clinicSettings: Record<string, string>,
): Promise<void> {
  // CR80 Credit Card size in mm: 85.6 x 53.98
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85.6, 53.98]
  });

  // Background / Border
  doc.setDrawColor(200, 200, 200);
  doc.rect(1, 1, 83.6, 51.98);

  // Clinic Header
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  const clinicName = clinicSettings.clinicName ?? 'Asoka Homoeopathic Medical Centre';
  doc.text(clinicName, 42.8, 8, { align: 'center' });
  doc.line(4, 11, 81.6, 11);

  // Patient Info
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(patient.name, 6, 18);
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text(`ID: ${patient.patientRefId}`, 6, 24);
  doc.text(`Age/Sex: ${patient.ageYears}${patient.sex}`, 6, 29);
  doc.text(`Phone: ${patient.mobile}`, 6, 34);

  if (patient.bloodGroup && patient.bloodGroup !== 'Unknown') {
    doc.text(`Blood Group: ${patient.bloodGroup}`, 6, 39);
  }

  // Generate QR Code Image URL using a public API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(patient.patientRefId)}`;
  
  try {
    // Fetch image to use it in jsPDF
    const res = await fetch(qrUrl);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    
    // Add QR Code Image to PDF (right side)
    // x: 54, y: 16, width: 26, height: 26
    doc.addImage(dataUrl, 'PNG', 54, 16, 26, 26);
  } catch (error) {
    console.error("Failed to load QR code image:", error);
    doc.text("QR Load Failed", 54, 28);
  }

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("Please bring this card for all your visits.", 42.8, 48, { align: 'center' });

  doc.save(`QR_Card_${patient.patientRefId}.pdf`);
}
