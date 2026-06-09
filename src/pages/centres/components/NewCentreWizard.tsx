import React, { useMemo, useRef, useState } from 'react';

import { toast } from 'react-hot-toast';

import {
  COUNTRIES,
  DAYS,
  DEMOGRAPHICS,
  FACILITY_OPTIONS,
  PLAN_CATALOGUE,
  SLOT_DURATIONS,
  TIMEZONES,
} from '../constants';
import { commitWizard, saveWizardStep, startWizard } from '../useCentres';

import AdditionalFacilitiesStep from './AdditionalFacilitiesStep';
import AllocationBar from './AllocationBar';

import type { CentreDiscount, WizardPlanRow, WizardState } from '../types';

const STEPS = ['Details', 'Facilities', 'Add. Facilities', 'Plans & Pricing', 'Review'];

const PLAN_COUNTRY_CHIPS = [
  { code: 'all', label: '🌐 All countries' },
  { code: 'US', label: '🇺🇸 USA' },
  { code: 'AU', label: '🇦🇺 Australia' },
  { code: 'IN', label: '🇮🇳 India' },
  { code: 'UK', label: '🇬🇧 UK' },
  { code: 'NZ', label: '🇳🇿 New Zealand' },
  { code: 'ZA', label: '🇿🇦 South Africa' },
];

// Toggle a country chip: picking 'all' clears specifics; picking a specific clears 'all'.
const toggleCountry = (current: string[], code: string): string[] => {
  if (code === 'all') return ['all'];
  const next = current.filter(c => c !== 'all');
  const out = next.includes(code) ? next.filter(c => c !== code) : [...next, code];
  return out.length ? out : ['all'];
};

const makePlanRows = (): WizardPlanRow[] =>
  PLAN_CATALOGUE.map(p => ({
    planId: p.id,
    enabled: false,
    fortnightlyPrice: p.fortnightly,
    annualPrice: p.annual,
    allocatedSlots: p.defaultSlots,
    joiningFee: 0,
    memberCap: p.defaultSlots,
    isFoundationEligible: p.defaultFoundation,
    availableCountries: ['all'],
    firstGuestFee: 30,
    additionalGuestDiscountPct: 20,
    extraSessionCost: 30,
  }));

const initialState = (): WizardState => ({
  wizardId: null,
  name: '',
  shortCode: '',
  status: 'draft',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postcode: '',
  country: '',
  timezone: '',
  phone: '',
  email: '',
  is24x7: false,
  operatingHours: DAYS.map((_, day) => ({
    day,
    openTime: day >= 5 ? '08:00' : '06:00',
    closeTime: day >= 5 ? '20:00' : '23:00',
    isOpen: true,
  })),
  overallCapacity: '',
  foundationPool: '',
  battingLanes: 4,
  bowlingLanes: 1,
  multipurposeLanes: 1,
  facilities: ['Batting Lanes', 'Bowling Lanes'],
  slotDurationMinutes: 45,
  advanceBookingWindowDays: 7,
  additionalFacilities: [],
  plans: makePlanRows(),
  firstGuestFee: 30,
  additionalGuestDiscountPct: 20,
  extraSessionCost: 30,
  discounts: [],
});

// Auto-generate short code: first 3 letters of city + 001 (e.g. DAL001).
const genShortCode = (city: string): string => {
  const letters = city.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (!letters) return '';
  return `${letters.substring(0, 3)}001`;
};

const SHORT_CODE_RE = /^[A-Z0-9]{3,6}$/;
const toNum = (v: number | '') => (v === '' ? 0 : Number(v));

interface Props {
  onClose: () => void;
  onSaved: (activated: boolean) => void;
}

