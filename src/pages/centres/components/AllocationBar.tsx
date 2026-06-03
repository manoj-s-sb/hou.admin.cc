import React from 'react';

import { PLAN_CATALOGUE } from '../constants';

import type { WizardPlanRow } from '../types';

interface Props {
  capacity: number;
  plans: WizardPlanRow[];
}

/**
 * Live slot-allocation bar. Sums allocated slots across enabled plans and
 * renders a coloured segment per plan + a grey buffer. Turns red and surfaces
 * an over-allocation error when SUM(allocatedSlots) > capacity.
 */
const AllocationBar: React.FC<Props> = ({ capacity, plans }) => {
  const enabled = plans.filter(p => p.enabled);
  const used = enabled.reduce((sum, p) => sum + (Number(p.allocatedSlots) || 0), 0);
  const buffer = capacity - used;
  const over = buffer < 0;

  const meta = (id: string) => PLAN_CATALOGUE.find(p => p.id === id) ?? { name: id, colour: '#9ca3af' };

  return (
    <div
      style={{
        background: over ? '#fef2f2' : '#f9fafb',
        border: `1px solid ${over ? '#fecaca' : 'var(--border)'}`,
        borderRadius: 10,
        padding: 14,
        transition: 'all .2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Slot Allocation</div>
        <div style={{ fontSize: 12, color: 'var(--sub)' }}>
          Allocated: <strong>{used}</strong> / <strong>{capacity || '—'}</strong> · Buffer:{' '}
          <strong style={{ color: over ? '#dc2626' : 'var(--green)' }}>
            {over ? `⚠ Over by ${Math.abs(buffer)}` : buffer}
          </strong>
        </div>
      </div>

      <div
        style={{
          height: 10,
          background: 'var(--border)',
          borderRadius: 5,
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        {enabled.map(p => {
          const pct = capacity > 0 ? Math.min((Number(p.allocatedSlots) || 0) / capacity, 1) * 100 : 0;
          return (
            <div
              key={p.planId}
              style={{
                height: '100%',
                width: `${pct}%`,
                background: over ? '#dc2626' : meta(p.planId).colour,
                transition: 'width .3s',
              }}
              title={meta(p.planId).name}
            />
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', fontSize: 11 }}>
        {PLAN_CATALOGUE.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--sub)' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: p.colour }} />
            {p.name}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--sub)' }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#e5e7eb' }} />
          Buffer
        </div>
      </div>

      {over && (
        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: '#dc2626' }}>
          Allocated slots exceed the overall centre capacity ({capacity}). Reduce per-plan allocations before saving.
        </div>
      )}
    </div>
  );
};

export default AllocationBar;
