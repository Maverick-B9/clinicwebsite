import React, { useEffect, useState } from 'react';
import { P } from '../utils/palette';
import { Calendar, Users, AlertCircle, Receipt, ArrowLeft, ArrowRight } from 'lucide-react';
import { Card, StatCard, Btn, Av, Bdg, apptBadge, fmtDate } from '../components/common/SharedUI';
import { useNavigate } from 'react-router';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { listPatients } from '../../lib/services/patients.service';
import { listAppointments } from '../../lib/services/appointments.service';
import { listInvoices } from '../../lib/services/invoices.service';
import type { Patient, Appointment, Invoice } from '../../types';

export function DashboardPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    listPatients({ pageSize: 50 }).then(res => setPatients(res.patients));
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    listAppointments({ from: today, to: tomorrow }).then(setAppointments);
    listInvoices({}).then(setInvoices);
  }, []);

  const followUps = patients.filter(p => true); // In a real app, query visits with followUpDate
  const todayRevenue = invoices
    .filter(i => {
      if (!i.createdAt) return false;
      const d = i.createdAt.toDate ? i.createdAt.toDate() : new Date(i.createdAt);
      const today = new Date();
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    })
    .reduce((sum, i) => sum + (i.amountPaid || 0), 0);
    
  const pendingRevenue = invoices.reduce((sum, i) => sum + (i.amountDue || 0), 0);
  
  const weeklyData = React.useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
      const count = patients.filter(pt => {
        if (!pt.createdAt) return false;
        const ptDate = (pt.createdAt as any).toDate?.() || new Date(pt.createdAt);
        return ptDate.getDate() === d.getDate() && ptDate.getMonth() === d.getMonth() && ptDate.getFullYear() === d.getFullYear();
      }).length;
      data.push({ week: dayStr, new: count, returning: 0 });
    }
    return data;
  }, [patients]);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        <StatCard icon={<Calendar size={18}/>} label="Today's appointments" value={appointments.length} sub={`${appointments.filter(a=>a.status==='PENDING').length} pending confirmation`} subColor={P.gold}/>
        <StatCard icon={<Users size={18}/>} label="Total patients" value={patients.length} sub="Lifetime record"/>
        <StatCard icon={<AlertCircle size={18}/>} label="Follow-ups due" value={followUps.length} sub="Upcoming" subColor={P.sienna}/>
        <StatCard icon={<Receipt size={18}/>} label="Today's revenue" value={`₹${todayRevenue.toLocaleString('en-IN')}`} sub={`₹${pendingRevenue.toLocaleString('en-IN')} pending globally`} subColor={P.gold} highlight/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Card>
            <div style={{ padding:"14px 20px", borderBottom:`1px solid ${P.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:14, fontWeight:500, color:P.textPrimary }}>Today's schedule</span>
              <Btn variant="ghost" size="sm" onClick={() => navigate("/appointments")}>View all</Btn>
            </div>
            <div>
              {appointments.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: P.textMuted }}>No appointments today</div>
              ) : (
                appointments.map(apt => (
                  <div key={apt.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 20px", borderBottom:`1px solid ${P.border}` }}>
                    <div style={{ fontSize:13, fontWeight:500, color:P.textPrimary }}>
                      {apt.scheduledAt ? (apt.scheduledAt as any).toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'N/A'}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:P.textPrimary }}>{apt.patientName}</div>
                      <div style={{ fontSize:11, color:P.textSecondary }}>{apt.reason}</div>
                    </div>
                    <Bdg variant={apt.status === 'CONFIRMED' ? 'green' : 'gold'}>{apt.status}</Bdg>
                  </div>
                ))
              )}
            </div>
          </Card>
          <Card>
            <div style={{ padding:"14px 20px", borderBottom:`1px solid ${P.border}` }}>
              <span style={{ fontSize:14, fontWeight:500, color:P.textPrimary }}>Upcoming follow-ups</span>
            </div>
            <div>
              {followUps.slice(0, 3).map(pt => (
                <div key={pt.id} onClick={() => navigate(`/patients/${pt.id}`)} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 20px", cursor:"pointer", transition:"background 120ms" }} onMouseEnter={e => (e.currentTarget.style.background=P.bgSunken)} onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
                  <Av name={pt.name} size={28}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:P.textPrimary }}>{pt.name}</div>
                  </div>
                  <Bdg variant="gold">Due soon</Bdg>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Card style={{ padding:20 }}>
            <div style={{ fontSize:14, fontWeight:500, color:P.textPrimary, marginBottom:2 }}>Monthly patients</div>
            <div style={{ fontSize:11, color:P.textMuted, marginBottom:14 }}>New vs. returning — last 6 weeks</div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={weeklyData} barGap={2} barSize={7}>
                <XAxis dataKey="week" tick={{ fontSize:9, fill:P.textMuted }} axisLine={false} tickLine={false}/>
                <YAxis hide/>
                <Tooltip contentStyle={{ background:P.bgSurface, border:`1px solid ${P.border}`, borderRadius:8, fontSize:11 }} cursor={{ fill:P.bgSunken }}/>
                <Bar dataKey="new" fill={P.violet} radius={[3,3,0,0]} name="New"/>
                <Bar dataKey="returning" fill={P.slate} radius={[3,3,0,0]} name="Returning"/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  );
}
