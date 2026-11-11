import React from 'react';

import { useSelector } from 'react-redux';

import { has, num } from '../../../utils/format';

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
  const facilities = useSelector((s: RootState) => s.centres.facilities);
  const memberships = bundle?.memberships ?? [];
  const caps = (bundle?.membershipSalesFlow?.capacity?.plans ?? {}) as Record<string, number>;

  // Per-plan filled counts come from the centre-list rollup (stats.membersByPlan)
  // for this facility, when that list is loaded. Absent → occupancy is unknown and
  // we show the allocated total only.
  const summary = facilities.find(f => f.code === bundle?.facility?.code);
  const membersByPlan = (summary?.stats?.membersByPlan ?? {}) as Record<string, number>;
  const hasOccupancy = summary?.stats?.membersByPlan !== undefined;

  // Order the plans, resolving each plan's allocated slots from the sales-flow capacity map.
  const plans = [...memberships]
    .sort((a, b) => {
      const ai = ORDER.indexOf(a.code);
      const bi = ORDER.indexOf(b.code);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    })
    .map(m => {
      const regular = (m.pricing?.regular ?? {}) as Record<string, unknown>;
      const meta = PLAN_META[m.code] ?? { name: m.code, color: '#64748b', access: '—' };
      // Allocated slots (network-capacity planning, set per-plan in the New
      // Centre wizard) is the primary source. A centre created before that
      // field existed — or one whose capacity doc otherwise never got filled
      // in for this plan — has nothing here; rather than show a flat,
      // uninformative "0 slots" for every plan, fall back to the plan's own
      // per-member entitlement (bookingRules.generalBookingRules.
      // maxFrothnightlyBookings, the same "Slots per Cycle" field the
      // Membership Plans drawer shows) so this card always shows a real,
      // non-zero number when the plan itself has one.
      const allocated = caps[m.code] ?? caps[m.name];
      const perMemberSlots = (
        m.bookingRules as { generalBookingRules?: { maxFrothnightlyBookings?: number } } | undefined
      )?.generalBookingRules?.maxFrothnightlyBookings;
      const slots = has(allocated) ? num(allocated) : num(perMemberSlots);
      const filled = num(membersByPlan[m.code] ?? membersByPlan[m.name]);
      // Name + access hours come from the saved membership doc; the catalogue meta
      // is only a fallback (legacy centres) + the accent colour (presentation).
      const accessHours = ((m.access ?? {}) as { hours?: string }).hours;
      return {
        code: m.code,
        name: m.name || meta.name,
        color: meta.color,
        access: accessHours || meta.access,
        fortnightly: num(regular.fortnightly),
        annual: num(regular.annual),
        slots,
        filled,
      };
    });

  const totalSlots = plans.reduce((sum, p) => sum + p.slots, 0);
  const share = (slots: number): number => (totalSlots > 0 ? Math.round((slots / totalSlots) * 100) : 0);

  // Guest / extra-session pricing is stored per plan; the centre view surfaces the
  // first plan's rules (they're set network-wide in the wizard). Real membership
  // docs nest guest pricing under guestBookingRules.pricing (firstGuest /
  // additionalGuests.discount) rather than flat fields — same shape the
  // Membership Plans "Guest Charges" tab and mapApiPlan.ts already read.
  const bookingRules = (memberships[0]?.bookingRules ?? {}) as {
    guestBookingRules?: {
      pricing?: { firstGuest?: number; additionalGuests?: { type?: string; discount?: number } };
    };
    slotPurchaseRules?: { price?: number };
  };
  const guestPricing = bookingRules.guestBookingRules?.pricing ?? {};
  const additionalGuests = guestPricing.additionalGuests ?? {};
  const firstGuestFee = guestPricing.firstGuest;
  const additionalGuestDiscount = additionalGuests.discount;
  const additionalGuestIsPct = additionalGuests.type === 'percentage';
  const extraSessionCost = bookingRules.slotPurchaseRules?.price;

  return (
    <div>
      <div
        style={{
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>Plans &amp; Pricing</div>
        <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 2 }}>
          Plans currently offered at this centre with local pricing and slot allocations
        </div>
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
                  title={hasOccupancy ? `${p.filled} filled · ${Math.max(0, p.slots - p.filled)} left` : undefined}
                >
                  {hasOccupancy ? `${p.filled}/${p.slots} slots` : `${p.slots} slots`}
                </span>
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
            value: has(firstGuestFee) ? money(firstGuestFee) : '—',
            suffix: '',
            note: 'Network default',
          },
          {
            label: 'Additional Guest Discount',
            value: has(additionalGuestDiscount)
              ? additionalGuestIsPct
                ? `${num(additionalGuestDiscount)}%`
                : money(additionalGuestDiscount)
              : '—',
            suffix: has(additionalGuestDiscount) && additionalGuestIsPct ? 'off' : '',
            note: 'Network default',
          },
          {
            label: 'Extra Session Cost',
            value: has(extraSessionCost) ? money(extraSessionCost) : '—',
            suffix: '',
            note: 'Centre-specific',
          },
        ].map(c => (
          <div
            key={c.label}
            style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}
          >
            <div style={{ fontSize: 12, color: 'var(--sub)' }}>{c.label}</div>
            <div style={{ margin: '4px 0 2px' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>{c.value}</span>
              {c.suffix && (
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--sub)', marginLeft: 4 }}>{c.suffix}</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--sub)' }}>{c.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlansPricing;
