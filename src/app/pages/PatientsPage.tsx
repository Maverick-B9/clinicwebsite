import React, { useState, useEffect } from 'react';
import { P } from '../utils/palette';
import { Plus, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { Btn, Card, Bdg, Av, statusBadge, fmtDate } from '../components/common/SharedUI';
import { useNavigate } from 'react-router';
import { listPatients } from '../../lib/services/patients.service';
import type { Patient } from '../../types';

export function PatientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [hoveredRow, setHoveredRow] = useState<string|null>(null);
  const [sortCol, setSortCol] = useState("patientRefId");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    listPatients({}).then(res => setPatients(res.patients));
  }, []);

  const rows = patients
    .filter(p => (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.patientRefId.includes(search)))
    .sort((a,b) => { 
      const d = sortDir === "asc" ? 1 : -1; 
      if(sortCol === "name") return a.name.localeCompare(b.name) * d; 
      if(sortCol === "patientRefId") return a.patientRefId.localeCompare(b.patientRefId) * d; 
      if(sortCol === "lastVisit") {
        const da = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0;
        const db = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0;
        return (da - db) * d;
      }
      if(sortCol === "visits") return (a.visitCount - b.visitCount) * d;
      return 0; 
    });

  const FILTERS = [{ key:"all", label:"All" },{ key:"active", label:"Active" },{ key:"follow-up", label:"Follow-up due" },{ key:"overdue", label:"Overdue" }];

  const SH = ({ col, label }: { col:string; label:string }) => (
    <th onClick={() => { setSortCol(col); setSortDir(sortCol===col&&sortDir==="asc"?"desc":"asc"); }} style={{ padding:"9px 16px", textAlign:"left", fontSize:10, fontWeight:500, color:P.textMuted, letterSpacing:"0.06em", textTransform:"uppercase", borderBottom:`1px solid ${P.border}`, cursor:"pointer", userSelect:"none", whiteSpace:"nowrap" }}>
      <span style={{ display:"inline-flex", alignItems:"center", gap:3 }}>{label}{sortCol===col&&(sortDir==="asc"?<ArrowUp size={10}/>:<ArrowDown size={10}/>)}</span>
    </th>
  );

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <h1 style={{ fontSize:18, fontWeight:500, color:P.textPrimary }}>Patients</h1>
          <Bdg variant="neutral">{patients.length} total</Bdg>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="secondary" size="sm" icon={<Plus size={13}/>} onClick={() => navigate("/patients/new")}>New patient</Btn>
          <Btn variant="primary" size="sm" icon={<Plus size={13}/>} onClick={() => navigate("/patients?newVisit=true")}>New visit</Btn>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        {FILTERS.map(f => <button key={f.key} onClick={() => setFilter(f.key)} style={{ height:30, padding:"0 12px", borderRadius:999, border:`1.5px solid ${filter===f.key?P.violet:P.border}`, background:filter===f.key?P.violet:"transparent", color:filter===f.key?"#fff":P.textSecondary, fontSize:12, fontWeight:500, cursor:"pointer", transition:"all 150ms", fontFamily:"inherit" }}>{f.label}</button>)}
        <div style={{ flex:1 }}/>
        <div style={{ position:"relative" }}>
          <Search size={13} style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:P.textMuted, pointerEvents:"none" }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients..." style={{ height:32, padding:"0 10px 0 30px", background:P.bgSunken, border:`1.5px solid ${P.border}`, borderRadius:8, fontSize:12, fontFamily:"inherit", outline:"none", color:P.textPrimary, width:220 }}/>
        </div>
      </div>
      <Card>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={{ width:44, padding:"9px 16px", borderBottom:`1px solid ${P.border}` }}/>
                <SH col="name" label="Patient"/>
                <SH col="patientRefId" label="ID"/>
                <th style={{ padding:"9px 16px", fontSize:10, fontWeight:500, color:P.textMuted, letterSpacing:"0.06em", textTransform:"uppercase", borderBottom:`1px solid ${P.border}`, textAlign:"left" }}>Sex</th>
                <SH col="lastVisit" label="Last visit"/>
                <th style={{ padding:"9px 16px", fontSize:10, fontWeight:500, color:P.textMuted, letterSpacing:"0.06em", textTransform:"uppercase", borderBottom:`1px solid ${P.border}`, textAlign:"left" }}>Follow-up</th>
                <th style={{ padding:"9px 16px", fontSize:10, fontWeight:500, color:P.textMuted, letterSpacing:"0.06em", textTransform:"uppercase", borderBottom:`1px solid ${P.border}`, textAlign:"left" }}>Status</th>
                <SH col="visits" label="Visits"/>
                <th style={{ padding:"9px 16px", borderBottom:`1px solid ${P.border}`, width:96 }}/>
              </tr>
            </thead>
            <tbody>
              {rows.map(pt => {
                const hovered = hoveredRow===pt.id;
                return (
                  <tr key={pt.id} onClick={() => navigate(`/patients/${pt.id}`)} onMouseEnter={() => setHoveredRow(pt.id)} onMouseLeave={() => setHoveredRow(null)} style={{ background:hovered?P.bgSunken:"transparent", cursor:"pointer", transition:"background 120ms" }}>
                    <td style={{ padding:"9px 16px" }}><Av name={pt.name} size={32}/></td>
                    <td style={{ padding:"9px 16px" }}><div style={{ fontSize:13, fontWeight:500, color:P.textPrimary }}>{pt.name}</div><div style={{ fontSize:11, color:P.textMuted }}>{pt.mobile}</div></td>
                    <td style={{ padding:"9px 16px", fontSize:11, fontFamily:"JetBrains Mono, monospace", color:P.textMuted }}>{pt.patientRefId}</td>
                    <td style={{ padding:"9px 16px", fontSize:12, color:P.textSecondary }}>{pt.sex}</td>
                    <td style={{ padding:"9px 16px", fontSize:12, color:P.textSecondary }}>{pt.lastVisitDate ? fmtDate(pt.lastVisitDate) : "—"}</td>
                    <td style={{ padding:"9px 16px", fontSize:12, color:P.textSecondary }}>{pt.nextFollowUpDate?fmtDate(pt.nextFollowUpDate):<span style={{ color:P.textMuted }}>—</span>}</td>
                    <td style={{ padding:"9px 16px" }}><Bdg variant="violet">Active</Bdg></td>
                    <td style={{ padding:"9px 16px", fontSize:12, color:P.textMuted, textAlign:"center" }}>{pt.visitCount}</td>
                    <td style={{ padding:"9px 16px" }}>{hovered&&<Btn variant="ghost" size="sm" onClick={e => { e?.stopPropagation(); navigate(`/patients/${pt.id}/visits/new`); }}>New visit</Btn>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
