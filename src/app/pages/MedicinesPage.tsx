import React, { useState, useEffect } from 'react';
import { P } from '../utils/palette';
import { Search, Plus, Edit2, CheckCircle, X } from 'lucide-react';
import { Btn, Card, Bdg, Inp, Sel } from '../components/common/SharedUI';
import { listMedicines, createMedicine, updateMedicine } from '../../lib/services/medicines.service';
import type { Medicine, MedicineCategory } from '../../types';

const CATEGORIES: MedicineCategory[] = ['PLANT', 'MINERAL', 'ANIMAL', 'NOSODE', 'BIOCHEMIC', 'OTHER'];
const CAT_LABELS: Record<string, string> = {
  PLANT: 'Plant', MINERAL: 'Mineral', ANIMAL: 'Animal',
  NOSODE: 'Nosode', BIOCHEMIC: 'Biochemic', OTHER: 'Other',
};
const catBadge: Record<string, 'sage' | 'slate' | 'neutral' | 'ochre' | 'sienna'> = {
  PLANT: 'sage', NOSODE: 'slate', MINERAL: 'neutral', ANIMAL: 'ochre', BIOCHEMIC: 'neutral', OTHER: 'neutral',
};

const TAB_TO_CAT: Record<string, string> = {
  All: 'ALL', Plant: 'PLANT', Mineral: 'MINERAL', Animal: 'ANIMAL', Nosode: 'NOSODE', Biochemic: 'BIOCHEMIC',
};

interface FormState {
  name: string;
  manufacturer: string;
  category: MedicineCategory;
  potencyInput: string;
  potencies: string[];
  notes: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: '', manufacturer: '', category: 'PLANT',
  potencyInput: '', potencies: [], notes: '', isActive: true,
};

