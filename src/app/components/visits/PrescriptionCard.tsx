import React, { useState, useEffect } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { P } from '../../utils/palette';
import { GripVertical, X, Plus } from 'lucide-react';
import { searchMedicines } from '../../../lib/services/medicines.service';

type SearchResult = { id: string; name: string; potencies: string[] };

const POTENCY_OPTIONS = [
  '6C', '12C', '30C', '200C', '1M', '10M', '50M', 'CM',
  '3X', '6X', '12X', '30X', 'Q', 'Ø',
];

const DOSAGE_OPTIONS = [
  '1 drop', '2 drops', '3 drops', '5 drops', '10 drops',
  '1 pellet', '2 pellets', '3 pellets', '4 pellets', '5 pellets',
  '1 tablet', '2 tablets',
  '1 tsp', '1 tbsp',
];

const FREQUENCY_OPTIONS = [
  'OD', 'BD', 'TDS', 'QID', 'SOS', 'Weekly', 'Fortnightly', 'Monthly',
  'Once only', 'As needed', 'Every 15 min', 'Every hour', 'Every 2 hours',
];

function ComboInput({
  value,
  onChange,
  options,
  placeholder,
  style,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  style?: React.CSSProperties;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => { setInputValue(value); }, [value]);

  const filtered = options.filter(o =>
    !inputValue || o.toLowerCase().includes(inputValue.toLowerCase()),
  );

  return (
    <div style={{ position: 'relative', ...style }}>
      <input
        value={inputValue}
        readOnly={readOnly}
        onChange={e => { setInputValue(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => !readOnly && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '0 24px 0 8px', height: 34, background: P.bgSunken, border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 12, color: P.textPrimary, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
      />
      {!readOnly && <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: P.textMuted, fontSize: 10 }}>▾</span>}
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: P.bgSurface, border: `1px solid ${P.border}`, borderRadius: 6, boxShadow: '0 4px 12px rgba(28,26,23,0.10)', zIndex: 50, maxHeight: 180, overflowY: 'auto', marginTop: 2 }}>
          {filtered.map(opt => (
            <div
              key={opt}
              onMouseDown={() => { onChange(opt); setInputValue(opt); setOpen(false); }}
              style={{ padding: '7px 10px', fontSize: 12, color: P.textPrimary, cursor: 'pointer', borderBottom: `1px solid ${P.bgSunken}` }}
              onMouseEnter={e => (e.currentTarget.style.background = P.bgSunken)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PrescriptionCard({ readOnly = false }: { readOnly?: boolean }) {
  const { control, register, setValue, watch } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'prescriptionItems',
  });

  const [searchResults, setSearchResults] = useState<Record<number, SearchResult[]>>({});
  const [activeSearch, setActiveSearch] = useState<number | null>(null);

  const handleSearch = async (index: number, q: string) => {
    if (q.length < 2) {
      setSearchResults(prev => ({ ...prev, [index]: [] }));
      return;
    }
    const results = await searchMedicines(q);
    setSearchResults(prev => ({ ...prev, [index]: results }));
  };

  const selectMedicine = (index: number, medicine: SearchResult) => {
    setValue(`prescriptionItems.${index}.medicine`, medicine.name);
    setValue(`prescriptionItems.${index}.potency`, medicine.potencies[0] || '30C');
    setSearchResults(prev => ({ ...prev, [index]: [] }));
    setActiveSearch(null);
  };

  const FOOD_TIMINGS = [
    { value: 'BEFORE', label: 'Before food' },
    { value: 'AFTER', label: 'After food' },
    { value: 'WITH', label: 'With food' },
    { value: 'EMPTY_STOMACH', label: 'Empty stomach' },
  ];

  return (
    <div style={{ background: P.bgSurface, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 20, boxShadow: '0 1px 3px rgba(28,26,23,0.04)' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: P.textPrimary }}>Prescription</span>
        {!readOnly && (
          <button
            type="button"
            onClick={() => append({ medicine: '', potency: '', dosage: '', repetition: '', durationDays: 5, beforeAfterFood: 'AFTER', notes: '' })}
            style={{ background: 'transparent', border: `1.5px solid ${P.border}`, color: P.textSecondary, padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <Plus size={13} /> Add medicine
          </button>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              {!readOnly && <th style={{ width: 40, padding: '12px 0 12px 16px' }}></th>}
              <th style={{ padding: '12px', fontSize: 11, fontWeight: 500, color: P.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Medicine</th>
              <th style={{ width: 100, padding: '12px', fontSize: 11, fontWeight: 500, color: P.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Potency</th>
              <th style={{ width: 120, padding: '12px', fontSize: 11, fontWeight: 500, color: P.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dosage</th>
              <th style={{ width: 120, padding: '12px', fontSize: 11, fontWeight: 500, color: P.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Freq</th>
              <th style={{ width: 140, padding: '12px', fontSize: 11, fontWeight: 500, color: P.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Timing</th>
              <th style={{ width: 80, padding: '12px', fontSize: 11, fontWeight: 500, color: P.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Days</th>
              {!readOnly && <th style={{ width: 40, padding: '12px 16px 12px 0' }}></th>}
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id} style={{ borderTop: `1px solid ${P.border}` }}>
                {!readOnly && (
                  <td style={{ padding: '8px 0 8px 16px', color: P.textMuted, cursor: 'grab' }}>
                    <GripVertical size={16} />
                  </td>
                )}
                <td style={{ padding: '8px', position: 'relative' }}>
                  <input
                    {...register(`prescriptionItems.${index}.medicine`)}
                    readOnly={readOnly}
                    onFocus={() => !readOnly && setActiveSearch(index)}
                    onChange={(e) => {
                      register(`prescriptionItems.${index}.medicine`).onChange(e);
                      handleSearch(index, e.target.value);
                    }}
                    placeholder="Search medicine..."
                    style={{ width: '100%', padding: '0 10px', height: 34, background: P.bgSunken, border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 13, color: P.textPrimary, fontFamily: 'inherit', outline: 'none' }}
                  />
                  {activeSearch === index && searchResults[index]?.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 8, right: 8, background: P.bgSurface, border: `1px solid ${P.border}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(28,26,23,0.1)', zIndex: 10, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                      {searchResults[index].map(med => (
                        <div
                          key={med.id}
                          onClick={() => selectMedicine(index, med)}
                          style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: P.textPrimary, borderBottom: `1px solid ${P.bgSunken}` }}
                          onMouseEnter={e => (e.currentTarget.style.background = P.bgSunken)}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          {med.name}
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td style={{ padding: '8px' }}>
                  <ComboInput
                    value={watch(`prescriptionItems.${index}.potency`) || ''}
                    onChange={v => setValue(`prescriptionItems.${index}.potency`, v)}
                    options={POTENCY_OPTIONS}
                    placeholder="30C"
                    readOnly={readOnly}
                  />
                </td>
                <td style={{ padding: '8px' }}>
                  <ComboInput
                    value={watch(`prescriptionItems.${index}.dosage`) || ''}
                    onChange={v => setValue(`prescriptionItems.${index}.dosage`, v)}
                    options={DOSAGE_OPTIONS}
                    placeholder="3 drops"
                    readOnly={readOnly}
                  />
                </td>
                <td style={{ padding: '8px' }}>
                  <ComboInput
                    value={watch(`prescriptionItems.${index}.repetition`) || ''}
                    onChange={v => setValue(`prescriptionItems.${index}.repetition`, v)}
                    options={FREQUENCY_OPTIONS}
                    placeholder="TDS"
                    readOnly={readOnly}
                  />
                </td>
                <td style={{ padding: '8px' }}>
                  <select
                    {...register(`prescriptionItems.${index}.beforeAfterFood`)}
                    disabled={readOnly}
                    style={{ width: '100%', padding: '0 10px', height: 34, background: P.bgSunken, border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 12, color: P.textPrimary, outline: 'none' }}
                  >
                    {FOOD_TIMINGS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </td>
                <td style={{ padding: '8px' }}>
                  <input
                    type="number"
                    {...register(`prescriptionItems.${index}.durationDays`, { valueAsNumber: true })}
                    readOnly={readOnly}
                    placeholder="5"
                    style={{ width: '100%', padding: '0 10px', height: 34, background: P.bgSunken, border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 13, color: P.textPrimary, outline: 'none' }}
                  />
                </td>
                {!readOnly && (
                  <td style={{ padding: '8px 16px 8px 0' }}>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: P.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
