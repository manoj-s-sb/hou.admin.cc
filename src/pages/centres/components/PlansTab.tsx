import React from 'react';

import { PLAN_CATALOGUE } from '../constants';

import type { CentreWithKPI } from '../types';

const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  centre: CentreWithKPI;
}

/** Ops → Plans: plans offered at this centre with local pricing & slot share. */
const PlansTab: React.FC<Props> = ({ centre }) => {
  // Use the per-plan member breakdown as the centre's slot allocation snapshot.
  const breakdown = centre.kpi.planBreakdown;
  const total = breakdown.reduce((sum, p) => sum + p.members, 0) || 1;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>Active Membership Plans</div>
          <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 2 }}>
            Plans currently offered at this centre with local pricing and slot allocations
          </div>
        </div>
        <button className="cmx-btn cmx-btn-navy" type="button">
          <svg fill="none" height={13} stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" width={13}>
            <line x1="12" x2="12" y1="5" y2="19" />
            <line x1="5" x2="19" y1="12" y2="12" />
          </svg>
          Add / Edit Plans
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {breakdown.map(b => {
          const meta = PLAN_CATALOGUE.find(p => p.id === b.planId);
          const { colour } = b;
          const pct = Math.round((b.members / total) * 100);
          return (
            <div
              key={b.planId}
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderLeft: `4px solid ${colour}`,
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: colour, flexShrink: 0 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{b.label}</div>
                  <span className="cmx-pill" style={{ background: `${colour}18`, color: colour, fontSize: 11 }}>
                    {b.members} slots
                  </span>
                </div>
                <button className="cmx-btn cmx-btn-outline" style={{ fontSize: 11, padding: '3px 9px' }} type="button">
                  Edit
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, fontSize: 12 }}>
                <div>
                  <div style={{ color: 'var(--sub)', fontSize: 11, marginBottom: 2 }}>Fortnightly</div>
                  <strong>{meta ? money(meta.fortnightly) : '—'}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--sub)', fontSize: 11, marginBottom: 2 }}>Annual</div>
                  <strong>{meta ? money(meta.annual) : '—'}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--sub)', fontSize: 11, marginBottom: 2 }}>Access hours</div>
                  <span style={{ color: 'var(--sub)' }}>{meta?.access ?? '—'}</span>
                </div>
                <div>
                  <div style={{ color: 'var(--sub)', fontSize: 11, marginBottom: 2 }}>Capacity share</div>
                  <strong>{pct}%</strong>
                </div>
              </div>
              <div style={{ marginTop: 10, height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: colour,
                    borderRadius: 2,
                    transition: 'width .4s',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--sub)',
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          marginBottom: 14,
        }}
      >
        Guest &amp; Extra Session Pricing
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 28 }}>
        {[
          { k: 'First Guest Fee', v: '$30.00', note: 'Network default' },
          { k: 'Additional Guest Discount', v: '20%', note: 'Network default' },
          { k: 'Extra Session Cost', v: '$30.00', note: 'Centre-specific' },
        ].map(c => (
          <div
            key={c.k}
            style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}
          >
            <div style={{ fontSize: 11, color: 'var(--sub)', marginBottom: 4 }}>{c.k}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)' }}>{c.v}</div>
            <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 2 }}>{c.note}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--sub)',
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          marginBottom: 14,
        }}
      >
        Centre Discounts
      </div>
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 40,
          textAlign: 'center',
          color: 'var(--sub)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
          No discounts configured
        </div>
        <div style={{ fontSize: 12 }}>Centre-specific discounts can be added here</div>
        <button className="cmx-btn cmx-btn-outline" style={{ marginTop: 12 }} type="button">
          + Add Discount
        </button>
      </div>
    </div>
  );
};

export default PlansTab;