const NewCentreWizard: React.FC<Props> = ({ onClose, onSaved }) => {
  const [step, setStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [demo, setDemo] = useState('all');
  const [s, setS] = useState<WizardState>(initialState);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const set = (patch: Partial<WizardState>) => setS(prev => ({ ...prev, ...patch }));

  // ── Derived ──
  const capacity = toNum(s.overallCapacity);
  const foundation = toNum(s.foundationPool);
  const normalPool = Math.max(capacity - foundation, 0);
  const allocatedTotal = s.plans.filter(p => p.enabled).reduce((sum, p) => sum + (Number(p.allocatedSlots) || 0), 0);
  const overAllocated = capacity > 0 && allocatedTotal > capacity;
  const foundationOverflow = foundation > capacity && capacity > 0;

  const shortCodeValid = !s.shortCode || SHORT_CODE_RE.test(s.shortCode);

  // ── Per-step validation ──
  const stepValid = (n: number): boolean => {
    switch (n) {
      case 1:
        return Boolean(
          s.name.trim() &&
          s.shortCode.trim() &&
          shortCodeValid &&
          s.addressLine1.trim() &&
          s.city.trim() &&
          s.postcode.trim() &&
          s.country &&
          s.timezone &&
          s.phone.trim() &&
          s.email.trim() &&
          // closeTime must differ from openTime per open day (overnight allowed)
          (s.is24x7 || s.operatingHours.every(h => !h.isOpen || h.openTime !== h.closeTime))
        );
      case 2:
        return capacity > 0 && !foundationOverflow && toNum(s.battingLanes) >= 0 && toNum(s.bowlingLanes) >= 0;
      case 3:
        return true; // optional
      case 4:
        return s.plans.some(p => p.enabled) && !overAllocated;
      default:
        return true;
    }
  };

  const goStep = async (n: number) => {
    // Moving forward requires the current step to be valid.
    if (n > step && !stepValid(step)) {
      setShowErrors(true);
      toast.error('Please complete the required fields before continuing.');
      return;
    }
    setShowErrors(false);
    // Best-effort persist of the step we are leaving.
    if (n > step) {
      let id = s.wizardId;
      if (!id) {
        id = await startWizard();
        if (id) set({ wizardId: id });
      }
      saveWizardStep(id, step, s);
    }
    setStep(n);
    setMaxStepReached(m => Math.max(m, n));
  };

  // ── Field helpers ──
  const onNameChange = (name: string) => {
    // Auto-generate the short code from the centre name (city heuristic) until
    // the user edits it manually.
    const cityGuess = name.replace(/^.*[—-]\s*/, '').trim() || name;
    set({
      name,
      shortCode:
        s.shortCode && s.shortCode !== genShortCode(prevCityRef.current) ? s.shortCode : genShortCode(cityGuess),
    });
    prevCityRef.current = cityGuess;
  };
  const prevCityRef = useRef('');

  const toggleFacility = (f: string) =>
    set({ facilities: s.facilities.includes(f) ? s.facilities.filter(x => x !== f) : [...s.facilities, f] });

  const setHour = (day: number, patch: Partial<{ openTime: string; closeTime: string; isOpen: boolean }>) =>
    set({ operatingHours: s.operatingHours.map(h => (h.day === day ? { ...h, ...patch } : h)) });

  const setPlan = (planId: string, patch: Partial<WizardPlanRow>) =>
    set({ plans: s.plans.map(p => (p.planId === planId ? { ...p, ...patch } : p)) });

  const addDiscount = () => {
    const d: CentreDiscount = {
      id: `disc-${Date.now()}`,
      name: '',
      type: 'percentage',
      value: 0,
      appliesTo: 'All plans',
      promoCode: '',
    };
    set({ discounts: [...s.discounts, d] });
  };

  const visiblePlans = useMemo(() => {
    if (demo === 'all') return PLAN_CATALOGUE;
    return PLAN_CATALOGUE.filter(p => p.demographics.includes(demo));
  }, [demo]);

  const save = async (activate: boolean) => {
    if (!stepValid(4)) {
      toast.error('Resolve plan & capacity validation before saving.');
      setStep(4);
      return;
    }
    setSaving(true);
    const finalState: WizardState = { ...s, status: activate ? 'active' : 'draft' };
    const ok = await commitWizard(finalState, activate);
    setSaving(false);
    if (ok) {
      toast.success(activate ? 'Centre submitted for activation (staging).' : 'Centre saved as draft.');
      onSaved(activate);
    } else {
      toast.error('Could not save the centre. Please try again.');
    }
  };

  const err = (cond: boolean) => (showErrors && cond ? { borderColor: '#dc2626' } : undefined);

  return (
    <>
      <div
        aria-label="Close wizard"
        className="cmx-overlay"
        role="button"
        tabIndex={-1}
        onClick={onClose}
        onKeyDown={e => {
          if (e.key === 'Escape') onClose();
        }}
      />
      <div aria-label="New Centre wizard" className="cmx-drawer" role="dialog">
        {/* Header */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: '#fff',
            borderBottom: '1px solid var(--border)',
            padding: '18px 26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>New Centre</div>
            <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 2 }}>
              Complete all steps to create and activate the centre
            </div>
          </div>
          <button
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: '#fff',
              cursor: 'pointer',
              color: 'var(--sub)',
              fontSize: 18,
            }}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Step pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 26px',
            borderBottom: '1px solid var(--border)',
            background: '#f9fafb',
            overflowX: 'auto',
          }}
        >
          {STEPS.map((label, i) => {
            const n = i + 1;
            const cls = n === step ? 'active' : n < step ? 'done' : '';
            return (
              <React.Fragment key={label}>
                <button
                  className={`cmx-step-pill ${cls}`}
                  type="button"
                  onClick={() => (n <= maxStepReached ? setStep(n) : goStep(n))}
                >
                  {n} · {label}
                </button>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, minWidth: 8, height: 2, background: 'var(--border)', margin: '0 4px' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ padding: 26 }}>
          {/* ══ STEP 1 ══ */}
          {step === 1 && (
            <div>
              <div className="cmx-eyebrow" style={{ marginBottom: 14 }}>
                Centre Identity
              </div>
              <div className="cmx-ff" style={{ marginBottom: 14 }}>
                <span className="cmx-fld-lbl">Centre Name *</span>
                <input
                  placeholder="e.g. Century Cricket Centre — Dallas"
                  style={err(!s.name.trim())}
                  type="text"
                  value={s.name}
                  onChange={e => onNameChange(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">Short Code *</span>
                  <input
                    maxLength={6}
                    placeholder="e.g. DAL001"
                    style={{ textTransform: 'uppercase', ...(err(!shortCodeValid || !s.shortCode) || {}) }}
                    type="text"
                    value={s.shortCode}
                    onChange={e => set({ shortCode: e.target.value.toUpperCase() })}
                  />
                  <div className="cmx-hint">
                    Used in booking references. 3–6 uppercase letters/numbers. Immutable after activation.
                  </div>
                  {showErrors && s.shortCode && !shortCodeValid && (
                    <div style={{ fontSize: 11, color: '#dc2626' }}>Must be 3–6 uppercase letters/numbers.</div>
                  )}
                </div>
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">Status</span>
                  <select value={s.status} onChange={e => set({ status: e.target.value as 'draft' | 'active' })}>
                    <option value="draft">Draft (not visible to members)</option>
                    <option value="active">Active (go live immediately)</option>
                  </select>
                </div>
              </div>

              <div className="cmx-eyebrow" style={{ margin: '20px 0 14px' }}>
                Address
              </div>
              <div className="cmx-ff" style={{ marginBottom: 14 }}>
                <span className="cmx-fld-lbl">Address Line 1 *</span>
                <input
                  placeholder="Street address"
                  style={err(!s.addressLine1.trim())}
                  type="text"
                  value={s.addressLine1}
                  onChange={e => set({ addressLine1: e.target.value })}
                />
              </div>
              <div className="cmx-ff" style={{ marginBottom: 14 }}>
                <span className="cmx-fld-lbl">Address Line 2</span>
                <input
                  placeholder="Suite, unit, floor (optional)"
                  type="text"
                  value={s.addressLine2}
                  onChange={e => set({ addressLine2: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">City *</span>
                  <input
                    placeholder="e.g. Dallas"
                    style={err(!s.city.trim())}
                    type="text"
                    value={s.city}
                    onChange={e => set({ city: e.target.value })}
                  />
                </div>
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">State / Province</span>
                  <input
                    placeholder="e.g. TX"
                    type="text"
                    value={s.state}
                    onChange={e => set({ state: e.target.value })}
                  />
                </div>
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">Postcode *</span>
                  <input
                    placeholder="e.g. 75201"
                    style={err(!s.postcode.trim())}
                    type="text"
                    value={s.postcode}
                    onChange={e => set({ postcode: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">Country *</span>
                  <select style={err(!s.country)} value={s.country} onChange={e => set({ country: e.target.value })}>
                    <option value="">Select country…</option>
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">Time Zone *</span>
                  <select style={err(!s.timezone)} value={s.timezone} onChange={e => set({ timezone: e.target.value })}>
                    <option value="">Select timezone…</option>
                    {TIMEZONES.map(tz => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="cmx-eyebrow" style={{ margin: '20px 0 14px' }}>
                Contact
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">Phone *</span>
                  <input
                    placeholder="+1 555 000 0000"
                    style={err(!s.phone.trim())}
                    type="tel"
                    value={s.phone}
                    onChange={e => set({ phone: e.target.value })}
                  />
                </div>
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">Email *</span>
                  <input
                    placeholder="dallas@centurycricket.com"
                    style={err(!s.email.trim())}
                    type="email"
                    value={s.email}
                    onChange={e => set({ email: e.target.value })}
                  />
                </div>
              </div>

              <div className="cmx-eyebrow" style={{ margin: '20px 0 14px' }}>
                Operating Hours
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: '#e6f4f4',
                  border: '1px solid #99d9d8',
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#006e6c' }}>Open 24/7</div>
                  <div style={{ fontSize: 11, color: '#008482', marginTop: 2 }}>
                    Centre operates around the clock — no closing hours
                  </div>
                </div>
                <label className="cmx-toggle green">
                  <input
                    aria-label="Open 24/7"
                    checked={s.is24x7}
                    type="checkbox"
                    onChange={e => set({ is24x7: e.target.checked })}
                  />
                  <span className="track">
                    <span className="knob" />
                  </span>
                </label>
              </div>

              {!s.is24x7 && (
                <div
                  style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '100px 1fr 1fr 60px',
                      background: '#f9fafb',
                      padding: '8px 14px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--sub)',
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                    }}
                  >
                    <div>Day</div>
                    <div>Open</div>
                    <div>Close</div>
                    <div>Open?</div>
                  </div>
                  {s.operatingHours.map((h, i) => (
                    <div
                      key={h.day}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '100px 1fr 1fr 60px',
                        padding: '8px 14px',
                        borderTop: '1px solid var(--border)',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>{DAYS[i]}</div>
                      <div style={{ paddingRight: 10 }}>
                        <input
                          disabled={!h.isOpen}
                          style={{
                            width: '100%',
                            padding: '5px 8px',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            fontSize: 12.5,
                            opacity: h.isOpen ? 1 : 0.4,
                          }}
                          type="time"
                          value={h.openTime}
                          onChange={e => setHour(h.day, { openTime: e.target.value })}
                        />
                      </div>
                      <div style={{ paddingRight: 10 }}>
                        <input
                          disabled={!h.isOpen}
                          style={{
                            width: '100%',
                            padding: '5px 8px',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            fontSize: 12.5,
                            opacity: h.isOpen ? 1 : 0.4,
                          }}
                          type="time"
                          value={h.closeTime}
                          onChange={e => setHour(h.day, { closeTime: e.target.value })}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <label className="cmx-toggle green">
                          <input
                            aria-label={`${DAYS[i]} open`}
                            checked={h.isOpen}
                            type="checkbox"
                            onChange={e => setHour(h.day, { isOpen: e.target.checked })}
                          />
                          <span className="track">
                            <span className="knob" />
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="cmx-btn cmx-btn-navy" onClick={() => goStep(2)}>
                  Next: Facilities →
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 2 ══ */}
          {step === 2 && (
            <div>
              <div className="cmx-eyebrow" style={{ marginBottom: 14 }}>
                Overall Capacity
              </div>
              <div className="cmx-note" style={{ marginBottom: 16 }}>
                Overall capacity is the total number of concurrent member slots for this centre. Per-plan allocations
                are set in step 4 and must not exceed this total.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">Overall Capacity (total slots) *</span>
                  <input
                    min={1}
                    placeholder="e.g. 450"
                    style={err(capacity <= 0)}
                    type="number"
                    value={s.overallCapacity}
                    onChange={e => set({ overallCapacity: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                </div>
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">Foundation Membership Pool</span>
                  <input
                    min={0}
                    placeholder="e.g. 100"
                    style={err(foundationOverflow)}
                    type="number"
                    value={s.foundationPool}
                    onChange={e => set({ foundationPool: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                  <div className="cmx-hint">
                    Subset of overall capacity reserved for foundation members. Leave blank if N/A.
                  </div>
                  {foundationOverflow && (
                    <div style={{ fontSize: 11, color: '#dc2626' }}>
                      Foundation pool cannot exceed overall capacity.
                    </div>
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>
                    Capacity Overview
                  </div>
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
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">Batting Lanes *</span>
                  <input
                    min={0}
                    type="number"
                    value={s.battingLanes}
                    onChange={e => set({ battingLanes: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                </div>
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">Bowling Lanes *</span>
                  <input
                    min={0}
                    type="number"
                    value={s.bowlingLanes}
                    onChange={e => set({ bowlingLanes: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                </div>
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">Multi-purpose Lanes</span>
                  <input
                    min={0}
                    type="number"
                    value={s.multipurposeLanes}
                    onChange={e => set({ multipurposeLanes: e.target.value === '' ? '' : Number(e.target.value) })}
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
                    <label key={f} className={`cmx-check-chip ${on ? 'on' : ''}`}>
                      <input checked={on} type="checkbox" onChange={() => toggleFacility(f)} /> {f}
                    </label>
                  );
                })}
              </div>

              <div className="cmx-eyebrow" style={{ marginBottom: 14 }}>
                Slot Configuration
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">Slot Duration (minutes) *</span>
                  <select
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
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">Advance Booking Window (days)</span>
                  <input
                    max={30}
                    min={1}
                    type="number"
                    value={s.advanceBookingWindowDays}
                    onChange={e => set({ advanceBookingWindowDays: Number(e.target.value) })}
                  />
                  <div className="cmx-hint">Network default: 7 days</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="cmx-btn cmx-btn-outline" onClick={() => goStep(1)}>
                  ← Back
                </button>
                <button className="cmx-btn cmx-btn-navy" onClick={() => goStep(3)}>
                  Next: Add. Facilities →
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 3 ══ */}
          {step === 3 && (
            <div>
              <AdditionalFacilitiesStep
                facilities={s.additionalFacilities}
                onChange={next => set({ additionalFacilities: next })}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <button className="cmx-btn cmx-btn-outline" onClick={() => goStep(2)}>
                  ← Back
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="cmx-btn cmx-btn-outline" style={{ color: 'var(--sub)' }} onClick={() => goStep(5)}>
                    Skip to Review →
                  </button>
                  <button className="cmx-btn cmx-btn-navy" onClick={() => goStep(4)}>
                    Next: Plans & Pricing →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ STEP 4 ══ */}
          {step === 4 && (
            <div>
              <div className="cmx-note" style={{ marginBottom: 16 }}>
                Select which global plans to offer at this centre. Set the local price and allocate capacity slots for
                each. The sum of allocated slots must not exceed the overall centre capacity.
              </div>

              {/* Demographic filter */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                  padding: '12px 14px',
                  background: '#f9fafb',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  marginBottom: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--sub)',
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                    }}
                  >
                    Filter by demographic:
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {DEMOGRAPHICS.map(d => (
                      <button
                        key={d.key}
                        className={`cmx-demo-btn ${demo === d.key ? 'active' : ''}`}
                        type="button"
                        onClick={() => setDemo(d.key)}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--sub)' }}>
                  Showing {visiblePlans.length} plan{visiblePlans.length === 1 ? '' : 's'}
                </div>
              </div>

              {/* Plan rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {PLAN_CATALOGUE.map(meta => {
                  const row = s.plans.find(p => p.planId === meta.id);
                  const visible = visiblePlans.some(p => p.id === meta.id);
                  if (!visible || !row) return null;
                  return (
                    <div
                      key={meta.id}
                      style={{
                        border: `2px solid ${row.enabled ? meta.colour : 'var(--border)'}`,
                        borderRadius: 10,
                        padding: '14px 16px',
                        background: '#fff',
                        transition: 'border-color .15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                          <input
                            checked={row.enabled}
                            style={{ width: 16, height: 16, accentColor: meta.colour }}
                            type="checkbox"
                            onChange={e => setPlan(meta.id, { enabled: e.target.checked })}
                          />
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: meta.colour,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{meta.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--sub)' }}>· {meta.access}</span>
                        </label>
                        <div style={{ fontSize: 12, color: 'var(--sub)' }}>
                          Fortnightly: ${meta.fortnightly} · Annual: ${meta.annual.toLocaleString()}
                        </div>
                      </div>

                      {row.enabled && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr 1fr 1fr',
                              gap: 12,
                              alignItems: 'end',
                            }}
                          >
                            <div className="cmx-ff">
                              <span className="cmx-fld-lbl">Fortnightly Price *</span>
                              <input
                                min={0}
                                step={0.01}
                                type="number"
                                value={row.fortnightlyPrice}
                                onChange={e => setPlan(meta.id, { fortnightlyPrice: Number(e.target.value) })}
                              />
                            </div>
                            <div className="cmx-ff">
                              <span className="cmx-fld-lbl">Annual Price</span>
                              <input
                                min={0}
                                step={0.01}
                                type="number"
                                value={row.annualPrice}
                                onChange={e => setPlan(meta.id, { annualPrice: Number(e.target.value) })}
                              />
                            </div>
                            <div className="cmx-ff">
                              <span className="cmx-fld-lbl">Allocated Slots *</span>
                              <input
                                min={1}
                                type="number"
                                value={row.allocatedSlots}
                                onChange={e => setPlan(meta.id, { allocatedSlots: Number(e.target.value) })}
                              />
                            </div>
                            <div className="cmx-ff">
                              <span className="cmx-fld-lbl">Foundation Eligible</span>
                              <select
                                value={row.isFoundationEligible ? 'yes' : 'no'}
                                onChange={e => setPlan(meta.id, { isFoundationEligible: e.target.value === 'yes' })}
                              >
                                <option value="yes">Yes — included</option>
                                <option value="no">No — not included</option>
                              </select>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 10 }}>
                            <div className="cmx-ff">
                              <span className="cmx-fld-lbl">Member Cap</span>
                              <input
                                min={1}
                                placeholder="Blank = plan cap"
                                type="number"
                                value={row.memberCap ?? ''}
                                onChange={e =>
                                  setPlan(meta.id, { memberCap: e.target.value === '' ? null : Number(e.target.value) })
                                }
                              />
                            </div>
                            <div className="cmx-ff">
                              <span className="cmx-fld-lbl">First Guest Fee (USD)</span>
                              <input
                                min={0}
                                step={0.01}
                                type="number"
                                value={row.firstGuestFee}
                                onChange={e => setPlan(meta.id, { firstGuestFee: Number(e.target.value) })}
                              />
                            </div>
                            <div className="cmx-ff">
                              <span className="cmx-fld-lbl">Add. Guest Discount (%)</span>
                              <input
                                max={100}
                                min={0}
                                type="number"
                                value={row.additionalGuestDiscountPct}
                                onChange={e => setPlan(meta.id, { additionalGuestDiscountPct: Number(e.target.value) })}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                            <div className="cmx-ff">
                              <span className="cmx-fld-lbl">Extra Session Cost (USD)</span>
                              <input
                                min={0}
                                step={0.01}
                                type="number"
                                value={row.extraSessionCost}
                                onChange={e => setPlan(meta.id, { extraSessionCost: Number(e.target.value) })}
                              />
                            </div>
                            <div className="cmx-ff">
                              <span className="cmx-fld-lbl">Joining Fee (USD)</span>
                              <input
                                min={0}
                                placeholder="0 = no joining fee"
                                step={0.01}
                                type="number"
                                value={row.joiningFee}
                                onChange={e => setPlan(meta.id, { joiningFee: Number(e.target.value) })}
                              />
                            </div>
                          </div>
                          <div style={{ marginTop: 10 }}>
                            <span className="cmx-fld-lbl">Available in</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                              {PLAN_COUNTRY_CHIPS.map(c => {
                                const active = row.availableCountries.includes(c.code);
                                return (
                                  <button
                                    key={c.code}
                                    className={`cmx-country-chip ${active ? 'active' : ''}`}
                                    type="button"
                                    onClick={() =>
                                      setPlan(meta.id, {
                                        availableCountries: toggleCountry(row.availableCountries, c.code),
                                      })
                                    }
                                  >
                                    {c.label}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="cmx-hint">
                              Select specific countries or keep &quot;All countries&quot; to offer this plan everywhere.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Live allocation bar */}
              <div style={{ marginBottom: 20 }}>
                <AllocationBar capacity={capacity} plans={s.plans} />
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 20px' }} />

              <div className="cmx-eyebrow" style={{ marginBottom: 14 }}>
                Guest & Extra Session Pricing (centre defaults)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">First Guest Fee (USD) *</span>
                  <input
                    min={0}
                    step={0.01}
                    type="number"
                    value={s.firstGuestFee}
                    onChange={e => set({ firstGuestFee: Number(e.target.value) })}
                  />
                  <div className="cmx-hint">Network default: $30</div>
                </div>
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">Additional Guest Discount (%)</span>
                  <input
                    max={100}
                    min={0}
                    type="number"
                    value={s.additionalGuestDiscountPct}
                    onChange={e => set({ additionalGuestDiscountPct: Number(e.target.value) })}
                  />
                  <div className="cmx-hint">Network default: 20%</div>
                </div>
                <div className="cmx-ff">
                  <span className="cmx-fld-lbl">Extra Session Cost (USD)</span>
                  <input
                    min={0}
                    step={0.01}
                    type="number"
                    value={s.extraSessionCost}
                    onChange={e => set({ extraSessionCost: Number(e.target.value) })}
                  />
                  <div className="cmx-hint">Configurable per centre</div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 20px' }} />

              <div className="cmx-eyebrow" style={{ marginBottom: 6 }}>
                Centre Discounts
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--sub)', marginBottom: 12 }}>
                Optional — add centre-specific discounts.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {s.discounts.map(d => (
                  <div
                    key={d.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '14px 16px',
                      position: 'relative',
                    }}
                  >
                    <button
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 12,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--muted)',
                        fontSize: 16,
                      }}
                      type="button"
                      onClick={() => set({ discounts: s.discounts.filter(x => x.id !== d.id) })}
                    >
                      ×
                    </button>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                      <div className="cmx-ff">
                        <span className="cmx-fld-lbl">Discount Name *</span>
                        <input
                          placeholder="e.g. Senior Concession"
                          type="text"
                          value={d.name}
                          onChange={e =>
                            set({
                              discounts: s.discounts.map(x => (x.id === d.id ? { ...x, name: e.target.value } : x)),
                            })
                          }
                        />
                      </div>
                      <div className="cmx-ff">
                        <span className="cmx-fld-lbl">Type *</span>
                        <select
                          value={d.type}
                          onChange={e =>
                            set({
                              discounts: s.discounts.map(x =>
                                x.id === d.id ? { ...x, type: e.target.value as CentreDiscount['type'] } : x
                              ),
                            })
                          }
                        >
                          <option value="percentage">Percentage off</option>
                          <option value="fixed">Fixed amount off</option>
                          <option value="free_sessions">Free sessions</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <div className="cmx-ff">
                        <span className="cmx-fld-lbl">Value</span>
                        <input
                          min={0}
                          type="number"
                          value={d.value}
                          onChange={e =>
                            set({
                              discounts: s.discounts.map(x =>
                                x.id === d.id ? { ...x, value: Number(e.target.value) } : x
                              ),
                            })
                          }
                        />
                      </div>
                      <div className="cmx-ff">
                        <span className="cmx-fld-lbl">Applies To</span>
                        <input
                          type="text"
                          value={d.appliesTo}
                          onChange={e =>
                            set({
                              discounts: s.discounts.map(x =>
                                x.id === d.id ? { ...x, appliesTo: e.target.value } : x
                              ),
                            })
                          }
                        />
                      </div>
                      <div className="cmx-ff">
                        <span className="cmx-fld-lbl">Promo Code</span>
                        <input
                          placeholder="OPTIONAL"
                          type="text"
                          value={d.promoCode}
                          onChange={e =>
                            set({
                              discounts: s.discounts.map(x =>
                                x.id === d.id ? { ...x, promoCode: e.target.value.toUpperCase() } : x
                              ),
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                style={{
                  width: '100%',
                  padding: 10,
                  border: '2px dashed var(--border)',
                  borderRadius: 10,
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--sub)',
                  fontWeight: 500,
                }}
                type="button"
                onClick={addDiscount}
              >
                + Add Discount
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button className="cmx-btn cmx-btn-outline" onClick={() => goStep(3)}>
                  ← Back
                </button>
                <button className="cmx-btn cmx-btn-navy" onClick={() => goStep(5)}>
                  Next: Review →
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 5 ══ */}
          {step === 5 && (
            <div>
              <div className="cmx-eyebrow" style={{ marginBottom: 14 }}>
                Review Centre Configuration
              </div>

              <ReviewCard title="Centre Details" onEdit={() => setStep(1)}>
                <ReviewGrid
                  rows={[
                    ['Name', s.name || '—'],
                    ['Short Code', s.shortCode || '—'],
                    ['Status', s.status],
                    ['Address', [s.addressLine1, s.city, s.state, s.postcode].filter(Boolean).join(', ') || '—'],
                    ['Country', COUNTRIES.find(c => c.code === s.country)?.label || '—'],
                    ['Timezone', s.timezone || '—'],
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

              {/* Activation warning */}
              <div
                style={{
                  border: '1px solid #fde68a',
                  background: '#fffbeb',
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
                  Two-stage activation
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#92400e', lineHeight: 1.7 }}>
                  <li>
                    <strong>Save as Draft</strong> → status becomes <em>draft</em>. No notifications sent.
                  </li>
                  <li>
                    <strong>Save &amp; Activate</strong> → status becomes <em>staging</em>, DevOps is notified. The
                    centre is <strong>not live</strong> until deployment.
                  </li>
                  <li>
                    After DevOps deploys → status becomes <em>active</em> and the centre is visible to members.
                  </li>
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <button className="cmx-btn cmx-btn-outline" onClick={() => goStep(4)}>
                  ← Back
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="cmx-btn cmx-btn-outline" disabled={saving} onClick={() => save(false)}>
                    Save as Draft
                  </button>
                  <button
                    className="cmx-btn cmx-btn-navy"
                    disabled={saving}
                    style={{ padding: '8px 20px' }}
                    onClick={() => save(true)}
                  >
                    {saving ? 'Saving…' : 'Save & Activate'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

/* ── Review helpers ── */
const ReviewCard: React.FC<{ title: string; onEdit: () => void; children: React.ReactNode }> = ({
  title,
  onEdit,
  children,
}) => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
      <div
        style={{
          background: 'var(--navy)',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          type="button"
          onClick={() => setOpen(o => !o)}
        >
          <span style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>›</span>
          {title}
        </button>
        <button
          style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
          type="button"
          onClick={onEdit}
        >
          Edit
        </button>
      </div>
      {open && <div style={{ padding: '14px 16px', fontSize: 12.5 }}>{children}</div>}
    </div>
  );
};

const ReviewGrid: React.FC<{ rows: [string, string][] }> = ({ rows }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
    {rows.map(([k, v]) => (
      <div key={k}>
        <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
          {k}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--navy)', fontWeight: 500 }}>{v}</div>
      </div>
    ))}
  </div>
);

export default NewCentreWizard;
