import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getPatient } from '../../lib/services/patients.service';
import { getVisit } from '../../lib/services/visits.service';
import { listDiagnoses } from '../../lib/services/diagnoses.service';
import { listPrescriptionItems } from '../../lib/services/prescriptions.service';
import type { Patient, Visit, PaymentMethod } from '../../types';
import { P } from '../utils/palette';
import { ArrowLeft, AlertTriangle, Lock } from 'lucide-react';
import { SectionCard, Btn, Inp, Sel, Bdg } from '../components/common/SharedUI';
import { DiagnosesCard } from '../components/visits/DiagnosesCard';
import { PrescriptionCard } from '../components/visits/PrescriptionCard';
import { ClinicalNotesCard } from '../components/visits/ClinicalNotesCard';
import { FormProvider, useForm } from 'react-hook-form';

export function VisitDetailPage() {
  const { patientId, visitId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const methods = useForm({
    defaultValues: {
      diagnoses: [] as any[],
      prescriptionItems: [] as any[],
      consultationFee: '500',
      medicineFee: '0',
      discount: '0',
      paidAmount: '0',
      followupDays: '30',
      paymentReference: '',
      visitNotes: '',
      clinicalNotes: '',
      visitDate: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (patientId) getPatient(patientId).then(setPatient);
  }, [patientId]);

  useEffect(() => {
    if (!patientId || !visitId) return;
    Promise.all([
      getVisit(patientId, visitId),
      listDiagnoses(patientId, visitId),
      listPrescriptionItems(patientId, visitId),
    ]).then(([v, dx, rx]) => {
      setVisit(v);
      methods.reset({
        diagnoses: dx.map(d => ({ id: d.id, type: d.type, text: d.text })),
        prescriptionItems: rx.map(p => ({
          id: p.id,
          medicine: p.medicineName,
          potency: p.potency ?? '',
          dosage: p.dosage ?? '',
          repetition: p.repetition ?? '',
          durationDays: p.durationDays ?? 5,
          beforeAfterFood: p.beforeAfterFood ?? 'AFTER',
          notes: p.instructions ?? '',
        })),
        consultationFee: String(v.consultationFee ?? 500),
        medicineFee: String(v.medicineFee ?? 0),
        discount: String(v.discount ?? 0),
        paidAmount: String(v.paidAmount ?? 0),
        followupDays: String(v.followUpDays ?? 30),
        paymentReference: v.paymentReference ?? '',
        visitNotes: v.visitNotes ?? '',
        clinicalNotes: v.clinicalNotes ?? '',
        visitDate: v.visitDate ?? new Date().toISOString().split('T')[0],
      });
      setDataLoaded(true);
    });
  }, [patientId, visitId]);

  if (!patient || !visit || !dataLoaded) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: P.textMuted, fontSize: 13 }}>
        Loading visit...
      </div>
    );
  }

  const visitDate = methods.watch('visitDate');
  const consultFee = methods.watch('consultationFee');
  const medicineFee = methods.watch('medicineFee');
  const discount = methods.watch('discount');
  const paidAmount = methods.watch('paidAmount');

  const total = parseFloat(consultFee || '0') + parseFloat(medicineFee || '0') - parseFloat(discount || '0');
  const paid = parseFloat(paidAmount || '0');
  const due = total - paid;

  let paymentStatus = 'Unpaid';
  let statusVariant: 'sienna' | 'ochre' | 'sage' | 'neutral' | 'slate' = 'sienna';
  if (paid >= total && total > 0) { paymentStatus = 'Paid'; statusVariant = 'sage'; }
  else if (paid > 0 && due > 0) { paymentStatus = 'Partial'; statusVariant = 'ochre'; }

  const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'UPI', 'CARD', 'INSURANCE', 'CHEQUE', 'ONLINE', 'OTHER'];

  return (
    <FormProvider {...methods}>
      <div>
        {visit.isLocked && (
          <div style={{ background: P.bgSunken, border: `1px solid ${P.border}`, padding: '8px 16px', borderRadius: 8, marginBottom: 14, display: 'flex', gap: 8, fontSize: 13, color: P.textSecondary, alignItems: 'center' }}>
            <Lock size={14} /> This visit is locked (read-only).
          </div>
        )}
        {patient.allergies?.length > 0 && (
          <div style={{ background: P.siennaLight, border: `1px solid ${P.sienna}`, borderRadius: 8, padding: '8px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: P.sienna }}>
            <AlertTriangle size={15} /><strong>Allergy alert:</strong>&nbsp;{patient.allergies.join(', ')}
          </div>
        )}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: P.bgBase, borderBottom: `1px solid ${P.border}`, padding: '10px 0', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate(`/patients/${patient.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.textMuted, display: 'flex' }}><ArrowLeft size={18} /></button>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: P.textPrimary }}>{patient.name}</div>
              <div style={{ fontSize: 11, color: P.textMuted, fontFamily: 'JetBrains Mono, monospace' }}>
                {patient.patientRefId} · Visit #{visit.visitNumber}
                {visit.isLocked && <span style={{ marginLeft: 6 }}>[Locked]</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16 }}>
              <span style={{ fontSize: 12, color: P.textMuted }}>Visit date:</span>
              <span style={{ fontSize: 12, color: P.textPrimary, fontFamily: 'JetBrains Mono, monospace' }}>{visitDate}</span>
            </div>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => navigate(`/patients/${patient.id}`)}>Back to profile</Btn>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 920 }}>
          <DiagnosesCard patientId={patient.id} visitId={visitId!} disableAutoAppend={true} />
          <ClinicalNotesCard
            patientId={patient.id}
            visitId={visitId!}
            visitNumber={visit.visitNumber}
            visitDate={visitDate || new Date().toISOString().split('T')[0]}
            readOnly={true}
          />
          <PrescriptionCard readOnly={true} />
          <SectionCard title="Fee & Payment">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <Inp label="Consultation fee" readOnly pre={<span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>₹</span>} value={consultFee} onChange={() => {}} />
              <Inp label="Medicine fee" readOnly pre={<span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>₹</span>} value={medicineFee} onChange={() => {}} />
              <Inp label="Discount" readOnly pre={<span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>₹</span>} value={discount} onChange={() => {}} />
            </div>
            <div style={{ background: P.bgSunken, borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: P.textSecondary }}>Total Amount:</span>
              <span style={{ fontSize: 18, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: P.textPrimary }}>₹{total}</span>
              <div style={{ width: 1, height: 24, background: P.border, margin: '0 12px' }} />
              <Bdg variant={statusVariant}>{paymentStatus}</Bdg>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <Sel label="Payment Method" value={visit.paymentMethod || 'CASH'} onChange={() => {}} options={PAYMENT_METHODS.map(m => ({ value: m, label: m }))} />
              <Inp label="Paid Amount" readOnly pre={<span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>₹</span>} value={paidAmount} onChange={() => {}} />
            </div>
            {methods.watch('visitNotes') && (
              <Inp label="Visit Notes" readOnly value={methods.watch('visitNotes')} onChange={() => {}} />
            )}
          </SectionCard>
        </div>
      </div>
    </FormProvider>
  );
}
