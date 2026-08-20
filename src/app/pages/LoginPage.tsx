import React, { useState } from 'react';
import { P } from '../utils/palette';
import { Eye } from 'lucide-react';
import { Inp, Btn } from '../components/common/SharedUI';
import { Logo } from '../components/common/Logo';
import { loginUser } from '../../lib/auth';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

export function LoginPage() {
  const roleDefaults = {
    admin: { email: 'admin@asoka.clinic', pw: 'Admin@1234' },
    doctor: { email: 'sharma@asoka.clinic', pw: 'Doctor@1234' },
    receptionist: { email: 'front@asoka.clinic', pw: 'Recept@1234' },
  };

  const [role, setRole] = useState<"doctor"|"receptionist"|"admin">("doctor");
  const [email, setEmail] = useState(roleDefaults.doctor.email);
  const [pw, setPw] = useState(roleDefaults.doctor.pw);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRoleChange = (r: "doctor"|"receptionist"|"admin") => {
    setRole(r);
    setEmail(roleDefaults[r].email);
    setPw(roleDefaults[r].pw);
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      await loginUser(email, pw);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('Account not configured')) {
        toast.error('Account not configured. Contact your administrator.');
      } else {
        toast.error('Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display:"flex", height:"100vh", background:P.bgBase, alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", width: 900, height: 600, background: P.bgSurface, borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.08)", overflow: "hidden", border: `1px solid ${P.border}` }}>
        <div style={{ flex:1, background:P.bgSunken, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:48, borderRight:`1px solid ${P.border}` }}>
          <Logo size={280} />
          <div style={{ textAlign:"center", marginTop:24 }}>
          <p style={{ fontSize:13, color:P.textMuted, fontStyle:"italic", lineHeight:1.7, maxWidth:300 }}>"The highest ideal of cure is rapid, gentle and permanent restoration of the health."</p>
          <p style={{ fontSize:11, color:P.textMuted, marginTop:8 }}>— Samuel Hahnemann</p>
        </div>
      </div>
      <div style={{ width:440, display:"flex", alignItems:"center", justifyContent:"center", padding:48 }}>
        <div style={{ width:"100%", maxWidth:340 }}>
          <div style={{ marginBottom:40, textAlign:"center" }}>
            <div style={{ fontFamily:"DM Serif Display, serif", fontSize:28, color:P.textPrimary, lineHeight:1.2 }}>Asoka HMS</div>
            <div style={{ fontSize:12, color:P.textMuted, marginTop:4, letterSpacing:"0.04em" }}>Homoeopathic Medical Centre</div>
            <div style={{ width:36, height:2, background:P.violet, margin:"16px auto 0", borderRadius:1 }}/>
          </div>
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, fontWeight:500, color:P.textSecondary, marginBottom:8, letterSpacing:"0.04em" }}>Sign in as</div>
            <div style={{ display:"flex", gap:8 }}>
              {(["doctor","receptionist","admin"] as const).map(r => (
                <button key={r} onClick={() => handleRoleChange(r)} style={{ flex:1, height:36, borderRadius:999, border:`1.5px solid ${role===r?P.violet:P.border}`, background:role===r?P.violet:"transparent", color:role===r?"#fff":P.textSecondary, fontSize:12, fontWeight:500, cursor:"pointer", textTransform:"capitalize", transition:"all 150ms", fontFamily:"inherit" }}>
                  {r.charAt(0).toUpperCase()+r.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:20 }}>
            <Inp label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@clinic.in"/>
            <Inp label="Password" type={showPw?"text":"password"} value={pw} onChange={setPw} app={<button onClick={() => setShowPw(!showPw)} style={{ background:"none", border:"none", cursor:"pointer", color:P.textMuted, display:"flex" }}><Eye size={14}/></button>}/>
          </div>
          <Btn variant="primary" size="lg" fullWidth onClick={handleLogin} disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Btn>
          <div style={{ textAlign:"right", marginTop:12 }}>
            <button style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:P.violet, fontFamily:"inherit" }}>Forgot password?</button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
