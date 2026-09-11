import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuthStore } from '../../../store/auth.store';
import { Home, Users, Plus, Stethoscope, Calendar, Receipt, BarChart2, Pill, Settings, LogOut } from 'lucide-react';
import { Logo } from '../common/Logo';

const P = {
  violet: "var(--primary)", violetLight: "var(--accent)", violetDark: "var(--accent-foreground)",
  gold: "var(--chart-3)", goldLight: "var(--muted)",
  sage: "#4E7058", sageLight: "#E6EFE8", sageDark: "#2F4A37",
  ochre: "var(--chart-3)", ochreLight: "#F7F0E2",
  sienna: "var(--destructive)", siennaLight: "#FBEAE7",
  slate: "var(--chart-2)", slateLight: "var(--chart-2)",
  bgBase: "var(--background)", bgSurface: "var(--card)", bgSunken: "var(--secondary)",
  border: "var(--border)", borderStrong: "var(--switch-background)",
  textPrimary: "var(--foreground)", textSecondary: "var(--muted-foreground)", textMuted: "var(--muted-foreground)",
};

function initials(name: string) { return name.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase(); }
function avatarBg(name: string) {
  const cols = [P.violet, P.slate, "#7C5C4A", "#6B5B8C", "#4A6B7C"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return cols[Math.abs(h) % cols.length];
}

function Av({ name, size = 32 }: { name: string; size?: number }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", background:avatarBg(name), color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.34, fontWeight:600, flexShrink:0, letterSpacing:"0.02em", fontFamily:"Inter, sans-serif" }}>{initials(name)}</div>;
}

function Bdg({ variant = "neutral", size = "sm", children }: { variant?: "sage" | "ochre" | "sienna" | "slate" | "neutral" | "violet"; size?: "xs" | "sm"; children: React.ReactNode }) {
  const map: Record<string, [string, string]> = {
    violet:[P.violetLight, P.violetDark], gold:[P.goldLight, P.gold],
    sienna:[P.siennaLight, P.sienna], slate:[P.slateLight, P.slate],
    neutral:[P.bgSunken, P.textSecondary],
  };
  const [bg, color] = map[variant];
  return <span style={{ background:bg, color, fontSize:size==="xs"?10:11, fontWeight:500, padding:size==="xs"?"1px 6px":"2px 8px", borderRadius:999, letterSpacing:"0.03em", display:"inline-flex", alignItems:"center", whiteSpace:"nowrap", gap:3 }}>{children}</span>;
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  
  const NAV: { section: string; items: { path: string; label: string; Icon: React.FC<{ size: number }> }[] }[] = [
    { section:"Clinic", items:[{ path:"/", label:"Dashboard", Icon:Home },{ path:"/patients", label:"All patients", Icon:Users },{ path:"/patients/new", label:"New patient", Icon:Plus }] },
    { section:"Clinical", items:[{ path:"/patients?newVisit=true", label:"New visit", Icon:Stethoscope },{ path:"/appointments", label:"Appointments", Icon:Calendar }] },
    { section:"Finance", items:[{ path:"/billing", label:"Billing", Icon:Receipt },{ path:"/reports", label:"Reports", Icon:BarChart2 }] },
    { section:"Admin", items:[{ path:"/medicines", label:"Medicines", Icon:Pill },{ path:"/settings", label:"Settings", Icon:Settings }] },
  ];
  
  return (
    <div style={{ width:200, flexShrink:0, background:P.bgSunken, borderRight:`1px solid ${P.border}`, display:"flex", flexDirection:"column", height:"100vh", position:"sticky", top:0 }}>
      <div style={{ height:56, padding:"0 16px", display:"flex", alignItems:"center", gap: 12, borderBottom:`1px solid ${P.border}`, flexShrink:0 }}>
        <Logo size={32} />
        <div>
          <div style={{ fontFamily:"DM Serif Display, serif", fontSize:17, color:P.textPrimary, lineHeight:1.2 }}>Asoka HMS</div>
          <div style={{ fontSize:9, color:P.textMuted, letterSpacing:"0.02em" }}>Clinical Management</div>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"6px 0" }}>
        {NAV.map(group => (
          <div key={group.section} style={{ marginBottom:2 }}>
            <div style={{ padding:"8px 16px 3px", fontSize:9, fontWeight:500, color:P.textMuted, letterSpacing:"0.08em", textTransform:"uppercase" }}>{group.section}</div>
            {group.items.map(({ path, label, Icon }) => {
              const active = path === "/" ? location.pathname === "/" : (location.pathname.startsWith(path) && (path !== '/patients' || location.pathname === '/patients'));
              return (
                <button 
                  key={path} 
                  onClick={() => navigate(path)} 
                  style={{ 
                    width:"100%", height:36, display:"flex", alignItems:"center", gap:8, padding:"0 16px", 
                    background:active?P.violetLight:"transparent", border:"none", 
                    borderLeft:`3px solid ${active?P.violet:"transparent"}`, color:active?P.violetDark:P.textSecondary, 
                    fontSize:13, fontWeight:active?500:400, cursor:"pointer", textAlign:"left", 
                    fontFamily:"inherit", transition:"all 120ms" 
                  }} 
                  onMouseEnter={e => { if(!active)(e.currentTarget as HTMLElement).style.background=P.border; }} 
                  onMouseLeave={e => { if(!active)(e.currentTarget as HTMLElement).style.background="transparent"; }}
                >
                  <Icon size={15}/>{label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ padding:"12px 16px", borderTop:`1px solid ${P.border}`, display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        <div style={{ position:"relative" }}>
          <Av name={user?.name ?? 'User'} size={32}/>
          <div style={{ position:"absolute", bottom:0, right:0, width:8, height:8, borderRadius:"50%", background:P.violet, border:`2px solid ${P.bgSunken}` }}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:500, color:P.textPrimary, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.name ?? 'User'}</div>
          <Bdg variant="violet" size="xs">{user?.role ?? 'Staff'}</Bdg>
        </div>
        <button onClick={logout} style={{ background:"none", border:"none", cursor:"pointer", color:P.textMuted, display:"flex" }}><LogOut size={14}/></button>
      </div>
    </div>
  );
}
