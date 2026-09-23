import React, { useState, useEffect } from 'react';
import { P } from '../../utils/palette';
import { Plus, ChevronDown, ChevronUp, History } from 'lucide-react';
import { listPatientSymptoms, getSymptomHistory, saveSymptomNote } from '../../../lib/services/symptoms.service';

interface Props {
  patientId: string;
  visitId: string;
  visitNumber: number;
  visitDate: string;
  readOnly?: boolean;
}

interface SymptomEntry {
  symptomNumber: number;
  symptomLabel: string;
  notes: string;
  isNew: boolean;
  showHistory: boolean;
  history: { visitNumber: number; visitDate: string; notes: string }[];
}

export function ClinicalNotesCard({ patientId, visitId, visitNumber, visitDate, readOnly = false }: Props) {
  const [existingSymptoms, setExistingSymptoms] = useState<{ number: number; label: string }[]>([]);
  const [entries, setEntries] = useState<SymptomEntry[]>([]);
  const [nextNumber, setNextNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingIndices, setSavingIndices] = useState<number[]>([]);
  const [savedIndices, setSavedIndices] = useState<number[]>([]);

  useEffect(() => {
    listPatientSymptoms(patientId).then(symptoms => {
      setExistingSymptoms(symptoms);
      const maxNum = symptoms.length > 0 ? Math.max(...symptoms.map(s => s.number)) : 0;
      setNextNumber(maxNum + 1);
      setLoading(false);
    });
  }, [patientId]);

  const addNewSymptom = () => {
    setEntries(prev => [...prev, {
      symptomNumber: nextNumber,
      symptomLabel: '',
      notes: '',
      isNew: true,
      showHistory: false,
      history: [],
    }]);
    setNextNumber(n => n + 1);
  };

  const addExistingSymptom = (sym: { number: number; label: string }) => {
    if (entries.find(e => e.symptomNumber === sym.number)) return;
    setEntries(prev => [...prev, {
      symptomNumber: sym.number,
      symptomLabel: sym.label,
      notes: '',
      isNew: false,
      showHistory: false,
      history: [],
    }]);
  };

  const toggleHistory = async (index: number) => {
    const entry = entries[index];
    if (!entry.showHistory && entry.history.length === 0) {
      const history = await getSymptomHistory(patientId, entry.symptomNumber);
      setEntries(prev => prev.map((e, i) => i === index ? {
        ...e,
        showHistory: true,
        history: history.filter(h => h.visitId !== visitId).map(h => ({
          visitNumber: h.visitNumber,
          visitDate: h.visitDate,
          notes: h.notes,
        })),
      } : e));
    } else {
      setEntries(prev => prev.map((e, i) => i === index ? { ...e, showHistory: !e.showHistory } : e));
    }
  };

  const updateEntry = (index: number, field: 'symptomLabel' | 'notes', value: string) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const saveEntry = async (index: number) => {
    const entry = entries[index];
    if (!entry.symptomLabel.trim() || !entry.notes.trim()) return;
    
    setSavingIndices(prev => [...prev, index]);
    try {
      await saveSymptomNote(patientId, {
        symptomNumber: entry.symptomNumber,
        symptomLabel: entry.symptomLabel,
        patientId,
        visitId,
        visitDate,
        visitNumber,
        notes: entry.notes,
      });
      setSavedIndices(prev => [...prev, index]);
      setTimeout(() => setSavedIndices(prev => prev.filter(i => i !== index)), 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to save note');
    } finally {
      setSavingIndices(prev => prev.filter(i => i !== index));
    }
  };

  const removeEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) return null;

  return (
    <div style={{ background: P.bgSurface, border: `1px solid ${P.border}`, borderRadius: 12, marginBottom: 20, overflow: 'hidden', boxShadow: '0 1px 3px rgba(28,26,23,0.04)' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 500, color: P.textPrimary }}>Clinical Notes</span>
          <span style={{ fontSize: 11, color: P.textMuted, marginLeft: 8 }}>Assign symptom numbers to track across visits</span>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={addNewSymptom}
            style={{ background: 'transparent', border: `1.5px solid ${P.border}`, color: P.textSecondary, padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <Plus size={13} /> New symptom
          </button>
        )}
      </div>

      {existingSymptoms.length > 0 && !readOnly && (
        <div style={{ padding: '10px 20px', borderBottom: `1px solid ${P.border}`, background: P.bgSunken }}>
          <div style={{ fontSize: 11, color: P.textMuted, marginBottom: 6 }}>Symptoms from previous visits — click to add notes:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {existingSymptoms.map(sym => {
              const added = !!entries.find(e => e.symptomNumber === sym.number);
              return (
                <button
                  key={sym.number}
                  type="button"
                  onClick={() => addExistingSymptom(sym)}
                  disabled={added}
                  style={{
                    padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                    border: `1.5px solid ${added ? P.sage : P.border}`,
                    background: added ? P.sageLight : 'transparent',
                    color: added ? P.sageDark : P.textSecondary,
                    cursor: added ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  #{sym.number} — {sym.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {entries.length === 0 && (
          <div style={{ textAlign: 'center', color: P.textMuted, fontSize: 13, padding: '20px 0' }}>
            {readOnly
              ? 'No clinical notes recorded for this visit.'
              : 'No clinical notes yet. Click "New symptom" to add one, or select from previous visit symptoms above.'}
          </div>
        )}
        {entries.map((entry, index) => (
          <div key={index} style={{ border: `1px solid ${P.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: P.bgSunken, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: P.sage, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                {entry.symptomNumber}
              </div>
              {entry.isNew && !readOnly ? (
                <input
                  value={entry.symptomLabel}
                  onChange={e => updateEntry(index, 'symptomLabel', e.target.value)}
                  placeholder="Symptom name (e.g. Pain - both knees)"
                  style={{ flex: 1, height: 30, padding: '0 8px', background: P.bgSurface, border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 13, color: P.textPrimary, fontFamily: 'inherit', outline: 'none' }}
                />
              ) : (
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: P.textPrimary }}>{entry.symptomLabel}</span>
              )}
              <button
                type="button"
                onClick={() => toggleHistory(index)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.textMuted, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'inherit' }}
              >
                <History size={13} />
                {entry.showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                History
              </button>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeEntry(index)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.textMuted, display: 'flex', fontSize: 14, lineHeight: 1 }}
                >
                  ✕
                </button>
              )}
            </div>

            {entry.showHistory && entry.history.length > 0 && (
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${P.border}`, background: P.bgBase }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: P.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Previous notes for this symptom</div>
                {entry.history.map((h, hi) => (
                  <div key={hi} style={{ padding: '6px 0', borderBottom: hi < entry.history.length - 1 ? `1px solid ${P.border}` : 'none' }}>
                    <div style={{ fontSize: 11, color: P.textMuted, marginBottom: 2 }}>Visit #{h.visitNumber} — {h.visitDate}</div>
                    <div style={{ fontSize: 13, color: P.textPrimary }}>{h.notes}</div>
                  </div>
                ))}
              </div>
            )}
            {entry.showHistory && entry.history.length === 0 && (
              <div style={{ padding: '8px 14px', background: P.bgBase, fontSize: 12, color: P.textMuted, borderBottom: `1px solid ${P.border}` }}>
                No previous notes for this symptom.
              </div>
            )}

            <div style={{ padding: '10px 14px' }}>
              <textarea
                value={entry.notes}
                onChange={e => updateEntry(index, 'notes', e.target.value)}
                placeholder={`Notes for symptom #${entry.symptomNumber} in this visit...`}
                rows={3}
                readOnly={readOnly}
                style={{ width: '100%', padding: '8px 10px', background: P.bgSunken, border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 13, color: P.textPrimary, fontFamily: 'inherit', outline: 'none', resize: readOnly ? 'none' : 'vertical', boxSizing: 'border-box' }}
              />
              {!readOnly && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => saveEntry(index)}
                    disabled={savingIndices.includes(index)}
                    style={{ background: savedIndices.includes(index) ? '#10b981' : P.sage, border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: savingIndices.includes(index) ? 'default' : 'pointer', opacity: savingIndices.includes(index) ? 0.7 : 1 }}
                  >
                    {savingIndices.includes(index) ? 'Saving...' : savedIndices.includes(index) ? 'Saved ✓' : 'Save Note'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
