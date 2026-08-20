import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getPatient } from '../../lib/services/patients.service';
import type { Patient, PaymentMethod } from '../../types';
import { P } from '../utils/palette';
import { ArrowLeft, AlertTriangle, CheckCircle, Printer, FileText, X } from 'lucide-react';
import { Card, SectionCard, Btn, Inp, Sel, Bdg } from '../components/common/SharedUI';
import { DiagnosesCard } from '../components/visits/DiagnosesCard';
import { PrescriptionCard } from '../components/visits/PrescriptionCard';
import { SignaturePad } from '../components/visits/SignaturePad';
import { FormProvider, useForm } from 'react-hook-form';
import { createVisit, saveVisit, saveSignature } from '../../lib/services/visits.service';
import { addPrescriptionItem, updatePrescriptionItem } from '../../lib/services/prescriptions.service';
import { useAuthStore } from '../../store/auth.store';

export function NewVisitPage({ readOnly = false }: { readOnly?: boolean }) {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [allergyDismissed, setAllergyDismissed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  const methods = useForm({
    defaultValues: {
      diagnoses: [],
      prescriptions: [],
      consultationFee: "500",
      medicineFee: "0",
      discount: "0",
      paidAmount: "0",
      followupDays: "30",
      paymentReference: ""
    }
  });

  useEffect(() => {
    if (patientId) getPatient(patientId).then(setPatient);
  }, [patientId]);

  useEffect(() => {
    if (patientId && user && !visitId && !readOnly) {
      createVisit(patientId, user.id, user.name).then(v => setVisitId(v.id));
    }
  }, [patientId, user, visitId, readOnly]);

  if (!patient || (!visitId && !readOnly)) return <div>Loading...</div>;

  const handleSave = async (isDraft: boolean) => {
    if (!patient || !visitId) return;

    const totalFee = (parseFloat(consultFee || "0") + parseFloat(medicineFee || "0") - parseFloat(discount || "0"));

    await saveVisit(patient.id, visitId, {
      consultationFee: parseFloat(methods.getValues('consultationFee') || "0"),
      medicineFee: parseFloat(methods.getValues('medicineFee') || "0"),
      discount: parseFloat(methods.getValues('discount') || "0"),
      paidAmount: parseFloat(methods.getValues('paidAmount') || "0"),
      paymentMethod: paymentMethod || "CASH",
      paymentReference: methods.getValues('paymentReference') || "",
      followUpDays: parseInt(methods.getValues('followupDays') || "0"),
      isDraft,
      totalFee
    });

    const prescriptions = methods.getValues('prescriptionItems') || [];
    for (const item of prescriptions) {
      if (!item.id) {
         const newP = await addPrescriptionItem(patient.id, visitId, item);
         item.id = newP.id;
      } else {
         await updatePrescriptionItem(patient.id, visitId, item.id, item);
      }
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    if (!isDraft) navigate(`/patients/${patient.id}`);
  };

  const consultFee = methods.watch("consultationFee");
  const medicineFee = methods.watch("medicineFee");
  const discount = methods.watch("discount");
  const paidAmount = methods.watch("paidAmount");

  const total = (parseFloat(consultFee || "0") + parseFloat(medicineFee || "0") - parseFloat(discount || "0"));
  const paid = parseFloat(paidAmount || "0");
  const due = total - paid;
  
  let paymentStatus = "Unpaid";
  let statusVariant: "sienna" | "ochre" | "sage" | "neutral" | "slate" = "sienna";
  if (paid >= total && total > 0) {
    paymentStatus = "Paid";
    statusVariant = "sage";
  } else if (paid > 0 && due > 0) {
    paymentStatus = "Partial";
    statusVariant = "ochre";
  }

  const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'UPI', 'CARD', 'INSURANCE', 'CHEQUE', 'ONLINE', 'OTHER'];
  let refLabel = "Reference Number";
  if (paymentMethod === 'UPI') refLabel = "UPI Reference No.";
  if (paymentMethod === 'CARD') refLabel = "Last 4 digits";
  if (paymentMethod === 'CHEQUE') refLabel = "Cheque Number";
  if (paymentMethod === 'INSURANCE') refLabel = "Claim Number";
  if (paymentMethod === 'ONLINE') refLabel = "Transaction ID";
  if (paymentMethod === 'OTHER') refLabel = "Reference Number";

  return (
    <FormProvider {...methods}>
      <div>
        {readOnly && (
          <div style={{ background: P.slateLight, border: `1px solid ${P.slate}`, padding: "8px 16px", borderRadius: 8, marginBottom: 14, display: "flex", gap: 8, fontSize: 13, color: P.slate }}>
            <AlertTriangle size={16}/> Visit is locked and read-only.
            <div style={{ flex: 1 }}/>
            <Btn variant="primary" size="sm" onClick={() => {}}>Unlock (Admin only)</Btn>
          </div>
        )}
        {patient.allergies?.length > 0 && !allergyDismissed && (
          <div style={{ background: P.siennaLight, border: `1px solid ${P.sienna}`, borderRadius: 8, padding: "8px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: P.sienna }}>
            <AlertTriangle size={15} /><strong>Allergy alert:</strong>&nbsp;{patient.allergies.join(", ")}
            <div style={{ flex: 1 }} />
            <button onClick={() => setAllergyDismissed(true)} style={{ background: "none", border: "none", cursor: "pointer", color: P.sienna, display: "flex" }}><X size={14} /></button>
          </div>
        )}
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: P.bgBase, borderBottom: `1px solid ${P.border}`, padding: "10px 0", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => navigate(`/patients/${patient.id}`)} style={{ background: "none", border: "none", cursor: "pointer", color: P.textMuted, display: "flex" }}><ArrowLeft size={18} /></button>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: P.textPrimary }}>{patient.name}</div>
              <div style={{ fontSize: 11, color: P.textMuted, fontFamily: "JetBrains Mono, monospace" }}>{patient.patientRefId} · Visit #{patient.visitCount + 1}</div>
            </div>
          </div>
          {!readOnly && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: saved ? P.violet : P.textMuted, display: "flex", alignItems: "center", gap: 4 }}>{saved ? <><CheckCircle size={12} />Saved just now</> : "Autosave active"}</span>
              <Btn variant="ghost" size="sm" onClick={() => handleSave(true)}>Save draft</Btn>
              <Btn variant="primary" size="sm" icon={<CheckCircle size={13} />} onClick={() => handleSave(false)}>Save visit</Btn>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 920 }}>
          <DiagnosesCard patientId={patient.id} visitId={visitId!} />
          <PrescriptionCard />
          <SectionCard title="Fee & Payment">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
              <Inp label="Consultation fee" name="consultationFee" readOnly={readOnly} pre={<span style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>₹</span>} value={consultFee} onChange={v => methods.setValue('consultationFee', v)} />
              <Inp label="Medicine fee" name="medicineFee" readOnly={readOnly} pre={<span style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>₹</span>} value={medicineFee} onChange={v => methods.setValue('medicineFee', v)} />
              <Inp label="Discount" name="discount" readOnly={readOnly} pre={<span style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>₹</span>} value={discount} onChange={v => methods.setValue('discount', v)} />
            </div>
            <div style={{ background: P.bgSunken, borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: P.textSecondary }}>Total Amount:</span>
              <span style={{ fontSize: 18, fontWeight: 600, fontFamily: "JetBrains Mono, monospace", color: P.textPrimary }}>₹{total}</span>
              <div style={{ width: 1, height: 24, background: P.border, margin: "0 12px" }} />
              <Bdg variant={statusVariant}>{paymentStatus}</Bdg>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Sel label="Payment Method" value={paymentMethod} onChange={v => setPaymentMethod(v as PaymentMethod)} options={PAYMENT_METHODS.map(m => ({ value: m, label: m }))} />
              <Inp label="Paid Amount" name="paidAmount" readOnly={readOnly} pre={<span style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>₹</span>} value={paidAmount} onChange={v => methods.setValue('paidAmount', v)} />
              {paymentMethod !== 'CASH' && (
                <Inp label={refLabel} name="paymentReference" readOnly={readOnly} value={methods.watch('paymentReference')} onChange={v => methods.setValue('paymentReference', v)} />
              )}
            </div>
          </SectionCard>
          <SectionCard title="Doctor's Signature">
            <SignaturePad onConfirm={async (dataUrl) => {
              if (patient && visitId) {
                await saveSignature(patient.id, visitId, dataUrl);
                alert('Signature saved successfully!');
              }
            }} />
          </SectionCard>
        </div>
      </div>
    </FormProvider>
  );
}
