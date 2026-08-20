import React, { useState } from 'react';
import { P } from '../utils/palette';
import { Search, Plus, Edit2, CheckCircle, X } from 'lucide-react';
import { Btn, Card, Bdg, Inp, Sel } from '../components/common/SharedUI';
import { searchMedicines } from '../../lib/services/medicines.service';

export function MedicinesPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const cats = ["All","Plant","Mineral","Animal","Nosode","Biochemic"];
  const items: any[] = [];
  const rows = items.filter(m => (catFilter==="All"||m.cat===catFilter)&&(!search||m.name.toLowerCase().includes(search.toLowerCase())));
  const catBadge: Record<string, "sage"|"slate"|"neutral"|"ochre"|"sienna"> = { Plant:"sage", Nosode:"slate", Mineral:"neutral", Animal:"ochre", Biochemic:"neutral" };
  
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
        <h1 style={{ fontSize:18, fontWeight:500, color:P.textPrimary }}>Medicine master</h1>
        <Btn variant="primary" size="sm" icon={<Plus size={13}/>} onClick={() => setDrawerOpen(true)}>Add medicine</Btn>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:14, alignItems:"center", flexWrap:"wrap" }}>
        {cats.map(c => <button key={c} onClick={() => setCatFilter(c)} style={{ height:30, padding:"0 12px", borderRadius:999, border:`1.5px solid ${catFilter===c?P.violet:P.border}`, background:catFilter===c?P.violet:"transparent", color:catFilter===c?"#fff":P.textSecondary, fontSize:12, fontWeight:500, cursor:"pointer", transition:"all 150ms", fontFamily:"inherit" }}>{c}</button>)}
        <div style={{ flex:1 }}/>
        <div style={{ position:"relative" }}>
          <Search size={13} style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:P.textMuted, pointerEvents:"none" }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search medicines..." style={{ height:32, padding:"0 10px 0 30px", background:P.bgSunken, border:`1.5px solid ${P.border}`, borderRadius:8, fontSize:12, fontFamily:"inherit", outline:"none", color:P.textPrimary, width:200 }}/>
        </div>
      </div>
      <Card>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr>{["Medicine name","Manufacturer","Available potencies","Category","Active",""].map(h => <th key={h} style={{ padding:"9px 16px", textAlign:"left", fontSize:10, fontWeight:500, color:P.textMuted, letterSpacing:"0.06em", textTransform:"uppercase", borderBottom:`1px solid ${P.border}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((m,i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${P.border}` }}>
                <td style={{ padding:"10px 16px", fontSize:13, fontWeight:500, color:P.textPrimary }}>{m.name}</td>
                <td style={{ padding:"10px 16px", fontSize:12, color:P.textSecondary }}>{m.mfr}</td>
                <td style={{ padding:"10px 16px" }}><div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>{m.potencies.map(p => <span key={p} style={{ fontFamily:"JetBrains Mono, monospace", fontSize:10, background:P.bgSunken, color:P.textSecondary, padding:"1px 6px", borderRadius:4, border:`1px solid ${P.border}` }}>{p}</span>)}</div></td>
                <td style={{ padding:"10px 16px" }}><Bdg variant={catBadge[m.cat]||"neutral"}>{m.cat}</Bdg></td>
                <td style={{ padding:"10px 16px" }}><div style={{ width:36, height:20, borderRadius:999, background:m.active?P.violet:P.border, position:"relative", cursor:"pointer", transition:"background 150ms" }}><div style={{ position:"absolute", top:2, left:m.active?18:2, width:16, height:16, borderRadius:"50%", background:"#fff", transition:"left 150ms" }}/></div></td>
                <td style={{ padding:"10px 16px" }}><Btn variant="ghost" size="sm" icon={<Edit2 size={12}/>} onClick={() => setDrawerOpen(true)}>Edit</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {drawerOpen&&(
        <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex" }}>
          <div style={{ flex:1, background:"rgba(28,26,23,0.48)", cursor:"pointer" }} onClick={() => setDrawerOpen(false)}/>
          <div style={{ width:400, background:P.bgSurface, display:"flex", flexDirection:"column", boxShadow:"0 8px 32px rgba(28,26,23,0.14)" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${P.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:15, fontWeight:500, color:P.textPrimary }}>Add medicine</span>
              <button onClick={() => setDrawerOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:P.textMuted, display:"flex" }}><X size={18}/></button>
            </div>
            <div style={{ padding:20, flex:1, display:"flex", flexDirection:"column", gap:14, overflowY:"auto" }}>
              <Inp label="Medicine name" placeholder="e.g. Nux Vomica"/>
              <Inp label="Manufacturer" placeholder="e.g. SBL, Schwabe, Boiron"/>
              <Sel label="Category" options={["Plant","Mineral","Animal","Nosode","Biochemic","Other"].map(c => ({ value:c, label:c }))}/>
              <div>
                <div style={{ fontSize:11, fontWeight:500, color:P.textSecondary, marginBottom:4, letterSpacing:"0.04em" }}>Available potencies</div>
                <input placeholder="Type potency and press Enter (e.g. 30C, 200C, 1M)..." style={{ width:"100%", height:36, padding:"0 10px", background:P.bgSunken, border:`1.5px solid ${P.border}`, borderRadius:8, fontSize:13, fontFamily:"inherit", outline:"none", color:P.textPrimary }}/>
              </div>
              <Inp label="Notes" placeholder="Optional notes..."/>
              <Btn variant="primary" fullWidth icon={<CheckCircle size={14}/>} onClick={() => setDrawerOpen(false)}>Save medicine</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
