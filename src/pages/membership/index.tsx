import React, { useEffect, useMemo, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { canEditModule } from '../../rbac';
import { MODULES } from '../../rbac/constants';
import { getFxRates, getMemberships } from '../../store/memberships/api';
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

const TD = 'border-b border-gray-100 px-3.5 py-[11px] align-middle';

// Each country/centre filter maps to the currency its prices should display in.
const REGION_CURRENCY: Record<string, string> = {
  all: 'USD',
  USA: 'USD',
  AUS: 'AUD',
  IND: 'INR',
};

const money = (usd: number, cur: CurrencyOption) =>
  `${cur.symbol}${(usd * cur.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ── Small cell helpers ──────────────────────────────────────────────────── */

const PILL_TONES: Record<'green' | 'red' | 'blue' | 'amber' | 'gray' | 'navy', string> = {
  green: 'bg-cmx-green-bg text-cmx-green',
  red: 'bg-red-100 text-red-600',
  blue: 'bg-cmx-blue-light text-cmx-blue',
  amber: 'bg-cmx-amber-bg text-cmx-amber',
  gray: 'bg-gray-100 text-sub',
  navy: 'bg-navy text-white',
};

const Pill: React.FC<{ tone: 'green' | 'red' | 'blue' | 'amber' | 'gray' | 'navy'; children: React.ReactNode }> = ({
  tone,
  children,
}) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${PILL_TONES[tone]}`}
    style={{ fontSize: 11 }}
  >
    {children}
  </span>
);

const FeatureLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td
    className="border-b border-gray-100 px-3.5 py-[11px] align-middle"
    style={{ color: 'var(--sub)', fontWeight: 500 }}
  >
    {children}
  </td>
);

const SlotsCell: React.FC<{ plan: MembershipPlan; suffix?: string }> = ({ plan, suffix = '/ 2 weeks' }) =>
  plan.slotsPerCycle === 0 ? (
    <td className={TD}>
      <Pill tone="green">Unlimited</Pill>{' '}
      <span style={{ fontSize: 11, color: 'var(--sub)' }}>
        {plan.accessType === 'nightowl' ? 'nights' : 'off-peak'}
      </span>
    </td>
  ) : (
    <td className={TD}>
      <strong>{plan.slotsPerCycle} slots</strong> <span style={{ fontSize: 11, color: 'var(--sub)' }}>{suffix}</span>
    </td>
  );

/* ── Comparison table header (plan columns) ──────────────────────────────── */

const PlanHead: React.FC<{ plans: MembershipPlan[] }> = ({ plans }) => (
  <thead>
    <tr>
      <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
        Feature
      </th>
      {plans.map(p => (
        <th
          key={p.id}
          className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub"
          style={{ color: p.colour }}
        >
          {p.name}
        </th>
      ))}
    </tr>
  </thead>
);

