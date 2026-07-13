import React from 'react';

import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/store';

/** Display label + accent colour + access hours per plan code (mirrors the catalogue). */
const PLAN_META: Record<string, { name: string; color: string; access: string }> = {
  premium: { name: 'Premium', color: '#21295A', access: '24/7' },
  standard: { name: 'Standard', color: '#008482', access: '24/7' },
  family: { name: 'Family', color: '#7c3aed', access: '24/7' },
  offpeak: { name: 'Off Peak', color: '#d97706', access: '9am–3pm & 11pm–6am' },
  nightowl: { name: 'Night Owl', color: '#0891b2', access: '11pm–6am' },
};

// Display order matching the reference layout.
const ORDER = ['premium', 'standard', 'family', 'offpeak', 'nightowl'];

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Present (not null/undefined) — guest pricing shows "—" rather than $0 when unset. */
const has = (v: unknown): boolean => v !== undefined && v !== null;

const money = (v: unknown): string =>
  `$${num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const sectionLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--sub)',
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  marginBottom: 12,
};

const colLabel: React.CSSProperties = { fontSize: 11, color: 'var(--sub)' };
const colValue: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginTop: 2 };

/**
 * Centre → Plans & Pricing: the plans offered at this centre with local pricing,
 * slot allocation + capacity share, plus guest / extra-session pricing. Reads the
 * loaded centre bundle (state.centres.details) — no extra request.
 */
const PlansPricing: React.FC = () => {
  const bundle = useSelector((s: RootState) => s.centres.details);
  const memberships = bundle?.memberships ?? [];
  const caps = (bundle?.membershipSalesFlow?.capacity?.plans ?? {}) as Record<string, number>;

  // Order the plans, resolving each plan's allocated slots from the sales-flow capacity map.
  const plans = [...memberships]
    .sort((a, b) => {
      const ai = ORDER.indexOf(a.code);
      const bi = ORDER.indexOf(b.code);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    })
    .map(m => {
      const regular = (m.pricing?.regular ?? {}) as Record<string, unknown>;
      const meta = PLAN_META[m.code] ?? { name: m.name || m.code, color: '#64748b', access: '—' };
      const slots = num(caps[m.code] ?? caps[m.name]);
      return {
        code: m.code,
        name: meta.name,
        color: meta.color,
        access: meta.access,
        fortnightly: num(regular.fortnightly),
        annual: num(regular.annual),
        slots,
      };
    });

  const totalSlots = plans.reduce((sum, p) => sum + p.slots, 0);
  const share = (slots: number): number => (totalSlots > 0 ? Math.round((slots / totalSlots) * 100) : 0);

  // Guest / extra-session pricing is stored per plan; the centre view surfaces the
  // first plan's rules (they're set network-wide in the wizard).
  const guest = (memberships[0]?.bookingRules?.guestBookingRules ?? {}) as Record<string, unknown>;

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
        <button
          className="inline-flex cursor-pointer items-center gap-[5px] rounded-[7px] bg-navy px-3.5 py-2 text-[12.5px] font-semibold text-white transition-all hover:bg-[#2d3570]"
          type="button"
          onClick={() => toast('Add / edit plans from Centre Management → Edit')}
        >
          + Add / Edit Plans
        </button>
      </div>

      {plans.length === 0 ? (
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 32,
            textAlign: 'center',
            color: 'var(--sub)',
            fontSize: 12.5,
          }}
        >
          No plans configured for this centre yet.
          <div style={{ fontSize: 11, marginTop: 4 }}>
            Add them from the New Centre wizard or Centre Management → Edit.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          {plans.map(p => (
            <div
              key={p.code}
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderLeft: `4px solid ${p.color}`,
                borderRadius: 10,
                padding: '16px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{p.name}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: p.color,
                      background: `${p.color}14`,
                      borderRadius: 20,
                      padding: '2px 8px',
                    }}
                  >
                    {p.slots} slots
                  </span>
                </div>
                <button
                  className="inline-flex cursor-pointer items-center rounded-[7px] border border-cmx-border bg-white px-3 py-1 text-[12px] font-semibold text-sub transition-all hover:bg-gray-50"
                  type="button"
                  onClick={() => toast('Edit plans from Centre Management → Edit')}
                >
                  Edit
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, margin: '14px 0 12px' }}>
                <div>
                  <div style={colLabel}>Fortnightly</div>
                  <div style={colValue}>{money(p.fortnightly)}</div>
                </div>
                <div>
                  <div style={colLabel}>Annual</div>
                  <div style={colValue}>{money(p.annual)}</div>
                </div>
                <div>
                  <div style={colLabel}>Access hours</div>
                  <div style={colValue}>{p.access}</div>
                </div>
                <div>
                  <div style={colLabel}>Capacity share</div>
                  <div style={colValue}>{share(p.slots)}%</div>
                </div>
              </div>

              <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${share(p.slots)}%`, background: p.color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={sectionLabel}>Guest &amp; Extra Session Pricing</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {[
          {
            label: 'First Guest Fee',
            value: has(guest.firstGuestFee) ? money(guest.firstGuestFee) : '—',
            note: 'Network default',
          },
          {
            label: 'Additional Guest Discount',
            value: has(guest.additionalGuestDiscountPct) ? `${num(guest.additionalGuestDiscountPct)}%` : '—',
            note: 'Network default',
          },
          {
            label: 'Extra Session Cost',
            value: has(guest.extraSessionCost) ? money(guest.extraSessionCost) : '—',
            note: 'Centre-specific',
          },
        ].map(c => (
          <div
            key={c.label}
            style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}
          >
            <div style={{ fontSize: 12, color: 'var(--sub)' }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy)', margin: '4px 0 2px' }}>{c.value}</div>
            <div style={{ fontSize: 11, color: 'var(--sub)' }}>{c.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlansPricing;
