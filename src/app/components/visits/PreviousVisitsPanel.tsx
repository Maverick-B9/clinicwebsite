import React, { useState, useEffect } from 'react';
import { P } from '../../utils/palette';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { listVisits } from '../../../lib/services/visits.service';
import { listDiagnoses } from '../../../lib/services/diagnoses.service';
import { listPrescriptionItems } from '../../../lib/services/prescriptions.service';
import type { Visit, Diagnosis, PrescriptionItem } from '../../../types';

interface VisitSummary {
  visit: Visit;
  diagnoses: Diagnosis[];
  prescriptions: PrescriptionItem[];
  expanded: boolean;
}

interface Props {
  patientId: string;
  currentVisitId: string;
}

export function PreviousVisitsPanel({ patientId, currentVisitId }: Props) {
  const [summaries, setSummaries] = useState<VisitSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const visits = await listVisits(patientId);
      const previous = visits.filter(v => v.id !== currentVisitId && !v.isDraft);
      const loaded: VisitSummary[] = await Promise.all(
        previous.map(async (visit, i) => {
          if (i === 0) {
            const [dx, rx] = await Promise.all([
              listDiagnoses(patientId, visit.id),
              listPrescriptionItems(patientId, visit.id),
            ]);
            return { visit, diagnoses: dx, prescriptions: rx, expanded: true };
          }
          return { visit, diagnoses: [], prescriptions: [], expanded: false };
        })
      );
      setSummaries(loaded);
      setLoading(false);
    }
    load();
  }, [patientId, currentVisitId]);

  const toggleExpand = async (index: number) => {
    const summary = summaries[index];
    if (!summary.expanded && summary.diagnoses.length === 0) {
      const [dx, rx] = await Promise.all([
        listDiagnoses(patientId, summary.visit.id),
        listPrescriptionItems(patientId, summary.visit.id),
      ]);
      setSummaries(prev => prev.map((s, i) =>
        i === index ? { ...s, diagnoses: dx, prescriptions: rx, expanded: true } : s
      ));
    } else {
      setSummaries(prev => prev.map((s, i) =>
        i === index ? { ...s, expanded: !s.expanded } : s
      ));
    }
  };

  if (loading || summaries.length === 0) return null;

  return (
    <div style={{
      background: P.bgSurface, border: `1px solid ${P.border}`,
      borderRadius: 12, marginBottom: 20,
      boxShadow: '0 1px 3px rgba(28,26,23,0.04)',
    }}>
      <div style={{
        padding: '14px 20px', borderBottom: `1px solid ${P.border}`,
        fontSize: 14, fontWeight: 500, color: P.textPrimary,
      }}>
        Previous Visits
        <span style={{ fontSize: 11, color: P.textMuted, marginLeft: 8, fontWeight: 400 }}>
          Latest first
        </span>
      </div>

      <div style={{ maxHeight: 480, overflowY: 'auto' }}>
        {summaries.map((s, index) => (
          <div key={s.visit.id} style={{
            borderBottom: index < summaries.length - 1 ? `1px solid ${P.border}` : 'none',
          }}>
            <div
              onClick={() => toggleExpand(index)}
              style={{
                padding: '12px 20px', display: 'flex', alignItems: 'center',
                gap: 12, cursor: 'pointer',
                background: s.expanded ? P.bgSunken : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!s.expanded) e.currentTarget.style.background = P.bgSunken; }}
              onMouseLeave={e => { if (!s.expanded) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: P.bgSunken,
                border: `1px solid ${P.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, color: P.textSecondary, flexShrink: 0,
              }}>
                #{s.visit.visitNumber}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: P.textPrimary }}>
                  {s.visit.visitDate || (s.visit.createdAt?.toDate
                    ? s.visit.createdAt.toDate().toLocaleDateString('en-IN')
                    : '—')}
                </div>
                <div style={{ fontSize: 11, color: P.textMuted, marginTop: 1 }}>
                  Dr. {s.visit.doctorName}
                  {s.visit.totalFee ? ` · \u20b9${s.visit.totalFee}` : ''}
                  {s.visit.paymentStatus ? ` · ${s.visit.paymentStatus}` : ''}
                </div>
              </div>
              {s.expanded ? <ChevronUp size={16} color={P.textMuted} /> : <ChevronDown size={16} color={P.textMuted} />}
            </div>

            {s.expanded && (
              <div style={{ padding: '0 20px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: P.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    Diagnoses
                  </div>
                  {s.diagnoses.length === 0 ? (
                    <div style={{ fontSize: 12, color: P.textMuted }}>None recorded</div>
                  ) : (
                    s.diagnoses.map(d => (
                      <div key={d.id} style={{ fontSize: 13, color: P.textPrimary, marginBottom: 3 }}>
                        <span style={{ fontSize: 10, color: P.textMuted, marginRight: 4 }}>{d.type}</span>
                        {d.text}
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: P.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    Prescription
                  </div>
                  {s.prescriptions.length === 0 ? (
                    <div style={{ fontSize: 12, color: P.textMuted }}>None recorded</div>
                  ) : (
                    s.prescriptions.map(rx => (
                      <div key={rx.id} style={{ fontSize: 13, color: P.textPrimary, marginBottom: 3 }}>
                        <span style={{ fontWeight: 500 }}>{rx.medicineName}</span>
                        {rx.potency && <span style={{ color: P.textMuted, marginLeft: 4 }}>{rx.potency}</span>}
                        {rx.dosage && <span style={{ color: P.textMuted }}> · {rx.dosage}</span>}
                        {rx.repetition && <span style={{ color: P.textMuted }}> · {rx.repetition}</span>}
                        {rx.durationDays && <span style={{ color: P.textMuted }}> · {rx.durationDays}d</span>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
