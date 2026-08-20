import React, { useState } from 'react';
import { P } from '../../utils/palette';
import { ChevronDown, ChevronUp } from 'lucide-react';

const avatarBg = (name: string) => {
  const c = [P.violet, P.gold, P.slate, "#7C5C4A", P.sienna];
  return c[name.charCodeAt(0) % c.length];
};
const initials = (name: string) => name.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase();

export function Av({ name, size = 32 }: { name: string; size?: number }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", background:avatarBg(name), color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.34, fontWeight:600, flexShrink:0, letterSpacing:"0.02em", fontFamily:"Inter, sans-serif" }}>{initials(name)}</div>;
}

interface BtnProps { variant?: "primary"|"secondary"|"ghost"|"danger"|"subtle"; size?: "sm"|"md"|"lg"; onClick?: (e?: React.MouseEvent) => void; disabled?: boolean; icon?: React.ReactNode; children?: React.ReactNode; fullWidth?: boolean; type?: "button"|"submit"; }
export function Btn({ variant="primary", size="md", onClick, disabled, icon, children, fullWidth, type="button" }: BtnProps) {
  const h = { sm:28, md:36, lg:44 }[size];
  const px = { sm:10, md:14, lg:18 }[size];
  const fs = { sm:12, md:13, lg:14 }[size];
  const vs: Record<string, React.CSSProperties> = {
    primary:{ background:P.violet, color:"#fff", border:"none" },
    secondary:{ background:"transparent", color:P.violet, border:`1.5px solid ${P.violet}` },
    ghost:{ background:"transparent", color:P.violet, border:"none" },
    danger:{ background:P.sienna, color:"#fff", border:"none" },
    subtle:{ background:"transparent", color:P.textSecondary, border:"none" },
  };
  return <button type={type} onClick={onClick} disabled={disabled} style={{ height:h, padding:`0 ${px}px`, borderRadius:8, fontSize:fs, fontWeight:500, display:"inline-flex", alignItems:"center", gap:6, cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.4:1, transition:"all 150ms ease-out", fontFamily:"inherit", whiteSpace:"nowrap", width:fullWidth?"100%":undefined, justifyContent:fullWidth?"center":undefined, ...vs[variant] }}>{icon && <span style={{ display:"flex" }}>{icon}</span>}{children}</button>;
}

export function Inp({ label, value, onChange, placeholder, type="text", pre, app, disabled, readOnly, mono, defaultValue, name }: { label?: string; value?: string|number; onChange?: (v: string) => void; placeholder?: string; type?: string; pre?: React.ReactNode; app?: React.ReactNode; disabled?: boolean; readOnly?: boolean; mono?: boolean; defaultValue?: string|number; name?: string; }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      {label && <label style={{ fontSize:11, fontWeight:500, color:P.textSecondary, letterSpacing:"0.04em" }}>{label}</label>}
      <div style={{ height:36, display:"flex", alignItems:"center", background:P.bgSunken, border:`1.5px solid ${focused?P.violet:P.border}`, borderRadius:8, overflow:"hidden", transition:"border-color 150ms", boxShadow:focused?"0 1px 3px rgba(28,26,23,0.08)":"none" }}>
        {pre && <div style={{ padding:"0 8px", color:P.textMuted, display:"flex", alignItems:"center", flexShrink:0 }}>{pre}</div>}
        <input name={name} type={type} value={value} defaultValue={defaultValue} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} disabled={disabled} readOnly={readOnly} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ flex:1, height:"100%", background:"transparent", border:"none", outline:"none", fontSize:13, color:disabled||readOnly?P.textMuted:P.textPrimary, fontFamily:mono?"JetBrains Mono, monospace":"inherit", padding:pre?"0 8px 0 0":"0 10px", cursor:readOnly?"default":undefined }} />
        {app && <div style={{ padding:"0 8px", color:P.textMuted, display:"flex", alignItems:"center", flexShrink:0 }}>{app}</div>}
      </div>
    </div>
  );
}

export function Sel({ label, value, onChange, options, placeholder, name, defaultValue }: { label?: string; value?: string; onChange?: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; name?: string; defaultValue?: string; }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      {label && <label style={{ fontSize:11, fontWeight:500, color:P.textSecondary, letterSpacing:"0.04em" }}>{label}</label>}
      <div style={{ height:36, display:"flex", alignItems:"center", background:P.bgSunken, border:`1.5px solid ${focused?P.violet:P.border}`, borderRadius:8, overflow:"hidden", transition:"border-color 150ms", boxShadow:focused?"0 1px 3px rgba(28,26,23,0.08)":"none" }}>
        <select name={name} value={value} defaultValue={defaultValue} onChange={e => onChange?.(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ flex:1, height:"100%", background:"transparent", border:"none", outline:"none", fontSize:13, color:P.textPrimary, fontFamily:"inherit", padding:"0 10px", cursor:"pointer", appearance:"none" }}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={14} style={{ color:P.textMuted, marginRight:8, flexShrink:0, pointerEvents:"none" }} />
      </div>
    </div>
  );
}