export function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Medicine | null>(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const cats = ['All', 'Plant', 'Mineral', 'Animal', 'Nosode', 'Biochemic'];

  const loadMedicines = async () => {
    setLoading(true);
    try {
      const meds = await listMedicines({ category: TAB_TO_CAT[catFilter] });
      setMedicines(meds);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMedicines(); }, [catFilter]);

  const rows = medicines.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (m: Medicine) => {
    setEditTarget(m);
    setForm({
      name: m.name,
      manufacturer: m.manufacturer ?? '',
      category: m.category,
      potencyInput: '',
      potencies: [...(m.potencies ?? [])],
      notes: m.notes ?? '',
      isActive: m.isActive,
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => { setDrawerOpen(false); setEditTarget(null); setForm(EMPTY_FORM); };

  const addPotency = () => {
    const p = form.potencyInput.trim();
    if (!p || form.potencies.includes(p)) { setForm(f => ({ ...f, potencyInput: '' })); return; }
    setForm(f => ({ ...f, potencies: [...f.potencies, p], potencyInput: '' }));
  };

  const removePotency = (p: string) => setForm(f => ({ ...f, potencies: f.potencies.filter(x => x !== p) }));

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Medicine name is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        manufacturer: form.manufacturer.trim(),
        category: form.category,
        potencies: form.potencies,
        notes: form.notes.trim(),
        isActive: form.isActive,
      };
      if (editTarget) {
        await updateMedicine(editTarget.id, payload);
      } else {
        await createMedicine(payload);
      }
      await loadMedicines();
      closeDrawer();
    } catch (err) {
      console.error(err);
      alert('Failed to save medicine. Check console.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (m: Medicine) => {
    try {
      await updateMedicine(m.id, { isActive: !m.isActive });
      setMedicines(prev => prev.map(med => med.id === m.id ? { ...med, isActive: !med.isActive } : med));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: P.textPrimary }}>Medicine master</h1>
        <Btn variant="primary" size="sm" icon={<Plus size={13} />} onClick={openAdd}>Add medicine</Btn>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} style={{
            height: 30, padding: '0 12px', borderRadius: 999,
            border: `1.5px solid ${catFilter === c ? P.violet : P.border}`,
            background: catFilter === c ? P.violet : 'transparent',
            color: catFilter === c ? '#fff' : P.textSecondary,
            fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 150ms', fontFamily: 'inherit',
          }}>{c}</button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: P.textMuted, pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search medicines..."
            style={{ height: 32, padding: '0 10px 0 30px', background: P.bgSunken, border: `1.5px solid ${P.border}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', outline: 'none', color: P.textPrimary, width: 200 }} />
        </div>
      </div>
      <Card>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Medicine name', 'Manufacturer', 'Available potencies', 'Category', 'Active', ''].map(h => (
                <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, fontWeight: 500, color: P.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${P.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: P.textMuted, fontSize: 13 }}>Loading medicines...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: P.textMuted, fontSize: 13 }}>
                {search ? 'No medicines match your search.' : 'No medicines added yet. Click "Add medicine" to get started.'}
              </td></tr>
            ) : rows.map(m => (
              <tr key={m.id} style={{ borderBottom: `1px solid ${P.border}` }}>
                <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, color: P.textPrimary }}>{m.name}</td>
                <td style={{ padding: '10px 16px', fontSize: 12, color: P.textSecondary }}>{m.manufacturer || '—'}</td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(m.potencies ?? []).length === 0
                      ? <span style={{ fontSize: 12, color: P.textMuted }}>—</span>
                      : (m.potencies ?? []).map(p => (
                        <span key={p} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, background: P.bgSunken, color: P.textSecondary, padding: '1px 6px', borderRadius: 4, border: `1px solid ${P.border}` }}>{p}</span>
                      ))}
                  </div>
                </td>
                <td style={{ padding: '10px 16px' }}><Bdg variant={catBadge[m.category] || 'neutral'}>{CAT_LABELS[m.category] || m.category}</Bdg></td>
                <td style={{ padding: '10px 16px' }}>
                  <div onClick={() => toggleActive(m)} style={{ width: 36, height: 20, borderRadius: 999, background: m.isActive ? P.violet : P.border, position: 'relative', cursor: 'pointer', transition: 'background 150ms' }}>
                    <div style={{ position: 'absolute', top: 2, left: m.isActive ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 150ms' }} />
                  </div>
                </td>
                <td style={{ padding: '10px 16px' }}><Btn variant="ghost" size="sm" icon={<Edit2 size={12} />} onClick={() => openEdit(m)}>Edit</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ flex: 1, background: 'rgba(28,26,23,0.48)', cursor: 'pointer' }} onClick={closeDrawer} />
          <div style={{ width: 420, background: P.bgSurface, display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(28,26,23,0.14)' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: P.textPrimary }}>{editTarget ? 'Edit medicine' : 'Add medicine'}</span>
              <button onClick={closeDrawer} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.textMuted, display: 'flex' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
              <Inp label="Medicine name *" placeholder="e.g. Nux Vomica" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
              <Inp label="Manufacturer" placeholder="e.g. SBL, Schwabe, Boiron" value={form.manufacturer} onChange={v => setForm(f => ({ ...f, manufacturer: v }))} />
              <Sel label="Category" value={form.category} onChange={v => setForm(f => ({ ...f, category: v as MedicineCategory }))}
                options={CATEGORIES.map(c => ({ value: c, label: CAT_LABELS[c] }))} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: P.textSecondary, marginBottom: 4, letterSpacing: '0.04em' }}>Available potencies</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input
                    value={form.potencyInput}
                    onChange={e => setForm(f => ({ ...f, potencyInput: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPotency(); } }}
                    placeholder="Type potency and press Enter (e.g. 30C)"
                    style={{ flex: 1, height: 36, padding: '0 10px', background: P.bgSunken, border: `1.5px solid ${P.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', color: P.textPrimary }}
                  />
                  <button onClick={addPotency} style={{ padding: '0 12px', borderRadius: 8, background: P.violet, border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                </div>
                {form.potencies.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {form.potencies.map(p => (
                      <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, background: P.bgSunken, color: P.textSecondary, padding: '2px 8px', borderRadius: 4, border: `1px solid ${P.border}` }}>
                        {p}
                        <button onClick={() => removePotency(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.textMuted, padding: 0, lineHeight: 1, display: 'flex' }}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Inp label="Notes" placeholder="Optional notes..." value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))} style={{ width: 36, height: 20, borderRadius: 999, background: form.isActive ? P.violet : P.border, position: 'relative', cursor: 'pointer', transition: 'background 150ms', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: form.isActive ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 150ms' }} />
                </div>
                <span style={{ fontSize: 13, color: P.textSecondary }}>Active</span>
              </div>
              <Btn variant="primary" fullWidth icon={<CheckCircle size={14} />} onClick={handleSave}>
                {saving ? 'Saving...' : editTarget ? 'Save changes' : 'Save medicine'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
