import React from 'react';

import { COUNTRIES, PLAN_CATALOGUE, TIMEZONES } from '../constants';

import { SAVE_STATUS_META, STATUS_LABEL, saveStatusOptions, toNum, type SaveStatus } from './wizardHelpers';
import { ReviewCard, ReviewGrid, StatusOption } from './WizardReviewBits';

import type { CentreApiStatus, WizardState } from '../../../store/centres/types';

interface Props {
  s: WizardState;
  saving: boolean;
  isEdit: boolean;
  currentStatus?: CentreApiStatus;
  saveStatus: SaveStatus;
  setSaveStatus: (v: SaveStatus) => void;
  save: () => void;
  onDownloadPdf: () => void;
  goStep: (n: number) => void;
  setStep: (n: number) => void;
  requestClose: () => void;
  foundation: number;
  capacity: number;
}

/** Wizard Step 5 — Review & save. Extracted from NewCentreWizard; body unchanged. */
const Step5Review: React.FC<Props> = ({
  s,
  saving,
  isEdit,
  currentStatus,
  saveStatus,
  setSaveStatus,
  save,
  onDownloadPdf,
  goStep,
  setStep,
  requestClose,
  foundation,
  capacity,
}) => (
  <div>
    <div className="cmx-eyebrow" style={{ marginBottom: 14 }}>
      Review Centre Configuration
    </div>

    <ReviewCard title="Centre Details" onEdit={() => setStep(1)}>
      <ReviewGrid
        rows={[
          ['Name', s.name || '—'],
          ['Short Code', s.shortCode || '—'],
          ['Status', STATUS_LABEL[s.status] ?? s.status],
          ['Address', [s.addressLine1, s.city, s.state, s.postcode].filter(Boolean).join(', ') || '—'],
          ['Country', COUNTRIES.find(c => c.code === s.country)?.label || '—'],
          ['Timezone', TIMEZONES.find(t => t.value === s.timezone)?.label || s.timezone || '—'],
          ['Phone', s.phone || '—'],
          ['Email', s.email || '—'],
          ['Hours', s.is24x7 ? 'Open 24/7' : `${s.operatingHours.filter(h => h.isOpen).length} days/week`],
        ]}
      />
    </ReviewCard>

    <ReviewCard title="Facilities & Capacity" onEdit={() => setStep(2)}>
      <ReviewGrid
        rows={[
          ['Overall Capacity', String(capacity || '—')],
          ['Foundation Pool', String(foundation || '—')],
          [
            'Lanes',
            `${toNum(s.battingLanes)} batting · ${toNum(s.bowlingLanes)} bowling · ${toNum(s.multipurposeLanes)} multi`,
          ],
          ['Slot Duration', `${s.slotDurationMinutes} min`],
          ['Booking Window', `${s.advanceBookingWindowDays} days`],
          ['Facilities', s.facilities.join(', ') || '—'],
        ]}
      />
    </ReviewCard>

    <ReviewCard title="Additional Bookable Facilities" onEdit={() => setStep(3)}>
      {s.additionalFacilities.length === 0 ? (
        <div style={{ color: 'var(--sub)' }}>No additional facilities configured.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {s.additionalFacilities.map(f => (
            <div key={f.id} style={{ fontSize: 12.5 }}>
              <strong>{f.name}</strong>
              {f.type === 'gaming'
                ? ` — ${f.psUnits ?? 0} units · $${f.chargePerHour ?? 0}/hr · ${f.openTime}–${f.closeTime}`
                : ` — $${f.fortnightlyPrice}/fn · ${f.slotDuration} · ${f.openTime}–${f.closeTime}`}
            </div>
          ))}
        </div>
      )}
    </ReviewCard>

    <ReviewCard title="Membership Plans & Capacity Allocation" onEdit={() => setStep(4)}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th
              style={{
                textAlign: 'left',
                padding: '6px 8px',
                fontSize: 11,
                color: 'var(--sub)',
                textTransform: 'uppercase',
              }}
            >
              Plan
            </th>
            <th
              style={{
                textAlign: 'left',
                padding: '6px 8px',
                fontSize: 11,
                color: 'var(--sub)',
                textTransform: 'uppercase',
              }}
            >
              Fortnightly
            </th>
            <th
              style={{
                textAlign: 'left',
                padding: '6px 8px',
                fontSize: 11,
                color: 'var(--sub)',
                textTransform: 'uppercase',
              }}
            >
              Slots
            </th>
            <th
              style={{
                textAlign: 'left',
                padding: '6px 8px',
                fontSize: 11,
                color: 'var(--sub)',
                textTransform: 'uppercase',
              }}
            >
              Foundation?
            </th>
          </tr>
        </thead>
        <tbody>
          {s.plans
            .filter(p => p.enabled)
            .map(p => {
              const meta = PLAN_CATALOGUE.find(m => m.id === p.planId) ?? {
                name: p.planId,
                colour: '#9ca3af',
              };
              return (
                <tr key={p.planId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: meta.colour,
                        marginRight: 6,
                      }}
                    />
                    {meta.name}
                  </td>
                  <td style={{ padding: '6px 8px' }}>${p.fortnightlyPrice}</td>
                  <td style={{ padding: '6px 8px' }}>{p.allocatedSlots}</td>
                  <td style={{ padding: '6px 8px' }}>{p.isFoundationEligible ? 'Yes' : 'No'}</td>
                </tr>
              );
            })}
          {s.plans.every(p => !p.enabled) && (
            <tr>
              <td colSpan={4} style={{ padding: '10px 8px', color: '#dc2626' }}>
                No plans enabled — enable at least one in step 4.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </ReviewCard>

    {/* Set Centre Status on Save */}
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 22,
        marginBottom: 22,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
        Set Centre Status on Save
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {saveStatusOptions(isEdit, currentStatus).map(opt => {
          const meta = SAVE_STATUS_META[opt];
          // A suspended centre going back live reads better as "Reactivate".
          const title = opt === 'active' && currentStatus === 'suspended' ? 'Reactivate Centre' : meta.title;
          return (
            <StatusOption
              key={opt}
              checked={saveStatus === opt}
              desc={meta.desc}
              title={title}
              onSelect={() => setSaveStatus(opt)}
            />
          );
        })}
      </div>
    </div>

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <button className="cmx-btn cmx-btn-outline" type="button" onClick={() => goStep(4)}>
        ← Back
      </button>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="cmx-btn cmx-btn-outline" type="button" onClick={onDownloadPdf}>
          <svg
            fill="none"
            height={14}
            stroke="currentColor"
            strokeWidth={2}
            style={{ marginRight: 6 }}
            viewBox="0 0 24 24"
            width={14}
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
            <line strokeLinecap="round" x1="12" x2="12" y1="15" y2="3" />
          </svg>
          Download PDF
        </button>
        <button className="cmx-btn cmx-btn-outline" disabled={saving} type="button" onClick={requestClose}>
          Cancel
        </button>
        <button
          className="cmx-btn cmx-btn-navy"
          disabled={saving}
          style={{ padding: '8px 20px' }}
          type="button"
          onClick={save}
        >
          <svg
            fill="none"
            height={14}
            stroke="currentColor"
            strokeWidth={2}
            style={{ marginRight: 6 }}
            viewBox="0 0 24 24"
            width={14}
          >
            <path
              d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline points="17 21 17 13 7 13 7 21" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="7 3 7 8 15 8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Centre'}
        </button>
      </div>
    </div>
  </div>
);

export default Step5Review;
