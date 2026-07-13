import React from 'react';

import NumberInput from '../../../components/NumberInput';
import { FACILITY_OPTIONS, SLOT_DURATIONS } from '../constants';

import type { WizardState } from '../../../store/centres/types';

interface Props {
  s: WizardState;
  set: (patch: Partial<WizardState>) => void;
  err: (cond: boolean) => React.CSSProperties | undefined;
  capacity: number;
  foundation: number;
  normalPool: number;
  foundationOverflow: boolean;
  toggleFacility: (f: string) => void;
  goStep: (n: number) => void;
}

/** Wizard Step 2 — Capacity, lanes & facilities. Extracted from NewCentreWizard; body unchanged. */
const Step2Facilities: React.FC<Props> = ({
  s,
  set,
  err,
  capacity,
  foundation,
  normalPool,
  foundationOverflow,
  toggleFacility,
  goStep,
}) => (
  <div>
    <div className="cmx-eyebrow" style={{ marginBottom: 14 }}>
      Overall Capacity
    </div>
    <div className="cmx-note" style={{ marginBottom: 16 }}>
      Overall capacity is the total number of concurrent member slots for this centre. Per-plan allocations are set in
      step 4 and must not exceed this total.
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
      <div className="flex flex-col gap-1">
        <span className="cmx-field-label">Overall Capacity (total slots) *</span>
        <NumberInput
          className="cmx-field"
          min={1}
          placeholder="e.g. 450"
          style={err(capacity <= 0)}
          value={typeof s.overallCapacity === 'number' ? s.overallCapacity : 0}
          onValueChange={v => set({ overallCapacity: v })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="cmx-field-label">Foundation Membership Pool</span>
        <NumberInput
          className="cmx-field"
          min={0}
          placeholder="e.g. 100"
          style={err(foundationOverflow)}
          value={typeof s.foundationPool === 'number' ? s.foundationPool : 0}
          onValueChange={v => set({ foundationPool: v })}
        />
        <div className="cmx-hint">Subset of overall capacity reserved for foundation members. Leave blank if N/A.</div>
        {foundationOverflow && (
          <div style={{ fontSize: 11, color: '#dc2626' }}>Foundation pool cannot exceed overall capacity.</div>
        )}
      </div>
    </div>

    {/* Live capacity bar */}
    {capacity > 0 && (
      <div
        style={{
          background: '#f9fafb',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>Capacity Overview</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)' }}>{capacity}</div>
            <div style={{ fontSize: 11, color: 'var(--sub)' }}>Total Capacity</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#d97706' }}>{foundation || '0'}</div>
            <div style={{ fontSize: 11, color: 'var(--sub)' }}>Foundation Pool</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>{normalPool || '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--sub)' }}>Normal Pool</div>
          </div>
        </div>
        <div
          style={{
            marginTop: 12,
            height: 10,
            background: 'var(--border)',
            borderRadius: 5,
            overflow: 'hidden',
            display: 'flex',
          }}
        >
          <div
            style={{
              height: '100%',
              background: '#d97706',
              width: `${capacity ? (foundation / capacity) * 100 : 0}%`,
              transition: 'width .3s',
            }}
          />
          <div
            style={{
              height: '100%',
              background: 'var(--blue)',
              width: `${capacity ? (normalPool / capacity) * 100 : 0}%`,
              transition: 'width .3s',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--sub)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#d97706' }} />
            Foundation (amber)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--sub)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--blue)' }} />
            Normal Pool (blue)
          </span>
        </div>
      </div>
    )}

    <div className="cmx-eyebrow" style={{ marginBottom: 14 }}>
      Lanes
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
      <div className="flex flex-col gap-1">
        <span className="cmx-field-label">Batting Lanes *</span>
        <NumberInput
          className="cmx-field"
          min={0}
          value={typeof s.battingLanes === 'number' ? s.battingLanes : 0}
          onValueChange={v => set({ battingLanes: v })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="cmx-field-label">Bowling Lanes *</span>
        <NumberInput
          className="cmx-field"
          min={0}
          value={typeof s.bowlingLanes === 'number' ? s.bowlingLanes : 0}
          onValueChange={v => set({ bowlingLanes: v })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="cmx-field-label">Multi-purpose Lanes</span>
        <NumberInput
          className="cmx-field"
          min={0}
          value={typeof s.multipurposeLanes === 'number' ? s.multipurposeLanes : 0}
          onValueChange={v => set({ multipurposeLanes: v })}
        />
      </div>
    </div>

    <div className="cmx-eyebrow" style={{ marginBottom: 14 }}>
      Facilities Available
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
      {FACILITY_OPTIONS.map(f => {
        const on = s.facilities.includes(f);
        return (
          <label
            key={f}
            className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-[7px] border border-cmx-border bg-white px-2.5 py-1.5 text-xs font-medium text-sub transition-all ${
              on ? 'border-[#9096be] bg-cmx-blue-light text-cmx-blue' : ''
            }`}
          >
            <input
              checked={on}
              className="h-[13px] w-[13px] accent-cmx-blue"
              type="checkbox"
              onChange={() => toggleFacility(f)}
            />{' '}
            {f}
          </label>
        );
      })}
    </div>

    <div className="cmx-eyebrow" style={{ marginBottom: 14 }}>
      Slot Configuration
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
      <div className="flex flex-col gap-1">
        <span className="cmx-field-label">Slot Duration (minutes) *</span>
        <select
          className="cmx-field"
          value={s.slotDurationMinutes}
          onChange={e => set({ slotDurationMinutes: Number(e.target.value) })}
        >
          {SLOT_DURATIONS.map(d => (
            <option key={d} value={d}>
              {d} minutes
            </option>
          ))}
        </select>
        <div className="cmx-hint">Network standard: 45 mins</div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="cmx-field-label">Advance Booking Window (days)</span>
        <NumberInput
          className="cmx-field"
          max={30}
          min={1}
          value={s.advanceBookingWindowDays}
          onValueChange={v => set({ advanceBookingWindowDays: v })}
        />
        <div className="cmx-hint">Network default: 7 days</div>
      </div>
    </div>

    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <button className="cmx-btn cmx-btn-outline" type="button" onClick={() => goStep(1)}>
        ← Back
      </button>
      <button className="cmx-btn cmx-btn-navy" type="button" onClick={() => goStep(3)}>
        Next: Add. Facilities →
      </button>
    </div>
  </div>
);

export default Step2Facilities;
