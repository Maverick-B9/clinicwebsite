import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getPatient, softDeletePatient } from '../../lib/services/patients.service';
import { listVisits } from '../../lib/services/visits.service';
import { generateQRCardPDF } from '../../lib/pdf/qrcode';
import type { Patient, Visit } from '../../types';
import { P } from '../utils/palette';
import { ArrowLeft, AlertTriangle, Printer, Plus, RefreshCw, Upload, MessageCircle, Trash, FileText } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { Card, Av, Bdg, statusBadge, Btn, fmtDate, StatCard } from '../components/common/SharedUI';

export function PatientProfilePage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [tab, setTab] = useState<"overview"|"visits"|"prescriptions"|"docs"|"billing">("overview");

  useEffect(() => {
    if (patientId) {
      getPatient(patientId).then(setPatient);
      listVisits(patientId).then(setVisits);
    }
  }, [patientId]);

  if (!patient) return <div>Loading...</div>;

  const TABS = ["overview","visits","prescriptions","docs","billing"] as const;
  const activeVisits = visits.filter(v => !v.isDraft);

  return (
    <div>
      <button onClick={() => navigate("/patients")} style={{ background:"none", border:"none", cursor:"pointer", color:P.textMuted, display:"flex", alignItems:"center", gap:4, fontSize:12, marginBottom:14, fontFamily:"inherit" }}><ArrowLeft size={13}/>Back to patients</button>
      {patient.allergies?.length>0&&<div style={{ background:P.siennaLight, border:`1px solid ${P.sienna}`, borderRadius:8, padding:"8px 16px", marginBottom:12, display:"flex", alignItems:"center", gap:8, fontSize:13, color:P.sienna }}><AlertTriangle size={15}/><strong>Allergy alert:</strong>&nbsp;{patient.allergies.join(", ")} — check before prescribing.</div>}
      <Card style={{ marginBottom:0 }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${P.border}` }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <Av name={patient.name} size={56}/>
              <div>
                <h2 style={{ fontSize:20, fontWeight:500, color:P.textPrimary, marginBottom:6 }}>{patient.name}</h2>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span style={{ fontSize:12, color:P.textMuted, fontFamily:"JetBrains Mono, monospace" }}>{patient.patientRefId}</span>
                  <span style={{ color:P.border }}>·</span>
                  <span style={{ fontSize:12, color:P.textSecondary }}>{patient.ageYears}{patient.sex} · {patient.bloodGroup} · {patient.city}</span>
                  <Bdg variant="violet">Active</Bdg>
                  <Bdg variant="slate">Total Visits: {activeVisits.length}</Bdg>
                  {patient.allergies?.length>0&&<Bdg variant="sienna">⚠ Allergy on file</Bdg>}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {user?.role === 'ADMIN' && (
                <Btn variant="subtle" size="sm" icon={<Trash size={13}/>} onClick={async () => {
                  if (confirm("Are you sure you want to delete this patient?")) {
                    await softDeletePatient(patient.id);
                    navigate("/patients");
                  }
                }}>Delete</Btn>
              )}
              <Btn variant="secondary" size="sm" icon={<Printer size={13}/>} onClick={() => generateQRCardPDF(patient, {})}>QR card</Btn>
              <Btn variant="primary" size="sm" icon={<Plus size={13}/>} onClick={() => navigate(`/patients/${patient.id}/visits/new`)}>New visit</Btn>
            </div>
          </div>
        </div>
        <div style={{ display:"flex", borderBottom:`1px solid ${P.border}`, padding:"0 24px" }}>
          {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={{ height:44, padding:"0 16px", background:"none", border:"none", borderBottom:tab===t?`2px solid ${P.violet}`:"2px solid transparent", color:tab===t?P.violet:P.textSecondary, fontSize:13, fontWeight:tab===t?500:400, cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize", transition:"all 150ms" }}>{t==="docs"?"Documents":t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
        </div>
        <div style={{ padding:24 }}>
          {tab==="overview"&&(
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:500, color:P.textSecondary, marginBottom:12, letterSpacing:"0.04em", textTransform:"uppercase" }}>Patient details</div>
                {[["Phone",patient.mobile],["Email",patient.email],["Blood group",patient.bloodGroup],["City",patient.city],["Total visits",String(activeVisits.length)],["Last visit",patient.lastVisitDate ? fmtDate(patient.lastVisitDate) : "—"],["Next follow-up",patient.nextFollowUpDate?fmtDate(patient.nextFollowUpDate):"Not scheduled"]].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", gap:16, padding:"7px 0", borderBottom:`1px solid ${P.border}` }}>
                    <span style={{ fontSize:12, color:P.textMuted, width:130, flexShrink:0 }}>{k}</span>
                    <span style={{ fontSize:12, color:P.textPrimary }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab==="visits"&&(
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeVisits.length === 0 ? <div>No visits yet</div> : (
                activeVisits.map(v => (
                  <div key={v.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", border: `1px solid ${P.border}`, borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, background: P.slateLight, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: P.slate }}><FileText size={18} /></div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: P.textPrimary }}>Visit #{v.visitNumber}</div>
                        <div style={{ fontSize: 12, color: P.textSecondary }}>{fmtDate(v.createdAt)} · Dr. {v.doctorName}</div>
                      </div>
                    </div>
                    <Btn variant="subtle" size="sm" onClick={() => navigate(`/patients/${patient.id}/visits/${v.id}`)}>View details</Btn>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
