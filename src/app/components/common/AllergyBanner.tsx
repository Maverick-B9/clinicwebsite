import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { P } from '../../utils/palette';
import { useUIStore } from '../../../store/ui.store';

interface AllergyBannerProps {
  allergies: string[];
  visitId: string;
}

export function AllergyBanner({ allergies, visitId }: AllergyBannerProps) {
  const { acknowledgedAllergies, acknowledgeAllergy } = useUIStore();
  
  if (!allergies || allergies.length === 0) return null;

  const isAcknowledged = acknowledgedAllergies[visitId];

  if (isAcknowledged) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: P.siennaLight,
        color: P.sienna,
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        border: `1px solid ${P.sienna}`,
        marginBottom: 16,
      }}>
        <AlertTriangle size={12} />
        Allergies acknowledged: {allergies.join(', ')}
      </div>
    );
  }

  return (
    <div style={{
      background: P.siennaLight,
      border: `1px solid ${P.sienna}`,
      borderRadius: 8,
      padding: '12px 16px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', gap: 10, color: P.sienna }}>
        <AlertTriangle size={18} style={{ marginTop: 2 }} />
        <div>
          <strong style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Critical Allergy Alert</strong>
          <span style={{ fontSize: 13 }}>
            Patient has reported allergies to: <strong>{allergies.join(', ')}</strong>
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => acknowledgeAllergy(visitId)}
        style={{
          background: P.sienna,
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          transition: 'opacity 150ms',
        }}
      >
        <CheckCircle size={14} />
        Acknowledged
      </button>
    </div>
  );
}