export function Card({ children, style, onClick, onMouseEnter, onMouseLeave }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void; onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void; onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void; }) {
  return <div onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ background:P.bgSurface, border:`1px solid ${P.border}`, borderRadius:12, ...style }}>{children}</div>;
}

export function StatCard({ icon, label, value, sub, subColor, highlight }: { icon: React.ReactNode; label: string; value: string|number; sub?: string; subColor?: string; highlight?: boolean; }) {
  return (
    <Card style={{ padding:20, background:highlight?P.violetLight:P.bgSurface }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <div style={{ color:highlight?P.violet:P.textMuted }}>{icon}</div>
        <span style={{ fontSize:10, fontWeight:500, color:P.textSecondary, letterSpacing:"0.06em", textTransform:"uppercase" }}>{label}</span>
      </div>
      <div style={{ fontSize:26, fontWeight:500, color:highlight?P.violetDark:P.textPrimary, lineHeight:1, marginBottom:6, fontFamily:"JetBrains Mono, monospace" }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:subColor||P.textMuted }}>{sub}</div>}
    </Card>
  );
}

export function VitalBox({ label, value, unit, alert }: { label: string; value: string; unit?: string; alert?: "ok"|"warn"|"danger"; }) {
  const bg = alert==="ok"?P.violetLight:alert==="warn"?P.goldLight:alert==="danger"?P.siennaLight:P.bgSunken;
  const vc = alert==="ok"?P.violetDark:alert==="warn"?P.gold:alert==="danger"?P.sienna:P.textPrimary;
  return (
    <div style={{ background:bg, border:`1px solid ${P.border}`, borderRadius:8, padding:"10px 14px" }}>
      <div style={{ fontSize:10, fontWeight:500, color:P.textSecondary, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
      <div style={{ display:"flex", alignItems:"baseline", gap:3 }}>
        <span style={{ fontSize:18, fontWeight:500, color:vc, fontFamily:"JetBrains Mono, monospace" }}>{value}</span>
        {unit && <span style={{ fontSize:10, color:P.textMuted }}>{unit}</span>}
      </div>
    </div>
  );
}

export function SectionCard({ title, children, action, badge, defaultOpen=true }: { title: string; children: React.ReactNode; action?: React.ReactNode; badge?: React.ReactNode; defaultOpen?: boolean; }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", cursor:"pointer", borderBottom:open?`1px solid ${P.border}`:"none" }} onClick={() => setOpen(!open)}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:14, fontWeight:500, color:P.textPrimary }}>{title}</span>
          {badge}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
          {open ? <ChevronUp size={15} color={P.textMuted} /> : <ChevronDown size={15} color={P.textMuted} />}
        </div>
      </div>
      {open && <div style={{ padding:20 }}>{children}</div>}
    </Card>
  );
}

export type BadgeVariant = "sage"|"ochre"|"sienna"|"slate"|"neutral";
export function Bdg({ children, variant="neutral", size="sm" }: { children: React.ReactNode; variant?: BadgeVariant; size?: "sm"|"xs" }) {
  const vs: Record<BadgeVariant, React.CSSProperties> = {
    sage: { background:P.violetLight, color:P.violet, border:`1px solid ${P.violet}` },
    ochre: { background:P.goldLight, color:P.gold, border:`1px solid ${P.gold}` },
    sienna: { background:P.siennaLight, color:P.sienna, border:`1px solid ${P.sienna}` },
    slate: { background:P.slateLight, color:P.slate, border:`1px solid ${P.slate}` },
    neutral: { background:P.bgSunken, color:P.textSecondary, border:`1px solid ${P.borderStrong}` },
  };
  const pad = size==="sm" ? "4px 8px" : "2px 6px";
  const fs = size==="sm" ? 11 : 10;
  return <div style={{ display:"inline-flex", alignItems:"center", gap:4, borderRadius:999, fontWeight:500, fontSize:fs, padding:pad, ...vs[variant] }}>{children}</div>;
}

export function statusBadge(st: string): { variant: BadgeVariant; label: string } {
  if (st==="active") return { variant:"sage", label:"Active" };
  if (st==="follow-up") return { variant:"ochre", label:"Follow-up due" };
  if (st==="overdue") return { variant:"sienna", label:"Overdue" };
  return { variant:"neutral", label:st };
}

export function apptBadge(st: string): { variant: BadgeVariant; label: string } {
  if (st==="booked") return { variant:"slate", label:"Booked" };
  if (st==="waiting") return { variant:"ochre", label:"Waiting" };
  if (st==="in-progress") return { variant:"sage", label:"In progress" };
  if (st==="completed") return { variant:"neutral", label:"Completed" };
  if (st==="no-show") return { variant:"sienna", label:"No show" };
  return { variant:"neutral", label:st };
}

export function fmtDate(dStr: any) {
  if (!dStr) return "";
  let d: Date;
  if (typeof dStr === 'object' && 'seconds' in dStr) {
    d = new Date(dStr.seconds * 1000);
  } else {
    d = new Date(dStr);
  }
  if (isNaN(d.getTime())) return typeof dStr === 'string' ? dStr : "";
  return d.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
}
