import React, { useState, useEffect } from 'react';
import { P } from '../utils/palette';
import { ArrowLeft, X, AlertTriangle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Inp, Sel, Card, Btn } from '../components/common/SharedUI';
import { useNavigate, useParams } from 'react-router';
import { getPatient, updatePatient } from '../../lib/services/patients.service';
import { toast } from 'sonner';

function parseDOB(dob: string): string {
  const parts = dob.split('/');
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    if (dd && mm && yyyy && yyyy.length === 4) {
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
  }
  return dob;
}

function formatDOBForDisplay(isoDate: string): string {
  if (!isoDate || !isoDate.includes('-')) return isoDate;
  const [yyyy, mm, dd] = isoDate.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

function calcAge(dob: string): number | null {
  const parsed = parseDOB(dob);
  if (!parsed.includes('-')) return null;
  const birthDate = new Date(parsed);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? age : null;
}

export function EditPatientPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sex, setSex] = useState<'MALE' | 'FEMALE' | 'OTHER'>('FEMALE');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState('');
  const [showIns, setShowIns] = useState(false);

  const [formData, setFormData] = useState({
    name: '', dob: '', bloodGroup: 'Unknown', maritalStatus: '', mobile: '', email: '',
    address: '', city: '', state: '', pincode: '', guardianName: '', guardianRelation: '',
    idType: '', idNumber: '', occupation: '', referredBy: '', insuranceProvider: '', insurancePolicy: '', notes: '',
  });

  useEffect(() => {
    if (!patientId) return;
    getPatient(patientId).then(p => {
      setSex(p.sex);
      setAllergies(p.allergies || []);
      setFormData({
        name: p.name || '', dob: formatDOBForDisplay(p.dob || ''),
        bloodGroup: p.bloodGroup || 'Unknown', maritalStatus: p.maritalStatus || '',
        mobile: p.mobile || '', email: p.email || '', address: p.address || '',
        city: p.city || '', state: p.state || '', pincode: p.pincode || '',
        guardianName: p.guardianName || '', guardianRelation: p.guardianRelation || '',
        idType: p.idType || '', idNumber: p.idNumber || '', occupation: p.occupation || '',
        referredBy: p.referredBy || '', insuranceProvider: p.insuranceProvider || '',
        insurancePolicy: p.insurancePolicy || '', notes: p.notes || '',
      });
      if (p.insuranceProvider) setShowIns(true);
      setLoading(false);
    });
  }, [patientId]);

  const handleChange = (k: string, v: string) => setFormData(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!patientId) return;
    setSaving(true);
    try {
      await updatePatient(patientId, {
        name: formData.name, dob: parseDOB(formData.dob), sex,
        bloodGroup: formData.bloodGroup as any, maritalStatus: formData.maritalStatus,
        mobile: formData.mobile, email: formData.email, address: formData.address,
        city: formData.city, state: formData.state, pincode: formData.pincode,
        guardianName: formData.guardianName, guardianRelation: formData.guardianRelation,
        idType: formData.idType, idNumber: formData.idNumber, occupation: formData.occupation,
        referredBy: formData.referredBy, allergies,
        insuranceProvider: formData.insuranceProvider, insurancePolicy: formData.insurancePolicy,
        notes: formData.notes,
      });
      toast.success('Patient updated');
      navigate(`/patients/${patientId}`);
    } catch (e) {
      toast.error('Failed to update patient');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: P.textMuted }}>Loading patient...</div>;
  }

  const age = calcAge(formData.dob);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <button onClick={() => navigate(`/patients/${patientId}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.textMuted, display: 'flex', padding: 4 }}><ArrowLeft size={18} /></button>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: P.textPrimary }}>Edit patient details</h1>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 22, maxWidth: 960 }}>
        <div>
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: P.textSecondary, letterSpacing: '0.04em', marginBottom: 4 }}>Patient ID</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: P.textMuted, background: P.bgSunken, border: `1px solid ${P.border}`, borderRadius: 6, padding: '7px 10px' }}>
              {patientId}
            </div>
          </Card>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${P.border}` }}><span style={{ fontSize: 14, fontWeight: 500, color: P.textPrimary }}>Personal information</span></div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Inp label="Full name" value={formData.name} onChange={v => handleChange('name', v)} placeholder="Patient full name" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <Inp label="Date of birth (dd/mm/yyyy)" value={formData.dob} onChange={v => handleChange('dob', v)} placeholder="e.g. 14/03/1989" maxLength={10} />
                  {formData.dob && age !== null && (
                    <div style={{ fontSize: 11, color: P.textMuted, marginTop: 3 }}>Age: {age} years</div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: P.textSecondary, marginBottom: 4, letterSpacing: '0.04em' }}>Sex</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['MALE', 'FEMALE', 'OTHER'] as const).map(s => (
                      <button key={s} onClick={() => setSex(s)} style={{ flex: 1, height: 36, borderRadius: 8, border: `1.5px solid ${sex === s ? P.violet : P.border}`, background: sex === s ? P.violetLight : P.bgSunken, color: sex === s ? P.violetDark : P.textSecondary, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms' }}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Sel label="Blood group" value={formData.bloodGroup} onChange={v => handleChange('bloodGroup', v)} placeholder="Select..." options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'].map(b => ({ value: b, label: b }))} />
                <Sel label="Marital status" value={formData.maritalStatus} onChange={v => handleChange('maritalStatus', v)} placeholder="Select..." options={['Single', 'Married', 'Divorced', 'Widowed'].map(m => ({ value: m, label: m }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Inp label="Mobile number" type="tel" value={formData.mobile} onChange={v => handleChange('mobile', v)} placeholder="98765 43210" pre={<span style={{ fontSize: 12, color: P.textSecondary }}>+91</span>} />
                <Inp label="Email address" type="email" value={formData.email} onChange={v => handleChange('email', v)} placeholder="patient@email.com" />
              </div>
              <Inp label="Address" value={formData.address} onChange={v => handleChange('address', v)} placeholder="House / Street / Area" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 12 }}>
                <Inp label="City" value={formData.city} onChange={v => handleChange('city', v)} placeholder="Bengaluru" />
                <Sel label="State" value={formData.state} onChange={v => handleChange('state', v)} placeholder="Select..." options={['Karnataka', 'Tamil Nadu', 'Maharashtra', 'Kerala'].map(s => ({ value: s, label: s }))} />
                <Inp label="PIN" value={formData.pincode} onChange={v => handleChange('pincode', v)} placeholder="560001" />
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${P.border}` }}><span style={{ fontSize: 14, fontWeight: 500, color: P.textPrimary }}>Guardian & identity</span></div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Inp label="Guardian name" value={formData.guardianName} onChange={v => handleChange('guardianName', v)} placeholder="Full name" />
                <Sel label="Relationship" value={formData.guardianRelation} onChange={v => handleChange('guardianRelation', v)} placeholder="Select..." options={['Father', 'Mother', 'Spouse', 'Guardian', 'Self'].map(r => ({ value: r, label: r }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Sel label="ID type" value={formData.idType} onChange={v => handleChange('idType', v)} placeholder="Select..." options={['Aadhaar', 'PAN', 'Passport', 'Driving Licence'].map(t => ({ value: t, label: t }))} />
                <Inp label="ID number" value={formData.idNumber} onChange={v => handleChange('idNumber', v)} placeholder="XXXX XXXX XXXX" mono />
              </div>
              <Inp label="Occupation" value={formData.occupation} onChange={v => handleChange('occupation', v)} placeholder="e.g. Teacher, Engineer, Homemaker" />
            </div>
          </Card>
          <Card>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${P.border}` }}><span style={{ fontSize: 14, fontWeight: 500, color: P.textPrimary }}>Medical intake</span></div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Inp label="Referred by" value={formData.referredBy} onChange={v => handleChange('referredBy', v)} placeholder="Doctor name or existing patient" />
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: P.textSecondary, marginBottom: 6, letterSpacing: '0.04em' }}>Known allergies</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {allergies.map(a => (
                    <div key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: P.siennaLight, color: P.sienna, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500 }}>
                      {a}<button onClick={() => setAllergies(allergies.filter(x => x !== a))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.sienna, display: 'flex', padding: 0 }}><X size={10} /></button>
                    </div>
                  ))}
                </div>
                <input value={allergyInput} onChange={e => setAllergyInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && allergyInput.trim()) { setAllergies([...allergies, allergyInput.trim()]); setAllergyInput(''); } }} placeholder="Type and press Enter to add..." style={{ width: '100%', height: 36, padding: '0 10px', background: P.bgSunken, border: `1.5px solid ${P.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', color: P.textPrimary }} />
                {allergies.length > 0 && <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: P.siennaLight, border: `1px solid ${P.sienna}`, fontSize: 12, color: P.sienna, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={13} />Allergy on file — will appear on all visit screens</div>}
              </div>
              <textarea value={formData.notes} onChange={e => handleChange('notes', e.target.value)} rows={3} placeholder="Additional clinical notes..." style={{ width: '100%', padding: 10, background: P.bgSunken, border: `1.5px solid ${P.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: P.textPrimary, resize: 'vertical', outline: 'none' }} />
              <div>
                <button onClick={() => setShowIns(!showIns)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: P.violet, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {showIns ? <ChevronDown size={14} /> : <ChevronRight size={14} />}Insurance details
                </button>
                {showIns && (
                  <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Inp label="Insurance provider" value={formData.insuranceProvider} onChange={v => handleChange('insuranceProvider', v)} placeholder="Provider name" />
                    <Inp label="Policy number" value={formData.insurancePolicy} onChange={v => handleChange('insurancePolicy', v)} placeholder="POL-XXXXXXXX" />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
      <div style={{ position: 'sticky', bottom: 0, background: P.bgBase, borderTop: `1px solid ${P.border}`, padding: '12px 0', marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <Btn variant="ghost" onClick={() => navigate(`/patients/${patientId}`)}>Discard</Btn>
        <Btn variant="primary" onClick={handleSave} icon={<CheckCircle size={14} />}>{saving ? 'Saving...' : 'Save changes'}</Btn>
      </div>
    </div>
  );
}
