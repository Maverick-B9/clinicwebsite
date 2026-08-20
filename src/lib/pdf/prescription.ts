import jsPDF from 'jspdf';
import { Patient, Visit, PrescriptionItem, Diagnosis, UserProfile } from '../../types';

export async function generatePrescriptionPDF(
  patient: Patient,
  visit: Visit,
  prescriptions: PrescriptionItem[],
  diagnoses: Diagnosis[],
  doctor: UserProfile,
  clinicSettings: Record<string, string>,
): Promise<void> {
  const doc = new jsPDF({ format: 'a5' }); // A5 is typical for prescriptions

  // Header
  doc.setFontSize(16);
  doc.text(clinicSettings.clinicName ?? 'Asoka Homoeopathic Medical Centre', 14, 15);
  doc.setFontSize(10);
  doc.text(clinicSettings.clinicAddress ?? '', 14, 20);
  doc.text(`Ph: ${clinicSettings.clinicPhone ?? ''}  GST: ${clinicSettings.clinicGST ?? '-'}`, 14, 25);
  doc.line(14, 28, 134, 28);

  // Patient Info
  doc.text(`Patient: ${patient.name}`, 14, 35);
  doc.text(`Age/Sex: ${patient.ageYears}${patient.sex}`, 14, 40);
  doc.text(`Ref ID: ${patient.patientRefId}`, 100, 35);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 100, 40);
  doc.line(14, 43, 134, 43);

  // Diagnosis
  let y = 50;
  const finalDx = diagnoses.filter(d => d.type === 'FINAL').map(d => d.text).join(', ');
  const provDx = diagnoses.filter(d => d.type === 'PROVISIONAL').map(d => d.text).join(', ');
  doc.text(`Diagnosis: ${finalDx || provDx || '-'}`, 14, y);
  
  y += 10;
  
  // Rx Symbol
  doc.setFontSize(14);
  doc.text('Rx', 14, y);
  y += 10;

  // Prescriptions
  doc.setFontSize(10);
  prescriptions.forEach((item, index) => {
    if (y > 190) {
      doc.addPage();
      y = 20;
    }
    const text = `${index + 1}. ${item.medicineName} (${item.potency})`;
    doc.text(text, 14, y);
    doc.text(`Dosage: ${item.dosage} · ${item.repetition} · ${item.durationDays} days`, 20, y + 5);
    doc.text(`Instruction: ${item.beforeAfterFood}`, 20, y + 10);
    y += 18;
  });

  // Footer / Signature
  y = Math.max(y + 20, 180);
  
  if (visit.signatureUrl) {
    try {
      const res = await fetch(visit.signatureUrl);
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      doc.addImage(dataUrl, 'PNG', 100, y - 20, 50, 18);
    } catch {
      // signature failed to load — skip silently, still print name
    }
  }

  doc.text(`Dr. ${doctor.name}`, 100, y);
  if (doctor.qualification) doc.text(doctor.qualification, 100, y + 5);
  if (doctor.regNumber) doc.text(`Reg. ${doctor.regNumber}`, 100, y + 10);

  doc.save(`Prescription_${patient.patientRefId}_${visit.id}.pdf`);
}
