import React, { useState, useEffect } from 'react';
import { P } from '../utils/palette';
import { Plus, X, CheckCircle, Clock, Calendar as CalIcon } from 'lucide-react';
import { Btn, Card, Inp, Sel, Bdg, fmtDate } from '../components/common/SharedUI';
import { listAppointments, createAppointment } from '../../lib/services/appointments.service';
import type { Appointment } from '../../types';

export function AppointmentsPage() {
  const [view, setView] = useState<"day"|"week"|"month">("week");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    patientId: 'walk-in', patientName: '', doctorId: 'doc-1', doctorName: 'Dr. Smith',
    scheduledAt: '', type: 'CONSULTATION', reason: ''
  });

  const fetchAppointments = () => {
    const from = new Date(); from.setDate(from.getDate() - 30);
    const to = new Date(); to.setDate(to.getDate() + 30);
    listAppointments({ from, to }).then(setAppointments);
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleSave = async () => {
    try {
      await createAppointment({
        ...formData,
        scheduledAt: new Date(formData.scheduledAt) as any,
        status: 'CONFIRMED',
        type: formData.type as any,
      } as any);
      setModalOpen(false);
      fetchAppointments();
    } catch (e) {
      alert("Failed to book appointment");
    }
  };
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
        <h1 style={{ fontSize:18, fontWeight:500, color:P.textPrimary }}>Appointments</h1>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {(["day","week","month"] as const).map(v => <button key={v} onClick={() => setView(v)} style={{ height:32, padding:"0 12px", borderRadius:8, border:`1.5px solid ${view===v?P.violet:P.border}`, background:view===v?P.violet:"transparent", color:view===v?"#fff":P.textSecondary, fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize", transition:"all 150ms" }}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>)}
          <Btn variant="primary" size="sm" icon={<Plus size={13}/>} onClick={() => setModalOpen(true)}>Book appointment</Btn>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:14 }}>
        <Card>
          <div style={{ padding: 20 }}>
            {appointments.length === 0 ? (
              <div style={{ textAlign: 'center', color: P.textMuted, padding: 40 }}>No appointments found</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Date & Time', 'Patient', 'Doctor', 'Type', 'Reason', 'Status'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px', fontSize: 11, color: P.textMuted, textTransform: 'uppercase', borderBottom: `1px solid ${P.border}` }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {appointments.map(a => (
                    <tr key={a.id} style={{ borderBottom: `1px solid ${P.border}` }}>
                      <td style={{ padding: '12px 10px', fontSize: 13, color: P.textPrimary }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} color={P.textSecondary}/>{a.scheduledAt ? (a.scheduledAt as any).toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}</div></td>
                      <td style={{ padding: '12px 10px', fontSize: 13, fontWeight: 500, color: P.textPrimary }}>{a.patientName}</td>
                      <td style={{ padding: '12px 10px', fontSize: 13, color: P.textSecondary }}>{a.doctorName}</td>
                      <td style={{ padding: '12px 10px' }}><Bdg variant="slate">{a.type}</Bdg></td>
                      <td style={{ padding: '12px 10px', fontSize: 12, color: P.textSecondary }}>{a.notes}</td>
                      <td style={{ padding: '12px 10px' }}><Bdg variant={a.status==='CONFIRMED'?'green':a.status==='CANCELLED'?'sienna':'gold'}>{a.status}</Bdg></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {modalOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background:"rgba(28,26,23,0.48)", cursor:"pointer" }} onClick={() => setModalOpen(false)}/>
          <div style={{ position: "relative", width:480, background:P.bgSurface, borderRadius: 12, display:"flex", flexDirection:"column", boxShadow:"0 8px 32px rgba(28,26,23,0.14)" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${P.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:15, fontWeight:500, color:P.textPrimary }}>Book Appointment</span>
              <button onClick={() => setModalOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:P.textMuted, display:"flex" }}><X size={18}/></button>
            </div>
            <div style={{ padding:20, display:"flex", flexDirection:"column", gap:16 }}>
              <Inp label="Patient Name" value={formData.patientName} onChange={v => setFormData(prev => ({...prev, patientName: v}))} placeholder="John Doe" />
              <Inp label="Date & Time" type="datetime-local" value={formData.scheduledAt} onChange={v => setFormData(prev => ({...prev, scheduledAt: v}))} />
              <Sel label="Type" value={formData.type} onChange={v => setFormData(prev => ({...prev, type: v}))} options={[{value:'CONSULTATION',label:'Consultation'},{value:'FOLLOW_UP',label:'Follow Up'}]} />
              <Inp label="Reason" value={formData.reason} onChange={v => setFormData(prev => ({...prev, reason: v}))} placeholder="Brief reason for visit" />
            </div>
            <div style={{ padding: "16px 20px", borderTop: `1px solid ${P.border}`, display: "flex", justifyContent: "flex-end", gap: 10, background: P.bgSunken, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
              <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={handleSave} icon={<CheckCircle size={14}/>}>Confirm Booking</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
