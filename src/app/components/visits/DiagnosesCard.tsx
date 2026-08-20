import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { P } from '../../utils/palette';
import { X, Plus } from 'lucide-react';
import { addDiagnosis, updateDiagnosis, deleteDiagnosis } from '../../../lib/services/diagnoses.service';

interface DiagnosesCardProps {
  patientId: string;
  visitId: string;
}

export function DiagnosesCard({ patientId, visitId }: DiagnosesCardProps) {
  const { control, register, getValues, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'diagnoses'
  });

  const handleBlur = async (index: number) => {
    const diag = getValues(`diagnoses.${index}`);
    if (!diag.text.trim()) return;

    if (diag.id) {
      await updateDiagnosis(patientId, visitId, diag.id, {
        text: diag.text,
        type: diag.type
      });
    } else {
      const newDiag = await addDiagnosis(patientId, visitId, {
        text: diag.text,
        type: diag.type,
        sortOrder: index
      });
      setValue(`diagnoses.${index}.id`, newDiag.id);
    }
  };

  const handleRemove = async (index: number) => {
    const diag = getValues(`diagnoses.${index}`);
    if (diag.id) {
      await deleteDiagnosis(patientId, visitId, diag.id);
    }
    remove(index);
  };

  // Ensure default row
  React.useEffect(() => {
    if (fields.length === 0) {
      append({ id: '', text: '', type: 'PROVISIONAL' });
    }
  }, [fields.length, append]);

  return (
    <div style={{
      background: P.bgSurface,
      border: `1px solid ${P.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 20,
      boxShadow: '0 1px 3px rgba(28,26,23,0.04)'
    }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: P.textPrimary }}>Diagnoses</span>
        <button
          type="button"
          onClick={() => append({ id: '', text: '', type: 'PROVISIONAL' })}
          style={{
            background: 'transparent',
            border: `1.5px solid ${P.border}`,
            color: P.textSecondary,
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <Plus size={13} /> Add row
        </button>
      </div>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fields.map((field, index) => (
          <div key={field.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              {...register(`diagnoses.${index}.type`)}
              onBlur={() => handleBlur(index)}
              style={{
                width: 140,
                padding: '0 10px',
                height: 36,
                background: P.bgSunken,
                border: `1.5px solid ${P.border}`,
                borderRadius: 8,
                fontSize: 12,
                color: P.textPrimary,
                fontFamily: 'inherit',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="PROVISIONAL">PROVISIONAL</option>
              <option value="FINAL">FINAL</option>
              <option value="DIFFERENTIAL">DIFFERENTIAL</option>
            </select>
            <input
              {...register(`diagnoses.${index}.text`)}
              onBlur={() => handleBlur(index)}
              placeholder="e.g. Acute Bronchitis"
              style={{
                flex: 1,
                padding: '0 10px',
                height: 36,
                background: P.bgSunken,
                border: `1.5px solid ${P.border}`,
                borderRadius: 8,
                fontSize: 13,
                color: P.textPrimary,
                fontFamily: 'inherit',
                outline: 'none'
              }}
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              style={{
                width: 32,
                height: 32,
                background: 'transparent',
                border: 'none',
                color: P.textMuted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
