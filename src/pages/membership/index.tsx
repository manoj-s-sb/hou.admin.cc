import React, { useEffect, useMemo, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import '../centres/centres.css';

import { getMemberships } from '../../store/memberships/api';
import { upsertPlan as upsertPlanAction } from '../../store/memberships/reducers';
import { AppDispatch, RootState } from '../../store/store';

import PlanDrawer from './components/PlanDrawer';
import { CURRENCIES, PLAN_REGION_FILTERS, SLOT_DURATION_MINUTES, type CurrencyOption } from './constants';

import type { MembershipPlan } from '../../store/memberships/types';

type PlanTab = 'fortnightly' | 'annual' | 'booking' | 'guests';

const TABS: { key: PlanTab; label: string }[] = [
  { key: 'fortnightly', label: 'Fortnightly Plans' },
  { key: 'annual', label: 'Annual Plans' },
  { key: 'booking', label: 'Booking & Access' },
  { key: 'guests', label: 'Guest Charges' },
];

const money = (usd: number, cur: CurrencyOption) =>
  `${cur.symbol}${(usd * cur.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ── Small cell helpers ──────────────────────────────────────────────────── */

const Pill: React.FC<{ tone: 'green' | 'red' | 'blue' | 'amber' | 'gray' | 'navy'; children: React.ReactNode }> = ({
  tone,
  children,
}) => (
  <span className={`cmx-pill ${tone}`} style={{ fontSize: 11 }}>
    {children}
  </span>
);

const FeatureLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td style={{ color: 'var(--sub)', fontWeight: 500 }}>{children}</td>
);

const SlotsCell: React.FC<{ plan: MembershipPlan; suffix?: string }> = ({ plan, suffix = '/ 2 weeks' }) =>
  plan.slotsPerCycle === 0 ? (
    <td>
      <Pill tone="green">Unlimited</Pill>{' '}
      <span style={{ fontSize: 11, color: 'var(--sub)' }}>
        {plan.accessType === 'nightowl' ? 'nights' : 'off-peak'}
      </span>
    </td>
  ) : (
    <td>
      <strong>{plan.slotsPerCycle} slots</strong> <span style={{ fontSize: 11, color: 'var(--sub)' }}>{suffix}</span>
    </td>
  );

/* ── Comparison table header (plan columns) ──────────────────────────────── */

const PlanHead: React.FC<{ plans: MembershipPlan[] }> = ({ plans }) => (
  <thead>
    <tr>
      <th>Feature</th>
      {plans.map(p => (
        <th key={p.id} style={{ color: p.colour }}>
          {p.name}
        </th>
      ))}
    </tr>
  </thead>
);

const MembershipPlans: React.FC = () => {
  // This page lists the GLOBAL plan templates (no facilityCode → /admin/memberships).
  const dispatch = useDispatch<AppDispatch>();
  const { plans, isLoading } = useSelector((state: RootState) => state.memberships);

  useEffect(() => {
    dispatch(getMemberships(undefined));
  }, [dispatch]);
  const [tab, setTab] = useState<PlanTab>('fortnightly');
  const [region, setRegion] = useState('all');
  const [currency, setCurrency] = useState<CurrencyOption>(CURRENCIES[0]);
  const [drawerPlan, setDrawerPlan] = useState<MembershipPlan | null>(null);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | null>(null);

  const visiblePlans = useMemo(
    () => plans.filter(p => region === 'all' || p.regions.includes('all') || p.regions.includes(region)),
    [plans, region]
  );

  const openCreate = () => {
    setDrawerPlan(null);
    setDrawerMode('create');
  };
  const openEdit = (plan: MembershipPlan) => {
    setDrawerPlan(plan);
    setDrawerMode('edit');
  };
  const closeDrawer = () => setDrawerMode(null);

  // New/Edit Plan opens as a full in-content page (keeps sidebar + topbar), like Staff.
  if (drawerMode) {
    return (
      <PlanDrawer
        mode={drawerMode}
        plan={drawerPlan}
        onClose={closeDrawer}
        onSaved={p => {
          dispatch(upsertPlanAction(p));
          dispatch(getMemberships(undefined));
          closeDrawer();
        }}
      />
    );
  }

  return (
    <div className="cmx">
      <div className="cmx-page-title">Membership Plans</div>
      <div className="cmx-page-desc">Global plan templates — define once, assign to any centre with local pricing.</div>

      {/* Filter + currency bar */}
      <div className="cmx-filter-bar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="cmx-eyebrow" style={{ margin: 0 }}>
            Centre:
          </span>
          {PLAN_REGION_FILTERS.map(f => (
            <button
              key={f.key}
              className={`cmx-country-chip ${region === f.key ? 'active' : ''}`}
              type="button"
              onClick={() => setRegion(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="cmx-eyebrow" style={{ margin: 0 }}>
            Currency:
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {CURRENCIES.map(c => (
              <button
                key={c.code}
                className={`cmx-demo-btn ${currency.code === c.code ? 'active' : ''}`}
                type="button"
                onClick={() => setCurrency(c)}
              >
                {c.code}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 11, color: 'var(--sub)' }}>
            {currency.code === 'USD' ? 'Base currency' : `1 USD ≈ ${currency.rate} ${currency.code}`}
          </span>
        </div>
      </div>

      {/* Tabs + New Plan */}
      <div className="cmx-section-head" style={{ marginBottom: 16 }}>
        <div className="cmx-ops-nav-tabs" style={{ marginBottom: 0 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`cmx-ops-tab ${tab === t.key ? 'active' : ''}`}
              type="button"
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button className="cmx-btn cmx-btn-navy" type="button" onClick={openCreate}>
          <svg fill="none" height={13} stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" width={13}>
            <line x1="12" x2="12" y1="5" y2="19" />
            <line x1="5" x2="19" y1="12" y2="12" />
          </svg>
          New Plan
        </button>
      </div>

      {isLoading ? (
        <div className="cmx-placeholder">
          <div className="ph-title">Loading plans…</div>
        </div>
      ) : (
        <>
          {tab === 'fortnightly' && <FortnightlyTab currency={currency} plans={visiblePlans} onEdit={openEdit} />}
          {tab === 'annual' && <AnnualTab currency={currency} plans={visiblePlans} onEdit={openEdit} />}
          {tab === 'booking' && <BookingAccessTab />}
          {tab === 'guests' && <GuestChargesTab />}
        </>
      )}
    </div>
  );
};

/* ── TAB: Fortnightly ─────────────────────────────────────────────────────── */

const FortnightlyTab: React.FC<{
  plans: MembershipPlan[];
  currency: CurrencyOption;
  onEdit: (p: MembershipPlan) => void;
}> = ({ plans, currency, onEdit }) => (
  <div>
    <div
      style={{
        background: '#ecedf4',
        border: '1px solid #b3b7d4',
        borderRadius: 8,
        padding: '10px 14px',
        marginBottom: 16,
        fontSize: 12.5,
        color: '#21295A',
      }}
    >
      Fortnightly billing cycle — charged every 2 weeks from the membership activation date. Minimum period: 1 month.
      Cancellation notice: 2 weeks.
    </div>
    <div className="cmx-tbl-wrap" style={{ marginBottom: 20 }}>
      <table className="cmx-tbl">
        <PlanHead plans={plans} />
        <tbody>
          <tr>
            <FeatureLabel>Fortnightly Price</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>
                <strong>{money(p.fortnightlyPrice, currency)}</strong>
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Access Hours</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>{p.accessHours}</td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Daily Booking Limit</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>{p.dailyBookingLimit} per day</td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Slots per fortnightly cycle</FeatureLabel>
            {plans.map(p => (
              <SlotsCell key={p.id} plan={p} />
            ))}
          </tr>
          <tr>
            <FeatureLabel>Carryover per cycle</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>
                {p.carryover > 0 ? `Up to ${p.carryover} unused → next cycle` : <Pill tone="gray">No</Pill>}
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Max accumulated (carry cap)</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>
                {p.carryCap > 0 ? <strong>{p.carryCap} slots max</strong> : <Pill tone="gray">N/A</Pill>}
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Extra session purchase</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>
                {p.extraSessionEnabled ? (
                  <Pill tone="blue">{money(p.extraSessionPrice, currency)} · 1/day max</Pill>
                ) : (
                  <Pill tone="gray">Not available</Pill>
                )}
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Peak Hours Access</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>{p.peakAccess ? <Pill tone="green">Yes</Pill> : <Pill tone="red">No</Pill>}</td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Additional Member Fee</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>
                {p.additionalMemberFee !== null ? (
                  `${money(p.additionalMemberFee, currency)} per member`
                ) : (
                  <Pill tone="gray">N/A</Pill>
                )}
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Centres Active</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>
                <Pill tone="blue">{p.centresActive} centres</Pill>
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Status</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>
                {p.status === 'active' ? <Pill tone="green">Active</Pill> : <Pill tone="gray">Archived</Pill>}
              </td>
            ))}
          </tr>
          <tr>
            <td />
            {plans.map(p => (
              <td key={p.id}>
                <button
                  className="cmx-btn cmx-btn-outline"
                  style={{ fontSize: 11, padding: '4px 9px' }}
                  type="button"
                  onClick={() => onEdit(p)}
                >
                  Edit
                </button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
    <div
      style={{
        background: '#e6f4f4',
        border: '1px solid #99d9d8',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12.5,
        color: '#006e6c',
      }}
    >
      <strong>Slot duration: {SLOT_DURATION_MINUTES} minutes</strong> · Extra session cost is{' '}
      <strong>configurable per centre</strong> — set when assigning a plan to a centre.
    </div>
  </div>
);

/* ── TAB: Annual ──────────────────────────────────────────────────────────── */

const AnnualTab: React.FC<{
  plans: MembershipPlan[];
  currency: CurrencyOption;
  onEdit: (p: MembershipPlan) => void;
}> = ({ plans, currency, onEdit }) => (
  <div>
    <div
      style={{
        background: '#fef9f0',
        border: '1px solid #fed7aa',
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 16,
        fontSize: 12.5,
        color: '#92400e',
      }}
    >
      <strong>Billing is annual — but slot limits still operate in fortnightly (2-week) cycles.</strong> A member on
      Annual Premium gets the same per-fortnight slots as the fortnightly plan; annual billing just means they pay once
      a year. Extra session purchase is <strong>not available</strong> on annual plans.
    </div>

    <div className="cmx-section-title" style={{ marginBottom: 10 }}>
      <span className="dot" />
      Pricing
    </div>
    <div className="cmx-tbl-wrap" style={{ marginBottom: 20 }}>
      <table className="cmx-tbl">
        <PlanHead plans={plans} />
        <tbody>
          <tr>
            <FeatureLabel>Annual Price (billed once)</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>
                <strong>{money(p.annualPrice, currency)}</strong>
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Equiv. per fortnight</FeatureLabel>
            {plans.map(p => (
              <td key={p.id} style={{ color: 'var(--sub)', fontSize: 12 }}>
                ~{money(p.annualPrice / 26, currency)}
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Savings vs fortnightly</FeatureLabel>
            {plans.map(p => {
              const yearly = p.fortnightlyPrice * 26;
              const pct = yearly > 0 ? Math.round((1 - p.annualPrice / yearly) * 100) : 0;
              return <td key={p.id}>{pct > 0 ? <Pill tone="green">~{pct}% off</Pill> : <Pill tone="gray">—</Pill>}</td>;
            })}
          </tr>
          <tr>
            <FeatureLabel>Cancellation</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>Any time before next annual date</td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Membership Hold</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>Up to 8 weeks/year · {money(5, currency)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>

    <div className="cmx-section-title" style={{ marginBottom: 10 }}>
      <span className="dot" />
      Slot Booking Limits (per fortnightly cycle — same as fortnightly plan)
    </div>
    <div className="cmx-tbl-wrap" style={{ marginBottom: 20 }}>
      <table className="cmx-tbl">
        <PlanHead plans={plans} />
        <tbody>
          <tr>
            <FeatureLabel>Slots per fortnightly cycle</FeatureLabel>
            {plans.map(p => (
              <SlotsCell key={p.id} plan={p} />
            ))}
          </tr>
          <tr>
            <FeatureLabel>Daily booking limit</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>{p.dailyBookingLimit} per day</td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Carryover per cycle</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>
                {p.carryover > 0 ? `Up to ${p.carryover} unused → next cycle` : <Pill tone="gray">No</Pill>}
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Max active future bookings</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>{p.maxFutureBookings}</td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Advance booking window</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>{p.advanceWindowDays} days</td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Extra session purchase</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>
                <Pill tone="red">Not available on annual</Pill>
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Peak hours access</FeatureLabel>
            {plans.map(p => (
              <td key={p.id}>{p.peakAccess ? <Pill tone="green">Yes</Pill> : <Pill tone="red">No</Pill>}</td>
            ))}
          </tr>
          <tr>
            <td />
            {plans.map(p => (
              <td key={p.id}>
                <button
                  className="cmx-btn cmx-btn-outline"
                  style={{ fontSize: 11, padding: '4px 9px' }}
                  type="button"
                  onClick={() => onEdit(p)}
                >
                  Edit
                </button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>

    <div
      style={{
        background: '#f9fafb',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '12px 16px',
        fontSize: 12,
        color: 'var(--sub)',
        lineHeight: 1.7,
      }}
    >
      <div>
        <strong style={{ color: 'var(--navy)' }}>How the effective limit works:</strong> Effective slots per cycle =
        base slots + carried-over slots.
      </div>
      <div style={{ marginTop: 4 }}>
        Example — Premium annual member with 2 carried slots: effective limit = 7 + 2 ={' '}
        <strong style={{ color: 'var(--navy)' }}>9 slots</strong> that fortnight (capped at 7 + 4 max = 11 absolute
        max).
      </div>
      <div style={{ marginTop: 4 }}>
        Example — Standard annual with 2 carried: effective limit = 3 + 2 ={' '}
        <strong style={{ color: 'var(--navy)' }}>5 slots</strong> that fortnight.
      </div>
      <div style={{ marginTop: 4 }}>
        <strong style={{ color: '#dc2626' }}>Note:</strong> When the fortnightly limit is hit on an annual plan, no
        extra session purchase option is shown — members get a standard “booking limit reached” message until the next
        2-week cycle resets.
      </div>
    </div>
  </div>
);

/* ── TAB: Booking & Access (network-wide rules) ──────────────────────────── */

const BOOKING_ROWS: { feature: string; adult: string; junior: string; family: string }[] = [
  {
    feature: 'Main Door Entry',
    adult: '60 min before booking',
    junior: '60 min before booking',
    family: '60 min before booking',
  },
  {
    feature: 'Main Door Entry Type',
    adult: 'Single entry only',
    junior: 'Multiple entry allowed',
    family: 'Multiple entry allowed',
  },
  {
    feature: 'QR Code Requirements',
    adult: 'One scan at each gate',
    junior: 'Two scans — guardian then self',
    family: 'Individual scan per member',
  },
  { feature: 'Slot Duration', adult: '45 minutes', junior: '45 minutes', family: '45 minutes' },
  {
    feature: 'Early Lane Access',
    adult: '30 min prior if available',
    junior: '30 min prior if available',
    family: '30 min prior if available',
  },
  {
    feature: 'Lane Entry Type',
    adult: 'Single entry only',
    junior: 'Multiple entry allowed',
    family: 'Multiple entry allowed',
  },
  { feature: 'Max Group Size', adult: '4 people', junior: 'Guardian only', family: 'All family members' },
  { feature: 'Max Active Future Bookings', adult: '2', junior: '2', family: '2' },
  { feature: 'Advance Booking Window', adult: '7 days', junior: '7 days', family: '7 days' },
];

const BookingAccessTab: React.FC = () => (
  <div>
    <div className="cmx-section-title" style={{ marginBottom: 12 }}>
      <span className="dot" />
      Booking Rules (All Plans)
    </div>
    <div className="cmx-tbl-wrap" style={{ marginBottom: 20 }}>
      <table className="cmx-tbl">
        <thead>
          <tr>
            <th>Feature</th>
            <th>Adult (16+)</th>
            <th>Junior (Under 16)</th>
            <th>Family</th>
          </tr>
        </thead>
        <tbody>
          {BOOKING_ROWS.map(r => (
            <tr key={r.feature}>
              <FeatureLabel>{r.feature}</FeatureLabel>
              <td>{r.adult}</td>
              <td>{r.junior}</td>
              <td>{r.family}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/* ── TAB: Guest Charges (network defaults) ───────────────────────────────── */

const GuestChargesTab: React.FC = () => (
  <div className="cmx-placeholder">
    <div className="ph-title">No guest charge configuration available.</div>
  </div>
);

export default MembershipPlans;
