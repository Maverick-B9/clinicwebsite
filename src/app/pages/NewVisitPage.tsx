import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getPatient } from '../../lib/services/patients.service';
import type { Patient, PaymentMethod } from '../../types';
import { P } from '../utils/palette';
import { ArrowLeft, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { SectionCard, Btn, Inp, Sel, Bdg } from '../components/common/SharedUI';
import { DiagnosesCard } from '../components/visits/DiagnosesCard';
import { PrescriptionCard } from '../components/visits/PrescriptionCard';
import { ClinicalNotesCard } from '../components/visits/ClinicalNotesCard';
import { PreviousVisitsPanel } from '../components/visits/PreviousVisitsPanel';
import { SignaturePad } from '../components/visits/SignaturePad';
import { FormProvider, useForm } from 'react-hook-form';
import { createVisit, saveVisit, saveSignature } from '../../lib/services/visits.service';
import { addPrescriptionItem, updatePrescriptionItem } from '../../lib/services/prescriptions.service';
import { useAuthStore } from '../../store/auth.store';
import { useIsMobile } from '../components/ui/use-mobile';
import { toast } from 'sonner';

export function NewVisitPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [patient, setPatient] = useState<Patient | null>(null);
  // visitId is null until first save — visit doc is NOT pre-created on mount
  const [visitId, setVisitId] = useState<string | null>(null);
  const [visitNumber, setVisitNumber] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [allergyDismissed, setAllergyDismissed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const creatingVisit = useRef(false);
  const isMobile = useIsMobile();

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

  /**
   * Ensures a visit doc exists. Creates it on first call only.
   * Returns the visitId (existing or newly created).
   */
  const ensureVisitCreated = async (): Promise<string> => {
    if (visitId) return visitId;
    if (creatingVisit.current) {
      // Wait for in-flight creation
      await new Promise(res => setTimeout(res, 500));
      if (visitId) return visitId!;
    }
    creatingVisit.current = true;
    const v = await createVisit(patientId!, user!.id, user!.name);
    setVisitId(v.id);
    setVisitNumber(v.visitNumber);
    creatingVisit.current = false;
    return v.id;
  };

  if (!patient) {
    return <div style={{ padding: 40, textAlign: 'center', color: P.textMuted }}>Loading...</div>;
  }

  const handleSave = async (isDraft: boolean) => {
    if (!patient) return;
    if (saving) return;
    setSaving(true);
    try {
      const vid = await ensureVisitCreated();

      const cf = methods.getValues('consultationFee');
      const mf = methods.getValues('medicineFee');
      const dc = methods.getValues('discount');
      // Note: saveVisit will recompute totalFee and paymentStatus authoritatively.
      // We pass the raw values; the service owns the computation.
      await saveVisit(patient.id, vid, {
        consultationFee: parseFloat(cf || '0'),
        medicineFee: parseFloat(mf || '0'),
        discount: parseFloat(dc || '0'),
        paidAmount: parseFloat(methods.getValues('paidAmount') || '0'),
        paymentMethod: paymentMethod || 'CASH',
        paymentReference: methods.getValues('paymentReference') || '',
        followUpDays: parseInt(methods.getValues('followupDays') || '0'),
        visitNotes: methods.getValues('visitNotes') || '',
        clinicalNotes: methods.getValues('clinicalNotes') || '',
        visitDate: methods.getValues('visitDate') || new Date().toISOString().split('T')[0],
        isDraft,
        // Do NOT pass paymentStatus — saveVisit computes it
      });

      const prescriptions: any[] = methods.getValues('prescriptionItems') || [];
      for (let i = 0; i < prescriptions.length; i++) {
        const item = prescriptions[i];
        if (!item.medicine && !item.medicineName) continue; // skip blank rows
        const mapped: any = {
          medicineName: item.medicine || item.medicineName || '',
          potency: item.potency ?? '',
          quantity: item.quantity ?? '',
          dosage: item.dosage ?? '',
          repetition: item.repetition ?? '',
          durationDays: Number(item.durationDays) || 5,
          beforeAfterFood: item.beforeAfterFood ?? 'AFTER',
          instructions: item.notes ?? '',
          sortOrder: i,
        };
        const fsId = item.__firestoreId as string | undefined;
        if (!fsId) {
          const newP = await addPrescriptionItem(patient.id, vid, mapped);
          methods.setValue(`prescriptionItems.${i}.__firestoreId`, newP.id);
        } else {
          await updatePrescriptionItem(patient.id, vid, fsId, mapped);
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (!isDraft) navigate(`/patients/${patient.id}`);
    } catch (err: any) {
      const code = err?.code ?? 'unknown';
      console.error('[NewVisitPage] save failed:', code, err);
      toast.error(`Save failed (${code}): ${err?.message ?? 'Check console.'}`);
    } finally {
      setSaving(false);
    }
  };

  const consultFee = methods.watch('consultationFee');
  const medicineFee = methods.watch('medicineFee');
  const discount = methods.watch('discount');
  const paidAmount = methods.watch('paidAmount');
  const visitDate = methods.watch('visitDate');

  const total = parseFloat(consultFee || '0') + parseFloat(medicineFee || '0') - parseFloat(discount || '0');
  const paid = parseFloat(paidAmount || '0');
  const due = total - paid;

  let paymentStatus = 'Unpaid';
  let statusVariant: 'sienna' | 'ochre' | 'sage' | 'neutral' | 'slate' = 'sienna';
  if (paid >= total && total > 0) { paymentStatus = 'Paid'; statusVariant = 'sage'; }
  else if (paid > 0 && due > 0) { paymentStatus = 'Partial'; statusVariant = 'ochre'; }

  const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'UPI', 'CARD', 'INSURANCE', 'CHEQUE', 'ONLINE', 'OTHER'];
  let refLabel = 'Reference Number';
  if (paymentMethod === 'UPI') refLabel = 'UPI Reference No.';
  if (paymentMethod === 'CARD') refLabel = 'Last 4 digits';
  if (paymentMethod === 'CHEQUE') refLabel = 'Cheque Number';
  if (paymentMethod === 'INSURANCE') refLabel = 'Claim Number';
  if (paymentMethod === 'ONLINE') refLabel = 'Transaction ID';

  return (
    <FormProvider {...methods}>
      <div>
        {patient.allergies?.length > 0 && !allergyDismissed && (
          <div style={{ background: P.siennaLight, border: `1px solid ${P.sienna}`, borderRadius: 8, padding: '8px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: P.sienna }}>
            <AlertTriangle size={15} /><strong>Allergy alert:</strong>&nbsp;{patient.allergies.join(', ')}
            <div style={{ flex: 1 }} />
            <button onClick={() => setAllergyDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.sienna, display: 'flex' }}><X size={14} /></button>
          </div>
        )}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: P.bgBase, borderBottom: `1px solid ${P.border}`, padding: '10px 0', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate(`/patients/${patient.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.textMuted, display: 'flex' }}><ArrowLeft size={18} /></button>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: P.textPrimary }}>{patient.name}</div>
              <div style={{ fontSize: 11, color: P.textMuted, fontFamily: 'JetBrains Mono, monospace' }}>{patient.patientRefId} · Visit #{visitNumber || '?'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16 }}>
              <span style={{ fontSize: 12, color: P.textMuted }}>Visit date:</span>
              <input
                type="date"
                {...methods.register('visitDate')}
                style={{ height: 28, padding: '0 8px', background: P.bgSunken, border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 12, color: P.textPrimary, fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: saved ? P.sage : P.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
              {saved ? <><CheckCircle size={12} />Saved just now</> : saving ? 'Saving…' : 'Not saved yet'}
            </span>
            <Btn variant="ghost" size="sm" onClick={() => handleSave(true)} disabled={saving}>Save draft</Btn>
            <Btn variant="primary" size="sm" icon={<CheckCircle size={13} />} onClick={() => handleSave(false)} disabled={saving}>Save visit</Btn>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 920 }}>
          {visitId && <DiagnosesCard patientId={patient.id} visitId={visitId} />}
          <PreviousVisitsPanel patientId={patient.id} currentVisitId={visitId || undefined} />
          {visitId && (
            <ClinicalNotesCard
              patientId={patient.id}
              visitId={visitId}
              visitNumber={visitNumber}
              visitDate={visitDate || new Date().toISOString().split('T')[0]}
            />
          )}
          <PrescriptionCard />
          <SectionCard title="Fee &amp; Payment">
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <Inp label="Consultation fee" name="consultationFee" pre={<span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>₹</span>} value={consultFee} onChange={v => methods.setValue('consultationFee', v)} />
              <Inp label="Medicine fee" name="medicineFee" pre={<span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>₹</span>} value={medicineFee} onChange={v => methods.setValue('medicineFee', v)} />
              <Inp label="Discount" name="discount" pre={<span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>₹</span>} value={discount} onChange={v => methods.setValue('discount', v)} />
            </div>
            <div style={{ background: P.bgSunken, borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: P.textSecondary }}>Total Amount:</span>
              <span style={{ fontSize: 18, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: P.textPrimary }}>₹{total}</span>
              <div style={{ width: 1, height: 24, background: P.border, margin: '0 12px' }} />
              <Bdg variant={statusVariant}>{paymentStatus}</Bdg>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <Sel label="Payment Method" value={paymentMethod} onChange={v => setPaymentMethod(v as PaymentMethod)} options={PAYMENT_METHODS.map(m => ({ value: m, label: m }))} />
              <Inp label="Paid Amount" name="paidAmount" pre={<span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>₹</span>} value={paidAmount} onChange={v => methods.setValue('paidAmount', v)} />
              {paymentMethod !== 'CASH' && (
                <Inp label={refLabel} name="paymentReference" value={methods.watch('paymentReference')} onChange={v => methods.setValue('paymentReference', v)} />
              )}
            </div>
            <Inp label="Visit Notes" name="visitNotes" value={methods.watch('visitNotes')} onChange={v => methods.setValue('visitNotes', v)} placeholder="Any notes about this visit..." />
          </SectionCard>
          <SectionCard title="Doctor's Signature">
            <SignaturePad onConfirm={async (dataUrl) => {
              if (patient && visitId) {
                await saveSignature(patient.id, visitId, dataUrl);
                toast.success('Signature saved successfully!');
              } else {
                toast.error('Save the visit first before adding a signature.');
              }
            }} />
          </SectionCard>
        </div>
      </div>
    </FormProvider>
  );
}