const MembershipPlans: React.FC = () => {
  const canEdit = canEditModule(MODULES.MEMBERSHIP_PLANS);
  // This page lists the GLOBAL plan templates (no facilityCode → /admin/memberships).
  const dispatch = useDispatch<AppDispatch>();
  const { plans, isLoading } = useSelector((state: RootState) => state.memberships);

  // Live daily FX rates (with the static CURRENCIES table as the offline fallback).
  const [liveRates, setLiveRates] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    dispatch(getMemberships(undefined));
    dispatch(getFxRates())
      .unwrap()
      .then(r => setLiveRates(r.rates ?? null))
      .catch(() => {
        // Endpoint unavailable — keep the static reference rates.
      });
  }, [dispatch]);

  const [tab, setTab] = useState<PlanTab>('fortnightly');
  const [region, setRegion] = useState('all');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [drawerPlan, setDrawerPlan] = useState<MembershipPlan | null>(null);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | null>(null);

  // Currency options carry the live rate when available, else the static default.
  const currencyOptions = useMemo(
    () =>
      CURRENCIES.map(c => {
        const rate = liveRates?.[c.code];
        return typeof rate === 'number' ? { ...c, rate } : c;
      }),
    [liveRates]
  );
  const currency = currencyOptions.find(c => c.code === currencyCode) ?? currencyOptions[0];

  // Changing the country/centre filter also switches the displayed currency so the
  // plan prices below update to that region. Currency can still be overridden manually.
  const selectRegion = (key: string) => {
    setRegion(key);
    const code = REGION_CURRENCY[key];
    if (code) setCurrencyCode(code);
  };

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
    <div className="font-sans text-sm text-cmx-text">
      <div className="mb-1 text-xl font-bold text-navy">Membership Plans</div>
      <div className="mb-[22px] text-[13px] text-sub">
        Global plan templates — define once, assign to any centre with local pricing.
      </div>

      {/* Filter + currency bar */}
      <div
        className="mb-5 flex flex-wrap items-end gap-3 rounded-[10px] border border-cmx-border bg-white px-[18px] py-3.5 shadow-cmx"
        style={{ justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="text-xs font-bold uppercase tracking-[0.06em] text-sub" style={{ margin: 0 }}>
            Centre:
          </span>
          {PLAN_REGION_FILTERS.map(f => (
            <button
              key={f.key}
              className={`inline-flex cursor-pointer select-none items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${region === f.key ? 'border-[#9096be] bg-[#ecedf4] text-[#21295a]' : 'border-cmx-border bg-white text-sub'}`}
              type="button"
              onClick={() => selectRegion(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="text-xs font-bold uppercase tracking-[0.06em] text-sub" style={{ margin: 0 }}>
            Currency:
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {currencyOptions.map(c => (
              <button
                key={c.code}
                className={`cursor-pointer whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${currency.code === c.code ? 'border-navy bg-navy text-white' : 'border-cmx-border bg-white text-sub'}`}
                type="button"
                onClick={() => setCurrencyCode(c.code)}
              >
                {c.code}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 11, color: 'var(--sub)' }}>
            {currency.code === 'USD' ? 'Base currency' : `1 USD ≈ ${currency.rate.toFixed(3)} ${currency.code}`}
          </span>
        </div>
      </div>

      {/* Tabs + New Plan */}
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div className="mb-6 flex gap-0 overflow-x-auto border-b border-cmx-border" style={{ marginBottom: 0 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`-mb-px flex cursor-pointer items-center gap-[7px] whitespace-nowrap border-b-2 border-transparent bg-transparent px-[18px] py-3 text-[13px] font-medium transition-all hover:text-cmx-text ${tab === t.key ? 'border-b-cmx-blue font-semibold text-cmx-blue' : 'text-sub'}`}
              type="button"
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {canEdit && (
          <button
            className="inline-flex cursor-pointer items-center gap-[5px] rounded-[7px] bg-navy px-3 py-1.5 text-[12.5px] font-semibold text-white transition-all hover:opacity-90"
            type="button"
            onClick={openCreate}
          >
            <svg fill="none" height={13} stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" width={13}>
              <line x1="12" x2="12" y1="5" y2="19" />
              <line x1="5" x2="19" y1="12" y2="12" />
            </svg>
            New Plan
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-cmx-border bg-white px-6 py-14 text-center text-sub">
          <div className="text-sm font-bold text-navy">Loading plans…</div>
        </div>
      ) : (
        <>
          {tab === 'fortnightly' && (
            <FortnightlyTab currency={currency} plans={visiblePlans} onEdit={canEdit ? openEdit : undefined} />
          )}
          {tab === 'annual' && (
            <AnnualTab currency={currency} plans={visiblePlans} onEdit={canEdit ? openEdit : undefined} />
          )}
          {tab === 'booking' && <BookingAccessTab plans={visiblePlans} />}
          {tab === 'guests' && <GuestChargesTab currency={currency} plans={visiblePlans} />}
        </>
      )}
    </div>
  );
};

/* ── TAB: Fortnightly ─────────────────────────────────────────────────────── */

const FortnightlyTab: React.FC<{
  plans: MembershipPlan[];
  currency: CurrencyOption;
  onEdit?: (p: MembershipPlan) => void;
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
    <div className="overflow-x-auto rounded-[10px] border border-cmx-border bg-white" style={{ marginBottom: 20 }}>
      <table className="w-full border-collapse text-[13px]">
        <PlanHead plans={plans} />
        <tbody>
          <tr>
            <FeatureLabel>Fortnightly Price</FeatureLabel>
            {plans.map(p => (
              <td key={p.id} className={TD}>
                <strong>{money(p.fortnightlyPrice, currency)}</strong>
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Access Hours</FeatureLabel>
            {plans.map(p => (
              <td key={p.id} className={TD}>
                {p.accessHours}
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Daily Booking Limit</FeatureLabel>
            {plans.map(p => (
              <td key={p.id} className={TD}>
                {p.dailyBookingLimit} per day
              </td>
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
              <td key={p.id} className={TD}>
                {p.carryover > 0 ? `Up to ${p.carryover} unused → next cycle` : <Pill tone="gray">No</Pill>}
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Max accumulated (carry cap)</FeatureLabel>
            {plans.map(p => (
              <td key={p.id} className={TD}>
                {p.carryCap > 0 ? <strong>{p.carryCap} slots max</strong> : <Pill tone="gray">N/A</Pill>}
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Extra session purchase</FeatureLabel>
            {plans.map(p => (
              <td key={p.id} className={TD}>
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
              <td key={p.id} className={TD}>
                {p.peakAccess ? <Pill tone="green">Yes</Pill> : <Pill tone="red">No</Pill>}
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Additional Member Fee</FeatureLabel>
            {plans.map(p => (
              <td key={p.id} className={TD}>
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
              <td key={p.id} className={TD}>
                <Pill tone="blue">{p.centresActive} centres</Pill>
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Status</FeatureLabel>
            {plans.map(p => (
              <td key={p.id} className={TD}>
                {p.status === 'active' ? <Pill tone="green">Active</Pill> : <Pill tone="gray">Archived</Pill>}
              </td>
            ))}
          </tr>
          <tr>
            <td className={TD} />
            {plans.map(p => (
              <td key={p.id} className={TD}>
                <button
                  className="inline-flex cursor-pointer items-center gap-[5px] rounded-[7px] border border-cmx-border bg-white px-3 py-1.5 text-[12.5px] font-semibold text-sub transition-all hover:bg-gray-50"
                  style={{ fontSize: 11, padding: '4px 9px' }}
                  type="button"
                  onClick={() => onEdit?.(p)}
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
  onEdit?: (p: MembershipPlan) => void;
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

    <div className="flex items-center gap-2 text-sm font-bold text-navy" style={{ marginBottom: 10 }}>
      <span className="h-[7px] w-[7px] rounded-full bg-cmx-blue" />
      Pricing
    </div>
    <div className="overflow-x-auto rounded-[10px] border border-cmx-border bg-white" style={{ marginBottom: 20 }}>
      <table className="w-full border-collapse text-[13px]">
        <PlanHead plans={plans} />
        <tbody>
          <tr>
            <FeatureLabel>Annual Price (billed once)</FeatureLabel>
            {plans.map(p => (
              <td key={p.id} className={TD}>
                <strong>{money(p.annualPrice, currency)}</strong>
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Equiv. per fortnight</FeatureLabel>
            {plans.map(p => (
              <td key={p.id} className={TD} style={{ color: 'var(--sub)', fontSize: 12 }}>
                ~{money(p.annualPrice / 26, currency)}
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Savings vs fortnightly</FeatureLabel>
            {plans.map(p => {
              const yearly = p.fortnightlyPrice * 26;
              const pct = yearly > 0 ? Math.round((1 - p.annualPrice / yearly) * 100) : 0;
              return (
                <td key={p.id} className={TD}>
                  {pct > 0 ? <Pill tone="green">~{pct}% off</Pill> : <Pill tone="gray">—</Pill>}
                </td>
              );
            })}
          </tr>
          <tr>
            <FeatureLabel>Cancellation</FeatureLabel>
            {plans.map(p => (
              <td key={p.id} className={TD}>
                Any time before next annual date
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Membership Hold</FeatureLabel>
            {plans.map(p => (
              <td key={p.id} className={TD}>
                Up to 8 weeks/year · {money(5, currency)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>

    <div className="flex items-center gap-2 text-sm font-bold text-navy" style={{ marginBottom: 10 }}>
      <span className="h-[7px] w-[7px] rounded-full bg-cmx-blue" />
      Slot Booking Limits (per fortnightly cycle — same as fortnightly plan)
    </div>
    <div className="overflow-x-auto rounded-[10px] border border-cmx-border bg-white" style={{ marginBottom: 20 }}>
      <table className="w-full border-collapse text-[13px]">
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
              <td key={p.id} className={TD}>
                {p.dailyBookingLimit} per day
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Carryover per cycle</FeatureLabel>
            {plans.map(p => (
              <td key={p.id} className={TD}>
                {p.carryover > 0 ? `Up to ${p.carryover} unused → next cycle` : <Pill tone="gray">No</Pill>}
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Max active future bookings</FeatureLabel>
            {plans.map(p => (
              <td key={p.id} className={TD}>
                {p.maxFutureBookings}
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Advance booking window</FeatureLabel>
            {plans.map(p => (
              <td key={p.id} className={TD}>
                {p.advanceWindowDays} days
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Extra session purchase</FeatureLabel>
            {plans.map(p => (
              <td key={p.id} className={TD}>
                <span
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-500"
                  title="Extra session purchase is not available on annual plans"
                >
                  <svg fill="none" height={11} stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" width={11}>
                    <line x1="5" x2="19" y1="12" y2="12" />
                  </svg>
                  Not available
                </span>
              </td>
            ))}
          </tr>
          <tr>
            <FeatureLabel>Peak hours access</FeatureLabel>
            {plans.map(p => (
              <td key={p.id} className={TD}>
                {p.peakAccess ? <Pill tone="green">Yes</Pill> : <Pill tone="red">No</Pill>}
              </td>
            ))}
          </tr>
          <tr>
            <td className={TD} />
            {plans.map(p => (
              <td key={p.id} className={TD}>
                <button
                  className="inline-flex cursor-pointer items-center gap-[5px] rounded-[7px] border border-cmx-border bg-white px-3 py-1.5 text-[12.5px] font-semibold text-sub transition-all hover:bg-gray-50"
                  style={{ fontSize: 11, padding: '4px 9px' }}
                  type="button"
                  onClick={() => onEdit?.(p)}
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

/* ── TAB: Booking & Access (per-plan rules from the API) ─────────────────── */

// Flatten a nested object one-or-more levels into dotted-key → scalar pairs, so
// bookingRules.generalBookingRules (including nested bookingCarryOver) renders as
// a flat set of rows. Null/undefined values and arrays are skipped.
const flattenScalars = (obj: Record<string, unknown> | undefined, prefix = ''): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  Object.entries(obj ?? {}).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    if (typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenScalars(v as Record<string, unknown>, `${prefix}${k}.`));
    } else if (typeof v !== 'object') {
      out[`${prefix}${k}`] = v;
    }
  });
  return out;
};

const BookingAccessTab: React.FC<{ plans: MembershipPlan[] }> = ({ plans }) => {
  // Read each plan's booking rules straight from the API-loaded raw membership.
  const rows = plans.map(p => ({
    plan: p,
    flat: flattenScalars(
      (p._raw?.bookingRules as { generalBookingRules?: Record<string, unknown> } | undefined)?.generalBookingRules
    ),
  }));

  // Union of all rule keys across plans, in first-seen order → table rows.
  const keys: string[] = [];
  rows.forEach(r => Object.keys(r.flat).forEach(k => !keys.includes(k) && keys.push(k)));

  if (plans.length === 0 || keys.length === 0) {
    return (
      <div className="rounded-xl border border-cmx-border bg-white px-6 py-14 text-center text-sub">
        <div className="text-sm font-bold text-navy">No booking rules configuration available.</div>
      </div>
    );
  }

  const fmt = (v: unknown): string => (typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v));

  const th =
    'border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub';

  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-bold text-navy" style={{ marginBottom: 12 }}>
        <span className="h-[7px] w-[7px] rounded-full bg-cmx-blue" />
        Booking Rules (per plan)
      </div>
      <div className="overflow-x-auto rounded-[10px] border border-cmx-border bg-white" style={{ marginBottom: 20 }}>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className={th}>Rule</th>
              {rows.map(r => (
                <th key={r.plan.id} className={th}>
                  {r.plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map(k => (
              <tr key={k}>
                <FeatureLabel>{humanizeKey(k)}</FeatureLabel>
                {rows.map(r => (
                  <td key={r.plan.id} className={TD}>
                    {r.flat[k] === undefined ? '—' : fmt(r.flat[k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ── TAB: Guest Charges (network defaults) ───────────────────────────────── */

// camelCase/underscore/dotted key path → readable label, e.g.
// "firstGuestFee" → "First Guest Fee";
// "bookingCarryOver.maxAccumulated" → "Booking Carry Over · Max Accumulated".
const humanizeKey = (key: string): string =>
  key
    .split('.')
    .map(seg =>
      seg
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]+/g, ' ')
        // Backend field is misspelled "Frothnightly" — show it correctly.
        .replace(/frothnightly/i, 'fortnightly')
        .replace(/\bPct\b/i, '(%)')
        .replace(/^./, c => c.toUpperCase())
        .trim()
    )
    .join(' · ');

/** Guest booking rules as returned under bookingRules.guestBookingRules. */
interface GuestRules {
  maxGuestsPerSlot?: number;
  pricing?: {
    firstGuest?: number;
    additionalGuests?: { type?: string; discount?: number };
  };
  guestAdditionTiming?: string;
  adultGuestDocumentation?: string;
  juniorGuestDocumentation?: string;
  [key: string]: unknown;
}

const GuestChargesTab: React.FC<{ plans: MembershipPlan[]; currency: CurrencyOption }> = ({ plans, currency }) => {
  const num = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  // A present value → String; otherwise the descriptive fallback for that feature.
  const str = (v: unknown, fallback: string): string =>
    v === null || v === undefined || v === '' ? fallback : String(v);

  // Network-wide guest rules from the API-loaded plans (guest rules are the same
  // across plans, so the first plan that carries them wins).
  const guest = plans
    .map(p => (p._raw?.bookingRules as { guestBookingRules?: GuestRules } | undefined)?.guestBookingRules)
    .find(g => g && Object.keys(g).length > 0) as GuestRules | undefined;

  if (!guest) {
    return (
      <div className="rounded-xl border border-cmx-border bg-white px-6 py-14 text-center text-sub">
        <div className="text-sm font-bold text-navy">No guest charge configuration available.</div>
      </div>
    );
  }

  const pricing = guest.pricing ?? {};
  const addl = pricing.additionalGuests ?? {};
  const discountValue =
    addl.discount === null || addl.discount === undefined
      ? '—'
      : addl.type === 'percentage'
        ? `${num(addl.discount)}% off`
        : money(num(addl.discount), currency);

  // Feature rows. "networkDefault" is pulled from the API where the field exists;
  // the "configurable" flag + "notes" are descriptive copy for each feature (not
  // membership data). Rows the API doesn't carry fall back to a sensible default.
  const rows: { feature: string; networkDefault: string; configurable: boolean; notes: string }[] = [
    {
      feature: 'First Guest Fee',
      networkDefault:
        pricing.firstGuest === null || pricing.firstGuest === undefined
          ? '—'
          : money(num(pricing.firstGuest), currency),
      configurable: true,
      notes: "Charged to the member's account when they bring a guest",
    },
    {
      feature: 'Additional Guest Discount',
      networkDefault: discountValue,
      configurable: true,
      notes: 'Applied to 2nd and 3rd guest fees',
    },
    {
      feature: 'Max Guests per Slot',
      networkDefault:
        guest.maxGuestsPerSlot === null || guest.maxGuestsPerSlot === undefined ? '—' : String(guest.maxGuestsPerSlot),
      configurable: false,
      notes: 'Network-wide limit, not overridable',
    },
    {
      feature: 'Guest Addition Timing',
      networkDefault: str(guest.guestAdditionTiming, 'Until slot start'),
      configurable: false,
      notes: 'Guests can be added right up to the start of the booking',
    },
    {
      feature: 'Adult Guest Documentation',
      networkDefault: str(guest.adultGuestDocumentation, 'Name + email or phone'),
      configurable: false,
      notes: 'System generates a temporary guest ID',
    },
    {
      feature: 'Junior Guest Documentation',
      networkDefault: str(guest.juniorGuestDocumentation, 'Guardian details + ID proof'),
      configurable: false,
      notes: 'Guardian must be 18+; registered guardian relationship required',
    },
  ];

  const th =
    'border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub';

  return (
    <div className="overflow-x-auto rounded-[10px] border border-cmx-border bg-white">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className={th}>Feature</th>
            <th className={th}>Network Default</th>
            <th className={th}>Configurable Per Centre?</th>
            <th className={th}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.feature}>
              <FeatureLabel>{r.feature}</FeatureLabel>
              <td className={`${TD} font-bold text-navy`}>{r.networkDefault}</td>
              <td className={TD}>
                <Pill tone={r.configurable ? 'green' : 'gray'}>{r.configurable ? 'Yes' : 'No'}</Pill>
              </td>
              <td className={`${TD} text-sub`}>{r.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MembershipPlans;
