import React, { useState, useEffect } from 'react';
import { P } from '../utils/palette';
import { Download } from 'lucide-react';
import { Btn, Card } from '../components/common/SharedUI';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { listPatients } from '../../lib/services/patients.service';
import { listInvoices } from '../../lib/services/invoices.service';
import { getClinicalMetrics } from '../../lib/services/reports.service';
import type { Invoice, Patient } from '../../types';

export function ReportsPage() {
  const [period, setPeriod] = useState("This month");

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  const [diseaseData, setDiseaseData] = useState<{name: string, count: number}[]>([]);
  const [items, setItems] = useState<{name: string, count: number}[]>([]);

  useEffect(() => {
    listInvoices({}).then(setInvoices);
    listPatients({ pageSize: 1000 }).then(res => setPatients(res.patients));
    getClinicalMetrics().then(res => {
      setDiseaseData(res.topDiagnoses);
      setItems(res.topMedicines);
    });
  }, []);

  const revenueData = React.useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayTotal = invoices.filter(inv => {
        if (!inv.createdAt) return false;
        const invDate = (inv.createdAt as any).toDate?.() || new Date(inv.createdAt);
        return invDate.getDate() === d.getDate() && invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear();
      }).reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
      data.push({ day: dayStr, amount: dayTotal });
    }
    return data;
  }, [invoices]);

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
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
        <h1 style={{ fontSize:18, fontWeight:500, color:P.textPrimary }}>Reports</h1>
        <div style={{ display:"flex", gap:6 }}>
          {["This month","Quarter","Year","Custom"].map(p => <button key={p} onClick={() => setPeriod(p)} style={{ height:32, padding:"0 12px", borderRadius:8, border:`1.5px solid ${period===p?P.violet:P.border}`, background:period===p?P.violet:"transparent", color:period===p?"#fff":P.textSecondary, fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit", transition:"all 150ms" }}>{p}</button>)}
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
        <Card style={{ padding:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
            <div><div style={{ fontSize:15, fontWeight:500, color:P.textPrimary }}>Patient analytics</div><div style={{ fontSize:12, color:P.textMuted, marginTop:2 }}>New vs. returning — {period}</div></div>
            <div style={{ display:"flex", gap:8 }}><Btn variant="ghost" size="sm" icon={<Download size={13}/>}>Export PDF</Btn><Btn variant="ghost" size="sm" icon={<Download size={13}/>}>Export Excel</Btn></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:24 }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyData} barGap={2} barSize={10}>
                <XAxis dataKey="week" tick={{ fontSize:10, fill:P.textMuted }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:10, fill:P.textMuted }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background:P.bgSurface, border:`1px solid ${P.border}`, borderRadius:8, fontSize:11 }} cursor={{ fill:P.bgSunken }}/>
                <Bar dataKey="new" fill={P.violet} radius={[3,3,0,0]} name="New"/>
                <Bar dataKey="returning" fill={P.slate} radius={[3,3,0,0]} name="Returning"/>
              </BarChart>
            </ResponsiveContainer>
            <div>
              <div style={{ fontSize:12, fontWeight:500, color:P.textSecondary, marginBottom:12 }}>Top diagnoses</div>
              {diseaseData.map((d: any,i: number) => <div key={d.name} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}><div style={{ width:90, fontSize:12, color:P.textSecondary }}>{d.name}</div><div style={{ flex:1, height:7, background:P.bgSunken, borderRadius:4 }}><div style={{ height:"100%", width:`${(d.count/25)*100}%`, background:[P.violet,P.slate,"#7C5C4A",P.gold,P.sienna][i], borderRadius:4 }}/></div><div style={{ fontSize:11, color:P.textMuted, width:22 }}>{d.count}</div></div>)}
            </div>
          </div>
        </Card>
        <Card style={{ padding:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
            <div><div style={{ fontSize:15, fontWeight:500, color:P.textPrimary }}>Revenue</div><div style={{ fontSize:12, color:P.textMuted, marginTop:2 }}>Daily revenue — this week</div></div>
            <div style={{ display:"flex", gap:8 }}><Btn variant="ghost" size="sm" icon={<Download size={13}/>}>Export PDF</Btn><Btn variant="ghost" size="sm" icon={<Download size={13}/>}>Export Excel</Btn></div>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={revenueData}>
              <XAxis dataKey="day" tick={{ fontSize:10, fill:P.textMuted }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fill:P.textMuted }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background:P.bgSurface, border:`1px solid ${P.border}`, borderRadius:8, fontSize:11 }} formatter={(v: number) => [`₹${v}`,"Revenue"]}/>
              <Area type="monotone" dataKey="amount" stroke={P.violet} fill={P.violetLight} strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{ padding:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
            <div><div style={{ fontSize:15, fontWeight:500, color:P.textPrimary }}>Medicine usage</div><div style={{ fontSize:12, color:P.textMuted, marginTop:2 }}>Top medicines by prescription frequency</div></div>
            <Btn variant="ghost" size="sm" icon={<Download size={13}/>}>Export Excel</Btn>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            {items.slice(0,8).map((m,i) => { const maxCount = items[0]?.count || 1; return <div key={m.name} style={{ display:"flex", alignItems:"center", gap:12 }}><div style={{ width:170, fontSize:12, color:P.textSecondary }}>{m.name}</div><div style={{ flex:1, height:7, background:P.bgSunken, borderRadius:4, overflow:"hidden" }}><div style={{ height:"100%", width:`${(m.count/maxCount)*100}%`, background:P.violet, borderRadius:4 }}/></div><div style={{ fontSize:11, fontFamily:"JetBrains Mono, monospace", color:P.textMuted, width:28, textAlign:"right" }}>{m.count}×</div></div>; })}
          </div>
        </Card>
      </div>
    </div>
  );
}
