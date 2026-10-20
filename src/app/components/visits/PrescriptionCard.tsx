import React, { useState, useEffect } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { P } from '../../utils/palette';
import { GripVertical, X, Plus } from 'lucide-react';
import { searchMedicines } from '../../../lib/services/medicines.service';
import { useIsMobile } from '../ui/use-mobile';

type SearchResult = { id: string; name: string; potencies: string[] };

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

const POTENCY_OPTIONS = [
  '6C', '12C', '30C', '200C', '1M', '10M', '50M', 'CM',
  '3X', '6X', '12X', '30X', 'Q',
];

const QUANTITY_OPTIONS = [
  '1 dose', '2 doses', '3 doses',
  '1 tablet', '2 tablets',
  '10 ml', '30 ml', '60 ml', '100 ml',
  '1 bottle',
];

function ComboInput({
  value,
  onChange,
  options,
  placeholder,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => { setInputValue(value); }, [value]);

  const filtered = options.filter(o =>
    !inputValue || o.toLowerCase().includes(inputValue.toLowerCase()),
  );

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={inputValue}
        readOnly={readOnly}
        onChange={e => { setInputValue(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => !readOnly && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '0 22px 0 8px', height: 34,
          background: P.bgSunken, border: `1px solid ${P.border}`,
          borderRadius: 6, fontSize: 12, color: P.textPrimary,
          fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
        }}
      />
      {!readOnly && (
        <span style={{
          position: 'absolute', right: 6, top: '50%',
          transform: 'translateY(-50%)', pointerEvents: 'none',
          color: P.textMuted, fontSize: 10,
        }}>
          ▾
        </span>
      )}
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: P.bgSurface, border: `1px solid ${P.border}`,
          borderRadius: 6, boxShadow: '0 4px 16px rgba(28,26,23,0.12)',
          zIndex: 9999, maxHeight: 180, overflowY: 'auto', marginTop: 2,
        }}>
          {filtered.map(opt => (
            <div
              key={opt}
              onMouseDown={() => { onChange(opt); setInputValue(opt); setOpen(false); }}
              style={{
                padding: '7px 10px', fontSize: 12, color: P.textPrimary,
                cursor: 'pointer', borderBottom: `1px solid ${P.bgSunken}`,
              }}
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

// Grid column template — Quantity column added between Potency and Dosage
const COLS_EDIT = '32px 2fr 110px 100px 130px 110px 150px 80px 36px';
const COLS_RO   = '2fr 110px 100px 130px 110px 150px 80px';

const FOOD_TIMINGS = [
  { value: 'BEFORE', label: 'Before food' },
  { value: 'AFTER',  label: 'After food'  },
  { value: 'WITH',   label: 'With food'   },
  { value: 'EMPTY_STOMACH', label: 'Empty stomach' },
];

export function PrescriptionCard({
  readOnly = false,
  onRemove,
}: {
  readOnly?: boolean;
  onRemove?: (firestoreId: string) => void;
}) {
  const { control, register, setValue, watch } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'prescriptionItems',
  });

  const isMobile = useIsMobile();
  const [searchResults, setSearchResults] = useState<Record<number, SearchResult[]>>({});
  const [activeSearch, setActiveSearch]   = useState<number | null>(null);
  const [availablePotencies, setAvailablePotencies] = useState<Record<number, string[]>>({});

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
    setValue(`prescriptionItems.${index}.potency`, '');
    setAvailablePotencies(prev => ({ ...prev, [index]: medicine.potencies }));
    setSearchResults(prev => ({ ...prev, [index]: [] }));
    setActiveSearch(null);
  };

  const handleRemove = (index: number) => {
    const item = (watch('prescriptionItems') as any[])[index];
    if (item?.id && onRemove) onRemove(item.id);
    remove(index);
  };

  const cols = readOnly ? COLS_RO : COLS_EDIT;
  const headerLabels = readOnly
    ? ['MEDICINE', 'POTENCY', 'QUANTITY', 'DOSAGE', 'FREQ', 'TIMING', 'DAYS']
    : ['', 'MEDICINE', 'POTENCY', 'QUANTITY', 'DOSAGE', 'FREQ', 'TIMING', 'DAYS', ''];

  return (
    <div style={{
      background: P.bgSurface, border: `1px solid ${P.border}`,
      borderRadius: 12, marginBottom: 20,
      boxShadow: '0 1px 3px rgba(28,26,23,0.04)',
      overflowX: isMobile ? 'visible' : 'auto',
    }}>
      {/* Card header */}
      <div style={{
        padding: '16px 20px', borderBottom: `1px solid ${P.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minWidth: isMobile ? 0 : 760,
      }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: P.textPrimary }}>Prescription</span>
        {!readOnly && (
          <button
            type="button"
            onClick={() => append({
              medicine: '', potency: '', quantity: '', dosage: '', repetition: '',
              durationDays: 5, beforeAfterFood: 'AFTER', notes: '',
            })}
            style={{
              background: 'transparent', border: `1.5px solid ${P.border}`,
              color: P.textSecondary, padding: '4px 10px', borderRadius: 6,
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            <Plus size={13} /> Add medicine
          </button>
        )}
      </div>

      {/* MOBILE VIEW */}
      {isMobile ? (
        <div style={{ padding: '12px' }}>
          {fields.map((field, index) => {
            const item = (watch('prescriptionItems') as any[])?.[index] || {};
            const timing = FOOD_TIMINGS.find(t => t.value === item.beforeAfterFood)?.label || item.beforeAfterFood || 'After food';

            if (readOnly) {
              return (
                <div
                  key={field.id}
                  style={{
                    background: P.bgSunken, border: `1px solid ${P.border}`,
                    borderRadius: 8, padding: '12px 14px', marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: P.textPrimary, marginBottom: 6, wordBreak: 'break-word' }}>
                    {item.medicine || item.medicineName || 'Unnamed medicine'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12, color: P.textSecondary }}>
                    {item.potency && <span style={{ background: P.bgBase, border: `1px solid ${P.border}`, padding: '2px 6px', borderRadius: 4 }}>{item.potency}</span>}
                    {item.quantity && <span style={{ background: P.bgBase, border: `1px solid ${P.border}`, padding: '2px 6px', borderRadius: 4 }}>Qty: {item.quantity}</span>}
                    {item.dosage && <span style={{ background: P.bgBase, border: `1px solid ${P.border}`, padding: '2px 6px', borderRadius: 4 }}>{item.dosage}</span>}
                    {item.repetition && <span style={{ background: P.bgBase, border: `1px solid ${P.border}`, padding: '2px 6px', borderRadius: 4 }}>{item.repetition}</span>}
                    {timing && <span style={{ background: P.bgBase, border: `1px solid ${P.border}`, padding: '2px 6px', borderRadius: 4 }}>{timing}</span>}
                    {item.durationDays && <span style={{ background: P.bgBase, border: `1px solid ${P.border}`, padding: '2px 6px', borderRadius: 4 }}>{item.durationDays} days</span>}
                  </div>
                </div>
              );
            }

            // Mobile edit card
            return (
              <div
                key={field.id}
                style={{
                  background: P.bgSunken, border: `1px solid ${P.border}`,
                  borderRadius: 8, padding: '12px 14px', marginBottom: 12,
                }}
              >
                {/* Medicine line + remove */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      {...register(`prescriptionItems.${index}.medicine`)}
                      onFocus={() => setActiveSearch(index)}
                      onChange={e => {
                        register(`prescriptionItems.${index}.medicine`).onChange(e);
                        handleSearch(index, e.target.value);
                      }}
                      onBlur={() => setTimeout(() => setActiveSearch(null), 200)}
                      placeholder="Medicine name..."
                      style={{
                        width: '100%', padding: '0 10px', height: 36,
                        background: P.bgSurface, border: `1px solid ${P.border}`,
                        borderRadius: 6, fontSize: 13, fontWeight: 500, color: P.textPrimary,
                        outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    {activeSearch === index && (searchResults[index]?.length ?? 0) > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        background: P.bgSurface, border: `1px solid ${P.border}`,
                        borderRadius: 8, boxShadow: '0 8px 24px rgba(28,26,23,0.15)',
                        zIndex: 9999, maxHeight: 180, overflowY: 'auto', marginTop: 4,
                      }}>
                        {searchResults[index].map(med => (
                          <div
                            key={med.id}
                            onMouseDown={() => selectMedicine(index, med)}
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: `1px solid ${P.bgSunken}` }}
                          >
                            {med.name} <span style={{ fontSize: 11, color: P.textMuted }}>{med.potencies.join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    style={{ background: 'none', border: 'none', color: P.sienna, cursor: 'pointer', padding: 6 }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* 2-column grid for inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 500, color: P.textMuted, marginBottom: 3 }}>POTENCY</div>
                    <input
                      {...register(`prescriptionItems.${index}.potency`)}
                      placeholder="e.g. 30C"
                      style={{ width: '100%', height: 32, padding: '0 8px', background: P.bgSurface, border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 500, color: P.textMuted, marginBottom: 3 }}>QUANTITY</div>
                    <ComboInput
                      value={watch(`prescriptionItems.${index}.quantity`) || ''}
                      onChange={v => setValue(`prescriptionItems.${index}.quantity`, v)}
                      options={QUANTITY_OPTIONS}
                      placeholder="e.g. 1 bottle"
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 500, color: P.textMuted, marginBottom: 3 }}>DOSAGE</div>
                    <ComboInput
                      value={watch(`prescriptionItems.${index}.dosage`) || ''}
                      onChange={v => setValue(`prescriptionItems.${index}.dosage`, v)}
                      options={DOSAGE_OPTIONS}
                      placeholder="e.g. 3 drops"
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 500, color: P.textMuted, marginBottom: 3 }}>FREQUENCY</div>
                    <ComboInput
                      value={watch(`prescriptionItems.${index}.repetition`) || ''}
                      onChange={v => setValue(`prescriptionItems.${index}.repetition`, v)}
                      options={FREQUENCY_OPTIONS}
                      placeholder="TDS"
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 500, color: P.textMuted, marginBottom: 3 }}>TIMING</div>
                    <select
                      {...register(`prescriptionItems.${index}.beforeAfterFood`)}
                      style={{ width: '100%', height: 32, padding: '0 6px', background: P.bgSurface, border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 12, outline: 'none' }}
                    >
                      {FOOD_TIMINGS.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 500, color: P.textMuted, marginBottom: 3 }}>DAYS</div>
                    <input
                      type="number"
                      {...register(`prescriptionItems.${index}.durationDays`, { valueAsNumber: true })}
                      placeholder="5"
                      style={{ width: '100%', height: 32, padding: '0 8px', background: P.bgSurface, border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DESKTOP TABLE VIEW */
        <>
          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: cols,
            gap: 6, padding: '8px 16px',
            borderBottom: `1px solid ${P.border}`,
            minWidth: 760,
          }}>
            {headerLabels.map((h, i) => (
              <div key={i} style={{
                fontSize: 10, fontWeight: 500, color: P.textMuted,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {fields.map((field, index) => (
            <div
              key={field.id}
              style={{
                display: 'grid', gridTemplateColumns: cols,
                gap: 6, padding: '8px 16px', alignItems: 'center',
                borderBottom: `1px solid ${P.border}`,
                minWidth: 760,
              }}
            >
              {!readOnly && (
                <div style={{ color: P.textMuted, cursor: 'grab', display: 'flex', alignItems: 'center' }}>
                  <GripVertical size={16} />
                </div>
              )}

              {/* Medicine + autocomplete */}
              <div style={{ position: 'relative' }}>
                <input
                  {...register(`prescriptionItems.${index}.medicine`)}
                  readOnly={readOnly}
                  onFocus={() => !readOnly && setActiveSearch(index)}
                  onChange={e => {
                    register(`prescriptionItems.${index}.medicine`).onChange(e);
                    handleSearch(index, e.target.value);
                  }}
                  onBlur={() => setTimeout(() => setActiveSearch(null), 200)}
                  placeholder="Search medicine..."
                  style={{
                    width: '100%', padding: '0 10px', height: 34,
                    background: P.bgSunken, border: `1px solid ${P.border}`,
                    borderRadius: 6, fontSize: 13, color: P.textPrimary,
                    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {activeSearch === index && (searchResults[index]?.length ?? 0) > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%', left: 0, right: 0,
                    background: P.bgSurface,
                    border: `1px solid ${P.border}`,
                    borderRadius: 8,
                    boxShadow: '0 8px 24px rgba(28,26,23,0.15)',
                    zIndex: 9999,
                    maxHeight: 220, overflowY: 'auto',
                    marginTop: 4,
                  }}>
                    {searchResults[index].map(med => (
                      <div
                        key={med.id}
                        onMouseDown={() => selectMedicine(index, med)}
                        style={{
                          padding: '9px 14px', cursor: 'pointer',
                          fontSize: 13, color: P.textPrimary,
                          borderBottom: `1px solid ${P.bgSunken}`,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = P.bgSunken)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {med.name}
                        <span style={{ fontSize: 11, color: P.textMuted, marginLeft: 8 }}>
                          {med.potencies.join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Potency */}
              <div>
                {(availablePotencies[index]?.length ?? 0) > 0 ? (
                  <select
                    {...register(`prescriptionItems.${index}.potency`)}
                    disabled={readOnly}
                    style={{
                      width: '100%', height: 34, padding: '0 6px',
                      background: P.bgSunken, border: `1px solid ${P.border}`,
                      borderRadius: 6, fontSize: 12, color: P.textPrimary,
                      outline: 'none', cursor: readOnly ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="">Potency</option>
                    {availablePotencies[index].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    {...register(`prescriptionItems.${index}.potency`)}
                    readOnly={readOnly}
                    placeholder="e.g. 30C"
                    style={{
                      width: '100%', height: 34, padding: '0 10px',
                      background: P.bgSunken, border: `1px solid ${P.border}`,
                      borderRadius: 6, fontSize: 12, color: P.textPrimary,
                      outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                    }}
                  />
                )}
              </div>

              {/* Quantity */}
              <ComboInput
                value={watch(`prescriptionItems.${index}.quantity`) || ''}
                onChange={v => setValue(`prescriptionItems.${index}.quantity`, v)}
                options={QUANTITY_OPTIONS}
                placeholder="e.g. 1 bottle"
                readOnly={readOnly}
              />

              {/* Dosage */}
              <ComboInput
                value={watch(`prescriptionItems.${index}.dosage`) || ''}
                onChange={v => setValue(`prescriptionItems.${index}.dosage`, v)}
                options={DOSAGE_OPTIONS}
                placeholder="e.g. 3 drops"
                readOnly={readOnly}
              />

              {/* Frequency */}
              <ComboInput
                value={watch(`prescriptionItems.${index}.repetition`) || ''}
                onChange={v => setValue(`prescriptionItems.${index}.repetition`, v)}
                options={FREQUENCY_OPTIONS}
                placeholder="TDS"
                readOnly={readOnly}
              />

              {/* Timing */}
              <select
                {...register(`prescriptionItems.${index}.beforeAfterFood`)}
                disabled={readOnly}
                style={{
                  width: '100%', height: 34, padding: '0 6px',
                  background: P.bgSunken, border: `1px solid ${P.border}`,
                  borderRadius: 6, fontSize: 12, color: P.textPrimary, outline: 'none',
                  fontFamily: 'inherit',
                }}
              >
                {FOOD_TIMINGS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              {/* Days */}
              <input
                type="number"
                {...register(`prescriptionItems.${index}.durationDays`, { valueAsNumber: true })}
                readOnly={readOnly}
                placeholder="5"
                style={{
                  width: '100%', height: 34, padding: '0 10px',
                  background: P.bgSunken, border: `1px solid ${P.border}`,
                  borderRadius: 6, fontSize: 13, color: P.textPrimary,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />

              {/* Remove button */}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  style={{
                    width: 28, height: 28, background: 'transparent', border: 'none',
                    color: P.textMuted, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </>
      )}

      {fields.length === 0 && (
        <div style={{
          padding: '20px', textAlign: 'center',
          fontSize: 13, color: P.textMuted,
        }}>
          {readOnly ? 'No medicines prescribed.' : 'Click "Add medicine" to add a medicine to this prescription.'}
        </div>
      )}
    </div>
  );
}
