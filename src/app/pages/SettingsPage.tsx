import React, { useState, useEffect } from 'react';
import { P } from '../utils/palette';
import { Settings, Save, CheckCircle, Download, Upload } from 'lucide-react';
import { Btn, Card, Inp, Sel } from '../components/common/SharedUI';
import { useTheme } from 'next-themes';
import { useAuthStore } from '../../store/auth.store';
import { createStaffAccount, resetStaffPassword } from '../../lib/auth';
import { listUsers, uploadStaffSignature } from '../../lib/services/users.service';
import { clearAllInvoices } from '../../lib/services/invoices.service';
import { syncVisitCounts } from '../../lib/services/patients.service';
import type { UserProfile } from '../../types';

export function SettingsPage() {
  const { user } = useAuthStore();
  const [sub, setSub] = useState("clinic");
  const { theme, setTheme } = useTheme();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'DOCTOR', password: '' });

  useEffect(() => {
    if (user?.role === 'ADMIN' && sub === 'staff') {
      listUsers().then(setUsers);
    }
  }, [user, sub]);

  const handleCreateStaff = async () => {
    try {
      await createStaffAccount(
        { name: formData.name, email: formData.email, role: formData.role as any, isActive: true },
        formData.password
      );
      setModalOpen(false);
      listUsers().then(setUsers);
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleSignatureUpload = async (uid: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadStaffSignature(uid, file);
      alert("Signature uploaded successfully!");
      listUsers().then(setUsers);
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    }
  };

  const SUBS = [
    { key:"clinic", label:"Clinic profile" },
    { key:"appearance", label:"Appearance" },
    { key:"backup", label:"Database backup" },
    { key:"reminders", label:"Follow-up reminders" }
  ];
  if (user?.role === 'ADMIN') {
    SUBS.push({ key:"staff", label:"Staff Management" });
  }
  
  return (
    <div>
      <h1 style={{ fontSize:18, fontWeight:500, color:P.textPrimary, marginBottom:20 }}>Settings</h1>
      <div style={{ display:"grid", gridTemplateColumns:"190px 1fr", gap:18 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
          {SUBS.map(s => <button key={s.key} onClick={() => setSub(s.key)} style={{ height:36, padding:"0 12px", textAlign:"left", background:sub===s.key?P.violetLight:"transparent", border:"none", borderRadius:8, borderLeft:`3px solid ${sub===s.key?P.violet:"transparent"}`, color:sub===s.key?P.violetDark:P.textSecondary, fontSize:13, fontWeight:sub===s.key?500:400, cursor:"pointer", fontFamily:"inherit", transition:"all 150ms" }}>{s.label}</button>)}
        </div>
        <Card style={{ padding:24 }}>
          {sub==="clinic"&&(
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ fontSize:15, fontWeight:500, color:P.textPrimary, marginBottom:4 }}>Clinic profile</div>
              <Inp label="Clinic name" value="Asoka Homoeopathic Medical Centre"/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}><Inp label="Phone number" value="+91 80 2345 6789"/><Inp label="Email" value="contact@asokahomoeo.in"/></div>
              <Inp label="Address" value="No. 12, 3rd Cross, JP Nagar, Bengaluru – 560078"/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}><Inp label="GST number" value="29AABCU9603R1ZM" mono/><Inp label="Registration number" value="KAR/HOM/2015/1234" mono/></div>
              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}><Btn variant="primary" icon={<Save size={13}/>}>Save changes</Btn></div>
            </div>
          )}
          {sub==="appearance"&&(
            <div>
              <div style={{ fontSize:15, fontWeight:500, color:P.textPrimary, marginBottom:16 }}>Appearance</div>
              <div style={{ fontSize:12, fontWeight:500, color:P.textSecondary, marginBottom:8 }}>Theme</div>
              <div style={{ display:"flex", gap:8 }}>{["light","dark","system"].map(t => <button key={t} onClick={() => setTheme(t)} style={{ height:36, padding:"0 16px", borderRadius:8, border:`1.5px solid ${theme===t?P.violet:P.border}`, background:theme===t?P.violetLight:P.bgSunken, color:theme===t?P.violetDark:P.textSecondary, fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize", transition:"all 150ms" }}>{t}</button>)}</div>
            </div>
          )}
          {sub==="backup"&&(
            <div>
              <div style={{ fontSize:15, fontWeight:500, color:P.textPrimary, marginBottom:16 }}>Database backup</div>
              <div style={{ background:P.violetLight, border:`1px solid ${P.violet}`, borderRadius:8, padding:"12px 16px", marginBottom:16 }}><div style={{ fontSize:13, color:P.violetDark, display:"flex", alignItems:"center", gap:6 }}><CheckCircle size={15}/>Last backup: 6 Jul 2026, 06:00 AM — 342 patients, 1,847 visits</div></div>
              <div style={{ display:"flex", gap:10, marginBottom:24 }}><Btn variant="primary" icon={<Download size={13}/>}>Backup now</Btn><Btn variant="secondary" icon={<Upload size={13}/>}>Restore from file</Btn></div>
              
              {user?.role === 'ADMIN' && (
                <>
                  <div style={{ fontSize:15, fontWeight:500, color:P.textPrimary, marginBottom:16 }}>Danger Zone (Admin Only)</div>
                  <div style={{ display:"flex", gap:10 }}>
                    <Btn variant="danger" onClick={async () => {
                      if (confirm("Are you sure you want to delete ALL invoice and revenue data? This cannot be undone.")) {
                        await clearAllInvoices();
                        alert("All revenues cleared.");
                      }
                    }}>Clear Revenue Data</Btn>
                    
                    <Btn variant="secondary" onClick={async () => {
                      if (confirm("Syncing visit counts might take a moment. Proceed?")) {
                        await syncVisitCounts();
                        alert("Visit counts synchronized successfully.");
                      }
                    }}>Sync Visit Counts</Btn>
                  </div>
                </>
              )}
            </div>
          )}
          {sub==="reminders"&&(
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ fontSize:15, fontWeight:500, color:P.textPrimary, marginBottom:4 }}>Follow-up reminders</div>
              <Sel label="Default follow-up interval" options={["7 days","14 days","30 days","45 days","60 days","90 days"].map(v => ({ value:v, label:v }))}/>
              <div>
                <div style={{ fontSize:12, fontWeight:500, color:P.textSecondary, marginBottom:8 }}>Notification channels</div>
                {[["WhatsApp reminders",true],["SMS reminders",false]].map(([label,on]) => <div key={label as string} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:P.bgSunken, borderRadius:8, marginBottom:8 }}><span style={{ fontSize:13, color:P.textSecondary }}>{label as string}</span><div style={{ width:36, height:20, borderRadius:999, background:on?P.violet:P.border, position:"relative", cursor:"pointer", transition:"background 150ms" }}><div style={{ position:"absolute", top:2, left:on?18:2, width:16, height:16, borderRadius:"50%", background:"#fff", transition:"left 150ms" }}/></div></div>)}
              </div>
            </div>
          )}
          {sub==="staff" && user?.role === 'ADMIN' && (
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <span style={{ fontSize:15, fontWeight:500, color:P.textPrimary }}>Staff Management</span>
                <Btn variant="primary" size="sm" onClick={() => setModalOpen(true)}>Add Staff</Btn>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {users.map(u => (
                  <div key={u.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:P.bgSunken, borderRadius:8, border:`1px solid ${P.border}` }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:500, color:P.textPrimary }}>{u.name}</div>
                      <div style={{ fontSize:12, color:P.textSecondary }}>{u.email} · {u.role}</div>
                      {u.signatureUrl && <div style={{ fontSize:11, color:P.sage, marginTop: 4 }}>✓ Signature saved</div>}
                    </div>
                    <div style={{ display:"flex", gap: 8 }}>
                      <Btn variant="subtle" size="sm" onClick={() => {
                        resetStaffPassword(u.email).then(() => alert("Password reset email sent!")).catch(e => alert(e.message));
                      }}>Reset Password</Btn>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${P.border}`, borderRadius: 6, padding: '0 12px', fontSize: 13, fontWeight: 500, color: P.textSecondary, cursor: 'pointer', height: 32 }}>
                        Upload Signature
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleSignatureUpload(u.id, e)} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {modalOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background:"rgba(28,26,23,0.48)", cursor:"pointer" }} onClick={() => setModalOpen(false)}/>
          <div style={{ position: "relative", width:400, background:P.bgSurface, borderRadius: 12, display:"flex", flexDirection:"column", boxShadow:"0 8px 32px rgba(28,26,23,0.14)" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${P.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:15, fontWeight:500, color:P.textPrimary }}>Add New Staff</span>
            </div>
            <div style={{ padding:20, display:"flex", flexDirection:"column", gap:16 }}>
              <Inp label="Full Name" value={formData.name} onChange={v => setFormData(p => ({...p, name: v}))} />
              <Inp label="Email Address" type="email" value={formData.email} onChange={v => setFormData(p => ({...p, email: v}))} />
              <Inp label="Password" type="password" value={formData.password} onChange={v => setFormData(p => ({...p, password: v}))} />
              <Sel label="Role" value={formData.role} onChange={v => setFormData(p => ({...p, role: v}))} options={[{value:'DOCTOR',label:'Doctor'}, {value:'RECEPTIONIST',label:'Receptionist'}]} />
            </div>
            <div style={{ padding: "16px 20px", borderTop: `1px solid ${P.border}`, display: "flex", justifyContent: "flex-end", gap: 10, background: P.bgSunken, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
              <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={handleCreateStaff}>Create Account</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
