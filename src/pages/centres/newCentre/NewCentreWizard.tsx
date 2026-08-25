import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import NumberInput from '../../../components/NumberInput';
import { createCentre, updateCentre } from '../../../store/centres/api';
import { AppDispatch } from '../../../store/store';
import {
  COUNTRIES,
  COUNTRY_DIAL_CODES,
  COUNTRY_ISO_CODES,
  DAYS,
  DEMOGRAPHICS,
  FACILITY_OPTIONS,
  PLAN_CATALOGUE,
  PLAN_COUNTRY_CHIPS,
  SLOT_DURATIONS,
  TIMEZONES,
  WIZARD_STEPS,
} from '../constants';

import AdditionalFacilitiesStep from './AdditionalFacilitiesStep';
import AllocationBar from './AllocationBar';
import { buildCreatePayload } from './buildCreatePayload';
import { bundleToWizardState } from './bundleToWizardState';
import { downloadCentrePdf } from './centrePdf';

import type {
  CentreApiStatus,
  CentreBundle,
  CentreDiscount,
  WizardPlanRow,
  WizardState,
} from '../../../store/centres/types';

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
    // Guest / extra-session pricing is blank until explicitly set (no hardcoded default).
    firstGuestFee: null,
    additionalGuestDiscountPct: null,
    extraSessionCost: null,
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
  firstGuestFee: null,
  additionalGuestDiscountPct: null,
  extraSessionCost: null,
  discounts: [],
  keyDates: {},
});

// Auto-generate short code: first 3 letters of city + 001 (e.g. DAL001).
const genShortCode = (city: string): string => {
  const letters = city.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (!letters) return '';
  return `${letters.substring(0, 3)}001`;
};

// ── Draft autosave (new-centre flow only; editing an existing centre never
// touches this — it has its own persisted record) ──
const DRAFT_KEY = 'newCentreWizardDraft';

const loadDraft = (): WizardState | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as WizardState) : null;
  } catch {
    return null; // corrupt/old-shape draft — fall back to a blank wizard rather than crash
  }
};

const saveDraft = (state: WizardState) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable/full — autosave is best-effort only
  }
};

const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
};

// ── Postcode → City/State/Country lookup (zippopotam.us, free & keyless) ──
interface ZippopotamPlace {
  'place name'?: string;
  state?: string;
  'state abbreviation'?: string;
}
interface ZippopotamResponse {
  places?: ZippopotamPlace[];
}

// Tries the already-selected country first (fast path + avoids surprising a
// deliberate choice), then the rest of our supported countries as a fallback —
// there's no country-less reverse lookup on this API, so this is how we can still
// fill Country from just a postcode.
const lookupPostcode = async (postcode: string, preferredCountryCode: string) => {
  const entries = Object.entries(COUNTRY_ISO_CODES);
  const ordered = preferredCountryCode
    ? [...entries.filter(([c]) => c === preferredCountryCode), ...entries.filter(([c]) => c !== preferredCountryCode)]
    : entries;
  for (const [code, iso] of ordered) {
    try {
      const res = await fetch(`https://api.zippopotam.us/${iso}/${encodeURIComponent(postcode)}`);
      if (!res.ok) continue;
      const data = (await res.json()) as ZippopotamResponse;
      const place = data.places?.[0];
      if (!place) continue;
      return {
        countryCode: code,
        city: place['place name'] ?? '',
        state: place['state abbreviation'] || place.state || '',
      };
    } catch {
      // network error / CORS for this one country — try the next
    }
  }
  return null;
};

// Dial code prefix already on a phone string (e.g. "+1" from "+1 555 000 0000").
const dialCodeOf = (phone: string): string => /^\+\d{1,3}/.exec(phone.trim())?.[0] ?? '';
const stripDialCode = (phone: string): string => phone.trim().replace(/^\+\d{1,3}\s*/, '');

const SHORT_CODE_RE = /^[A-Z0-9]{3,6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const toNum = (v: number | '') => (v === '' ? 0 : Number(v));

// "HH:mm" → minutes since 00:00. Returns NaN on bad input.
const minutesOf = (hhmm: string): number => {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
};

// ── Key Dates: local wall-clock (in the centre's own timezone) ↔ UTC ISO 8601 ──
// No timezone library in this codebase yet — done by hand via Intl.DateTimeFormat.
const tzPartsOf = (date: Date, timezone: string, withSeconds: boolean): Record<string, string> => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
};

// "YYYY-MM-DDTHH:mm" (as typed into a <input type="datetime-local">), interpreted as
// wall-clock time IN `timezone` → UTC ISO string. '' → undefined (not scheduled).
const localToUtcIso = (local: string, timezone: string): string | undefined => {
  if (!local) return undefined;
  const guessAsUtc = new Date(`${local}:00Z`);
  if (Number.isNaN(guessAsUtc.getTime()) || !timezone) return undefined;
  const p = tzPartsOf(guessAsUtc, timezone, true);
  const guessDisplayedAsUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second)
  );
  // guessAsUtc is off from the true instant by exactly `timezone`'s offset at that
  // moment; that offset is (guessDisplayedAsUtc - guessAsUtc), so subtract it back out.
  return new Date(guessAsUtc.getTime() - (guessDisplayedAsUtc - guessAsUtc.getTime())).toISOString();
};

// UTC ISO string → "YYYY-MM-DDTHH:mm" for a <input type="datetime-local">, displayed
// in `timezone`. undefined/invalid → '' (not scheduled).
const utcIsoToLocal = (iso: string | undefined, timezone: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || !timezone) return '';
  const p = tzPartsOf(d, timezone, false);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};

// Read-only display for the Review step — "Not scheduled" when unset.
const displayKeyDate = (iso: string | undefined, timezone: string): string => {
  if (!iso) return 'Not scheduled';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || undefined,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  staging: 'Staging',
  active: 'Active',
  suspended: 'Suspended',
};

// Clean read-only cell for the 24/7 operating-hours grid — plain text (no native
// time-picker chrome), matching the reference.
const readonlyTimeBox: React.CSSProperties = {
  width: '100%',
  padding: '5px 8px',
  border: '1px solid var(--border)',
  borderRadius: 6,
  fontSize: 12.5,
  color: 'var(--sub)',
  background: '#fff',
};

type SaveStatus = 'draft' | 'staging' | 'active' | 'suspended';

// Copy for each selectable "Set Centre Status on Save" radio. The `active`
// title flips to "Reactivate" when the centre is currently suspended.
const SAVE_STATUS_META: Record<SaveStatus, { title: string; desc: string }> = {
  draft: {
    title: 'Save as Draft',
    desc: 'Centre is saved but invisible to all users including centre staff. Complete setup before going live.',
  },
  staging: {
    title: 'Send to Staging',
    desc: 'Centre is saved and ready for internal review/verification before going live — still invisible to members.',
  },
  active: {
    title: 'Save & Activate',
    desc: 'Centre goes live immediately. Visible to assigned staff and available for member sign-ups. Sends activation notification to assigned Admins.',
  },
  suspended: {
    title: 'Suspend Centre',
    desc: 'Centre is taken offline — hidden from members and closed to new bookings. Existing data is preserved and it can be re-activated anytime.',
  },
};

// Which status radios to offer, given the wizard mode + the centre's current status:
//  • New / draft / staging centre → Draft, Staging, Active.
//  • Active / suspended           → Active, Suspend (toggle live ↔ offline).
const saveStatusOptions = (isEdit: boolean, current?: CentreApiStatus): SaveStatus[] => {
  if (isEdit && (current === 'active' || current === 'suspended')) return ['active', 'suspended'];
  return ['draft', 'staging', 'active'];
};

interface Props {
  onClose: () => void;
  onSaved: (activated: boolean) => void;
  /** When provided, the wizard opens in edit mode, pre-filled from this bundle. */
  initialBundle?: CentreBundle;
}

const NewCentreWizard: React.FC<Props> = ({ onClose, onSaved, initialBundle }) => {
  const dispatch = useDispatch<AppDispatch>();
  const isEdit = Boolean(initialBundle);
  // Edit mode jumps straight to Review (step 6) with all steps already unlocked.
  const [step, setStep] = useState(isEdit ? 6 : 1);
  const [maxStepReached, setMaxStepReached] = useState(isEdit ? 6 : 1);
  const [demo, setDemo] = useState('all');
  // Restored a saved draft from an earlier, not-yet-created session? (new-centre flow only)
  const restoredDraftRef = useRef(false);
  const [s, setS] = useState<WizardState>(() => {
    if (initialBundle) return bundleToWizardState(initialBundle);
    const draft = loadDraft();
    if (draft) {
      restoredDraftRef.current = true;
      return draft;
    }
    return initialState();
  });
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [postcodeLooking, setPostcodeLooking] = useState(false);
  // Current persisted status of the centre being edited (undefined when creating).
  const currentStatus = initialBundle?.facility?.status;
  // Status the "Create Centre" / "Save Changes" button will persist (Review step radio).
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(() =>
    currentStatus === 'active'
      ? 'active'
      : currentStatus === 'suspended'
        ? 'suspended'
        : currentStatus === 'staging'
          ? 'staging'
          : 'draft'
  );
  // After a successful save we show a success modal before returning to the grid.
  const [savedAs, setSavedAs] = useState<SaveStatus | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const dirtyRef = useRef(false);

  const set = (patch: Partial<WizardState>) => {
    dirtyRef.current = true;
    setS(prev => {
      const next = { ...prev, ...patch };
      if (!isEdit) saveDraft(next);
      return next;
    });
  };

  const requestClose = useCallback(() => {
    if (
      dirtyRef.current &&
      !window.confirm(
        isEdit
          ? 'Discard unsaved changes and close the wizard?'
          : 'Close for now? Your progress is saved automatically — you can pick up where you left off next time.'
      )
    )
      return;
    onClose();
  }, [onClose, isEdit]);

  // Autofocus the first field on open.
  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  // Let the user know their earlier progress came back, once, on open.
  useEffect(() => {
    if (restoredDraftRef.current) toast('Restored your saved draft', { icon: '📝' });
  }, []);

  // Esc to close (with the same confirm flow as the overlay).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [requestClose]);

  // ── Derived ──
  const capacity = toNum(s.overallCapacity);
  const foundation = toNum(s.foundationPool);
  const normalPool = Math.max(capacity - foundation, 0);
  const allocatedTotal = s.plans.filter(p => p.enabled).reduce((sum, p) => sum + (Number(p.allocatedSlots) || 0), 0);
  const overAllocated = capacity > 0 && allocatedTotal > capacity;
  const foundationOverflow = foundation > capacity && capacity > 0;

  const shortCodeValid = !s.shortCode || SHORT_CODE_RE.test(s.shortCode);

  const emailValid = !s.email || EMAIL_RE.test(s.email);
  const hoursValid =
    s.is24x7 ||
    s.operatingHours.every(h => {
      if (!h.isOpen) return true;
      const o = minutesOf(h.openTime);
      const c = minutesOf(h.closeTime);
      if (Number.isNaN(o) || Number.isNaN(c) || o === c) return false;
      // overnight allowed (close < open). Reject windows shorter than 30 min either way.
      const span = c > o ? c - o : 24 * 60 - o + c;
      return span >= 30;
    });

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
            emailValid &&
            hoursValid
        );
      case 2:
        return capacity > 0 && !foundationOverflow && toNum(s.battingLanes) >= 0 && toNum(s.bowlingLanes) >= 0;
      case 3:
        return true; // optional
      case 4:
        return capacity > 0 && s.plans.some(p => p.enabled) && !overAllocated;
      default:
        return true;
    }
  };

  const goStep = (n: number) => {
    // Moving forward requires the current step to be valid.
    if (n > step && !stepValid(step)) {
      setShowErrors(true);
      toast.error('Please complete the required fields before continuing.');
      return;
    }
    setShowErrors(false);
    setStep(n);
    setMaxStepReached(m => Math.max(m, n));
  };

  // ── Field helpers ──
  // Short code auto-generates from the City field. Once the user manually edits
  // the short code, we stop overwriting it (tracked by prevCityRef).
  const prevCityRef = useRef('');
  const onCityChange = (city: string) => {
    const userEdited = s.shortCode && s.shortCode !== genShortCode(prevCityRef.current);
    set({ city, shortCode: userEdited ? s.shortCode : genShortCode(city) });
    prevCityRef.current = city;
  };

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

  const save = async () => {
    if (!stepValid(4)) {
      toast.error('Resolve plan & capacity validation before saving.');
      setStep(4);
      return;
    }
    setSaving(true);
    const finalState: WizardState = { ...s, status: saveStatus };
    const payload = buildCreatePayload(finalState, initialBundle);
    // Centres are addressed by their (uppercase) short code everywhere in this API
    // — /details is fetched by code, and the lookup is case-sensitive — so the
    // update endpoint's centreId is the facility code, not the facility doc id
    // (which is "<code>-facility").
    const centreId =
      (initialBundle?.facility?.code ?? '').toUpperCase() ||
      (initialBundle?.facility?.id ?? '').replace(/-facility$/i, '');
    try {
      if (isEdit) await dispatch(updateCentre({ payload, centreId })).unwrap();
      else await dispatch(createCentre(payload)).unwrap();
      if (!isEdit) clearDraft(); // centre now exists for real — stop offering this draft to resume
      setSavedAs(saveStatus); // success modal → grid on dismiss
    } catch (e) {
      // 401 is handled globally (session-expired modal); the thunk rejects with a
      // ready-to-show message (via handleApiError) otherwise.
      toast.error(typeof e === 'string' ? e : 'Could not save the centre. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onDownloadPdf = () => {
    if (!downloadCentrePdf(s)) {
      toast.error('Could not open the PDF — please allow pop-ups for this site.');
    }
  };

  const err = (cond: boolean) => (showErrors && cond ? { borderColor: '#dc2626' } : undefined);

  return (
    <div className="font-sans text-sm text-cmx-text">
      <button
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--sub)',
          fontSize: 12.5,
          fontWeight: 600,
          padding: 0,
          marginBottom: 12,
        }}
        type="button"
        onClick={requestClose}
      >
        <svg fill="none" height={14} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={14}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Centres
      </button>
      <div
        aria-label="New Centre wizard"
        className="relative w-full animate-cmx-fade-in overflow-hidden rounded-xl border border-cmx-border bg-white text-cmx-text"
        role="dialog"
      >
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
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>
              {isEdit ? `Edit Centre${s.name ? ` — ${s.name}` : ''}` : 'New Centre'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 2 }}>
              {isEdit
                ? 'Review the pre-filled configuration, then save or activate the centre'
                : 'Complete all steps to create and activate the centre'}
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
            type="button"
            onClick={requestClose}
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
          {WIZARD_STEPS.map((label, i) => {
            const n = i + 1;
            const cls = n === step ? 'active' : n < step ? 'done' : '';
            // Allow jumping back freely; forward jumps require every prior step to still be valid.
            const canJump =
              n <= step || (n <= maxStepReached && Array.from({ length: n - 1 }, (_, k) => k + 1).every(stepValid));
            return (
              <React.Fragment key={label}>
                <button
                  className={`cursor-pointer whitespace-nowrap rounded-full border px-3 py-[5px] text-[11.5px] font-semibold transition-all ${
                    cls === 'active'
                      ? 'border-navy bg-navy text-white'
                      : cls === 'done'
                        ? 'border-cmx-green bg-cmx-green-bg text-cmx-green'
                        : 'border-cmx-border bg-white text-sub'
                  }`}
                  disabled={!canJump}
                  style={canJump ? undefined : { opacity: 0.5, cursor: 'not-allowed' }}
                  type="button"
                  onClick={() => (canJump ? setStep(n) : goStep(n))}
                >
                  {n} · {label}
                </button>
                {i < WIZARD_STEPS.length - 1 && (
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
              <div className="flex flex-col gap-1" style={{ marginBottom: 14 }}>
                <span className="cmx-field-label">Centre Name *</span>
                <input
                  ref={firstFieldRef}
                  className="cmx-field"
                  placeholder="e.g. Century Cricket Centre — Dallas"
                  style={err(!s.name.trim())}
                  type="text"
                  value={s.name}
                  onChange={e => set({ name: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="flex flex-col gap-1">
                  <span className="cmx-field-label">Short Code *</span>
                  <input
                    className="cmx-field"
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
                <div className="flex flex-col gap-1">
                  <span className="cmx-field-label">Status</span>
                  <select
                    className="cmx-field"
                    value={s.status}
                    onChange={e => set({ status: e.target.value as SaveStatus })}
                  >
                    <option value="draft">Draft (not visible to members)</option>
                    <option value="active">Active (go live immediately)</option>
                    <option value="suspended">Suspended (taken offline)</option>
                  </select>
                </div>
              </div>

              <div className="cmx-eyebrow" style={{ margin: '20px 0 14px' }}>
                Address
              </div>
              <div className="flex flex-col gap-1" style={{ marginBottom: 14 }}>
                <span className="cmx-field-label">Address Line 1 *</span>
                <input
                  className="cmx-field"
                  placeholder="Street address"
                  style={err(!s.addressLine1.trim())}
                  type="text"
                  value={s.addressLine1}
                  onChange={e => set({ addressLine1: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1" style={{ marginBottom: 14 }}>
                <span className="cmx-field-label">Address Line 2</span>
                <input
                  className="cmx-field"
                  placeholder="Suite, unit, floor (optional)"
                  type="text"
                  value={s.addressLine2}
                  onChange={e => set({ addressLine2: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="flex flex-col gap-1">
                  <span className="cmx-field-label">City *</span>
                  <input
                    className="cmx-field"
                    placeholder="e.g. Dallas"
                    style={err(!s.city.trim())}
                    type="text"
                    value={s.city}
                    onChange={e => onCityChange(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="cmx-field-label">State / Province</span>
                  <input
                    className="cmx-field"
                    placeholder="e.g. TX"
                    type="text"
                    value={s.state}
                    onChange={e => set({ state: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="cmx-field-label">Postcode *</span>
                  <input
                    className="cmx-field"
                    placeholder="e.g. 75201"
                    style={err(!s.postcode.trim())}
                    type="text"
                    value={s.postcode}
                    onBlur={async e => {
                      const postcode = e.target.value.trim();
                      if (!postcode) return;
                      setPostcodeLooking(true);
                      const found = await lookupPostcode(postcode, s.country);
                      setPostcodeLooking(false);
                      if (found) {
                        set({
                          city: s.city.trim() ? s.city : found.city || s.city,
                          state: found.state || s.state,
                          country: found.countryCode || s.country,
                        });
                      }
                    }}
                    onChange={e => set({ postcode: e.target.value })}
                  />
                  {postcodeLooking && <div className="cmx-hint">Looking up city/state/country…</div>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="flex flex-col gap-1">
                  <span className="cmx-field-label">Country *</span>
                  <select
                    className="cmx-field"
                    style={err(!s.country)}
                    value={s.country}
                    onChange={e => set({ country: e.target.value })}
                  >
                    <option value="">Select country…</option>
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="cmx-field-label">Time Zone *</span>
                  <select
                    className="cmx-field"
                    style={err(!s.timezone)}
                    value={s.timezone}
                    onChange={e => set({ timezone: e.target.value })}
                  >
                    <option value="">Select timezone…</option>
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="cmx-eyebrow" style={{ margin: '20px 0 14px' }}>
                Contact
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="flex flex-col gap-1">
                  <span className="cmx-field-label">Phone *</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      aria-label="Country code"
                      className="cmx-field"
                      style={{ flex: '0 0 92px', paddingLeft: 8, paddingRight: 4 }}
                      value={dialCodeOf(s.phone) || COUNTRY_DIAL_CODES[s.country] || ''}
                      onChange={e => set({ phone: `${e.target.value} ${stripDialCode(s.phone)}`.trim() })}
                    >
                      <option value="">Code</option>
                      {COUNTRIES.map(c => (
                        <option key={c.code} value={COUNTRY_DIAL_CODES[c.code]}>
                          {COUNTRY_DIAL_CODES[c.code]} {c.code}
                        </option>
                      ))}
                    </select>
                    <input
                      className="cmx-field"
                      inputMode="tel"
                      placeholder="555 000 0000"
                      style={{ flex: 1, ...(err(!s.phone.trim()) || {}) }}
                      type="tel"
                      value={stripDialCode(s.phone)}
                      onChange={e => {
                        // Digits + spaces/hyphens/parens for formatting — no letters.
                        const digitsOnly = e.target.value.replace(/[^\d\s\-().]/g, '');
                        const code = dialCodeOf(s.phone) || COUNTRY_DIAL_CODES[s.country] || '';
                        set({ phone: code ? `${code} ${digitsOnly}`.trim() : digitsOnly });
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="cmx-field-label">Email *</span>
                  <input
                    className="cmx-field"
                    placeholder="dallas@centurycricket.com"
                    style={err(!s.email.trim() || !emailValid)}
                    type="email"
                    value={s.email}
                    onChange={e => set({ email: e.target.value })}
                  />
                  {showErrors && s.email && !emailValid && (
                    <div style={{ fontSize: 11, color: '#dc2626' }}>Enter a valid email address.</div>
                  )}
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
                <label className="relative inline-block h-[22px] w-10 flex-shrink-0 cursor-pointer">
                  <input
                    aria-label="Open 24/7"
                    checked={s.is24x7}
                    className="peer sr-only"
                    type="checkbox"
                    onChange={e => set({ is24x7: e.target.checked })}
                  />
                  <span className="absolute inset-0 rounded-full bg-gray-300 transition-colors peer-checked:bg-cmx-green" />
                  <span className="absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform peer-checked:translate-x-[18px]" />
                </label>
              </div>

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
                      {s.is24x7 ? (
                        <div style={readonlyTimeBox}>12:00 AM</div>
                      ) : (
                        <input
                          aria-disabled={!h.isOpen}
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
                      )}
                    </div>
                    <div style={{ paddingRight: 10 }}>
                      {s.is24x7 ? (
                        <div style={readonlyTimeBox}>11:59 PM</div>
                      ) : (
                        <input
                          aria-disabled={!h.isOpen}
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
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <label className="relative inline-block h-[22px] w-10 flex-shrink-0 cursor-pointer">
                        <input
                          aria-label={`${DAYS[i]} open`}
                          checked={s.is24x7 || h.isOpen}
                          className="peer sr-only"
                          disabled={s.is24x7}
                          type="checkbox"
                          onChange={e => setHour(h.day, { isOpen: e.target.checked })}
                        />
                        {/* Track/knob coloured via inline style so the 24/7 (disabled)
                              toggle stays solid teal instead of the browser's dimmed look. */}
                        <span
                          className="absolute inset-0 rounded-full transition-colors"
                          style={{ background: s.is24x7 || h.isOpen ? '#008482' : '#d1d5db' }}
                        />
                        <span
                          className="absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform"
                          style={{ transform: s.is24x7 || h.isOpen ? 'translateX(18px)' : 'none' }}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="cmx-btn cmx-btn-navy" type="button" onClick={() => goStep(2)}>
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
          )}

          {/* ══ STEP 3 ══ */}
          {step === 3 && (
            <div>
              <AdditionalFacilitiesStep
                facilities={s.additionalFacilities}
                onChange={next => set({ additionalFacilities: next })}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <button className="cmx-btn cmx-btn-outline" type="button" onClick={() => goStep(2)}>
                  ← Back
                </button>
                <button className="cmx-btn cmx-btn-navy" type="button" onClick={() => goStep(4)}>
                  Next: Plans & Pricing →
                </button>
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
                        className={`cursor-pointer whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                          demo === d.key ? 'border-navy bg-navy text-white' : 'border-cmx-border bg-white text-sub'
                        }`}
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
                            <div className="flex flex-col gap-1">
                              <span className="cmx-field-label">Fortnightly Price *</span>
                              <NumberInput
                                className="cmx-field"
                                min={0}
                                step={0.01}
                                value={row.fortnightlyPrice}
                                onValueChange={v => setPlan(meta.id, { fortnightlyPrice: v })}
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="cmx-field-label">Annual Price</span>
                              <NumberInput
                                className="cmx-field"
                                min={0}
                                step={0.01}
                                value={row.annualPrice}
                                onValueChange={v => setPlan(meta.id, { annualPrice: v })}
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="cmx-field-label">Allocated Slots *</span>
                              <NumberInput
                                className="cmx-field"
                                min={1}
                                value={row.allocatedSlots}
                                onValueChange={v => setPlan(meta.id, { allocatedSlots: v })}
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="cmx-field-label">Foundation Eligible</span>
                              <select
                                className="cmx-field"
                                value={row.isFoundationEligible ? 'yes' : 'no'}
                                onChange={e => setPlan(meta.id, { isFoundationEligible: e.target.value === 'yes' })}
                              >
                                <option value="yes">Yes — included</option>
                                <option value="no">No — not included</option>
                              </select>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 10 }}>
                            <div className="flex flex-col gap-1">
                              <span className="cmx-field-label">Member Cap</span>
                              <input
                                className="cmx-field"
                                min={1}
                                placeholder="Blank = plan cap"
                                type="number"
                                value={row.memberCap ?? ''}
                                onChange={e =>
                                  setPlan(meta.id, {
                                    memberCap: e.target.value === '' ? null : Math.max(1, Number(e.target.value)),
                                  })
                                }
                              />
                              {row.memberCap !== null &&
                                row.memberCap !== undefined &&
                                row.memberCap > row.allocatedSlots && (
                                  <div style={{ fontSize: 11, color: '#d97706' }}>
                                    Cap exceeds allocated slots ({row.allocatedSlots}).
                                  </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="cmx-field-label">First Guest Fee (USD)</span>
                              <input
                                className="cmx-field"
                                min={0}
                                placeholder="Blank = not set"
                                step={0.01}
                                type="number"
                                value={row.firstGuestFee ?? ''}
                                onChange={e =>
                                  setPlan(meta.id, {
                                    firstGuestFee: e.target.value === '' ? null : Math.max(0, Number(e.target.value)),
                                  })
                                }
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="cmx-field-label">Add. Guest Discount (%)</span>
                              <input
                                className="cmx-field"
                                max={100}
                                min={0}
                                placeholder="Blank = not set"
                                type="number"
                                value={row.additionalGuestDiscountPct ?? ''}
                                onChange={e =>
                                  setPlan(meta.id, {
                                    additionalGuestDiscountPct:
                                      e.target.value === '' ? null : Math.min(100, Math.max(0, Number(e.target.value))),
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                            <div className="flex flex-col gap-1">
                              <span className="cmx-field-label">Extra Session Cost (USD)</span>
                              <input
                                className="cmx-field"
                                min={0}
                                placeholder="Blank = not set"
                                step={0.01}
                                type="number"
                                value={row.extraSessionCost ?? ''}
                                onChange={e =>
                                  setPlan(meta.id, {
                                    extraSessionCost:
                                      e.target.value === '' ? null : Math.max(0, Number(e.target.value)),
                                  })
                                }
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="cmx-field-label">Joining Fee (USD)</span>
                              <NumberInput
                                className="cmx-field"
                                min={0}
                                placeholder="0 = no joining fee"
                                step={0.01}
                                value={row.joiningFee}
                                onValueChange={v => setPlan(meta.id, { joiningFee: v })}
                              />
                            </div>
                          </div>
                          <div style={{ marginTop: 10 }}>
                            <span className="cmx-field-label">Available in</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                              {PLAN_COUNTRY_CHIPS.map(c => {
                                const active = row.availableCountries.includes(c.code);
                                return (
                                  <button
                                    key={c.code}
                                    className={`inline-flex cursor-pointer select-none items-center gap-1 whitespace-nowrap rounded-full border border-cmx-border bg-white px-2.5 py-1 text-xs font-medium text-sub transition-all ${
                                      active ? 'border-[#9096be] bg-[#ecedf4] text-[#21295a]' : ''
                                    }`}
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
                      <div className="flex flex-col gap-1">
                        <span className="cmx-field-label">Discount Name *</span>
                        <input
                          className="cmx-field"
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
                      <div className="flex flex-col gap-1">
                        <span className="cmx-field-label">Type *</span>
                        <select
                          className="cmx-field"
                          value={d.type}
                          onChange={e =>
                            set({
                              discounts: s.discounts.map(x =>
                                x.id === d.id ? { ...x, type: e.target.value as CentreDiscount['type'], value: 0 } : x
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
                      <div className="flex flex-col gap-1">
                        <span className="cmx-field-label">
                          Value{d.type === 'percentage' ? ' (%)' : d.type === 'fixed' ? ' ($)' : ' (sessions)'}
                        </span>
                        <input
                          className="cmx-field"
                          max={d.type === 'percentage' ? 100 : d.type === 'free_sessions' ? 30 : 99999}
                          min={0}
                          type="number"
                          value={d.value}
                          onChange={e => {
                            const maxV = d.type === 'percentage' ? 100 : d.type === 'free_sessions' ? 30 : 99999;
                            const v = Math.max(0, Math.min(maxV, Number(e.target.value) || 0));
                            set({
                              discounts: s.discounts.map(x => (x.id === d.id ? { ...x, value: v } : x)),
                            });
                          }}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="cmx-field-label">Applies To</span>
                        <input
                          className="cmx-field"
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
                      <div className="flex flex-col gap-1">
                        <span className="cmx-field-label">Promo Code</span>
                        <input
                          className="cmx-field"
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
                <button className="cmx-btn cmx-btn-outline" type="button" onClick={() => goStep(3)}>
                  ← Back
                </button>
                <button className="cmx-btn cmx-btn-navy" type="button" onClick={() => goStep(5)}>
                  Next: Key Dates →
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 5 ══ */}
          {step === 5 && (
            <div>
              <div className="cmx-eyebrow" style={{ marginBottom: 14 }}>
                Key Dates
              </div>
              <div
                className="rounded-lg border border-[#b3b7d4] bg-[#ecedf4] px-3.5 py-3 text-xs text-[#21295a]"
                style={{ marginBottom: 16 }}
              >
                All optional — leave any date blank to leave that behavior unscheduled. Times are in this centre&apos;s
                own timezone ({s.timezone || 'not set yet'}).
              </div>

              <div style={{ marginBottom: 14 }}>
                <KeyDateField
                  label="Centre go-live date"
                  timezone={s.timezone}
                  value={s.keyDates.goLiveAt}
                  onChange={v => set({ keyDates: { ...s.keyDates, goLiveAt: v } })}
                />
              </div>

              <KeyDateRange
                endLabel="Waitlist close date"
                endValue={s.keyDates.waitlistCloseAt}
                startLabel="Waitlist open date"
                startValue={s.keyDates.waitlistOpenAt}
                timezone={s.timezone}
                onChangeEnd={v => set({ keyDates: { ...s.keyDates, waitlistCloseAt: v } })}
                onChangeStart={v => set({ keyDates: { ...s.keyDates, waitlistOpenAt: v } })}
              />

              <KeyDateRange
                endLabel="Membership sales end date"
                endValue={s.keyDates.salesEndAt}
                startLabel="Membership sales start date"
                startValue={s.keyDates.salesStartAt}
                timezone={s.timezone}
                onChangeEnd={v => set({ keyDates: { ...s.keyDates, salesEndAt: v } })}
                onChangeStart={v => set({ keyDates: { ...s.keyDates, salesStartAt: v } })}
              />

              <KeyDateRange
                endLabel="Promotional sale end date"
                endValue={s.keyDates.promoEndAt}
                startLabel="Promotional sale start date"
                startValue={s.keyDates.promoStartAt}
                timezone={s.timezone}
                onChangeEnd={v => set({ keyDates: { ...s.keyDates, promoEndAt: v } })}
                onChangeStart={v => set({ keyDates: { ...s.keyDates, promoStartAt: v } })}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button className="cmx-btn cmx-btn-outline" type="button" onClick={() => goStep(4)}>
                  ← Back
                </button>
                <button className="cmx-btn cmx-btn-navy" type="button" onClick={() => goStep(6)}>
                  Next: Review →
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 6 ══ */}
          {step === 6 && (
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

              <ReviewCard title="Key Dates" onEdit={() => setStep(5)}>
                <ReviewGrid
                  rows={[
                    ['Centre go-live date', displayKeyDate(s.keyDates.goLiveAt, s.timezone)],
                    ['Waitlist open date', displayKeyDate(s.keyDates.waitlistOpenAt, s.timezone)],
                    ['Waitlist close date', displayKeyDate(s.keyDates.waitlistCloseAt, s.timezone)],
                    ['Membership sales start date', displayKeyDate(s.keyDates.salesStartAt, s.timezone)],
                    ['Membership sales end date', displayKeyDate(s.keyDates.salesEndAt, s.timezone)],
                    ['Promotional sale start date', displayKeyDate(s.keyDates.promoStartAt, s.timezone)],
                    ['Promotional sale end date', displayKeyDate(s.keyDates.promoEndAt, s.timezone)],
                  ]}
                />
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
          )}
        </div>
      </div>

      {/* Success modal — shown on 201, then returns to the grid + refreshes the list */}
      {savedAs && (
        <div
          aria-modal="true"
          role="dialog"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 600, // must sit above the drawer (z-index 501), else it's hidden behind the form
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15,23,42,0.5)',
          }}
        >
          <div
            style={{
              width: 'min(440px, 92vw)',
              background: '#fff',
              borderRadius: 16,
              padding: '28px 26px',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                margin: '0 auto 14px',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  savedAs === 'active'
                    ? '#d0f0f0'
                    : savedAs === 'suspended'
                      ? '#fee2e2'
                      : savedAs === 'staging'
                        ? '#ecedf4'
                        : '#fef3c7',
                color:
                  savedAs === 'active'
                    ? '#008482'
                    : savedAs === 'suspended'
                      ? '#dc2626'
                      : savedAs === 'staging'
                        ? '#21295a'
                        : '#d97706',
              }}
            >
              <svg fill="none" height={28} stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" width={28}>
                {savedAs === 'active' ? (
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                ) : savedAs === 'suspended' ? (
                  <>
                    <circle cx="12" cy="12" r="9" />
                    <line strokeLinecap="round" x1="9" x2="9" y1="9" y2="15" />
                    <line strokeLinecap="round" x1="15" x2="15" y1="9" y2="15" />
                  </>
                ) : (
                  <path
                    d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--navy)' }}>
              {savedAs === 'active'
                ? isEdit
                  ? currentStatus === 'suspended'
                    ? 'Centre Reactivated!'
                    : 'Centre Activated!'
                  : 'Centre Created!'
                : savedAs === 'suspended'
                  ? 'Centre Suspended'
                  : savedAs === 'staging'
                    ? 'Centre Sent to Staging'
                    : isEdit
                      ? 'Changes Saved'
                      : 'Centre Saved as Draft'}
            </p>
            <p style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6, color: 'var(--sub)' }}>
              {savedAs === 'active'
                ? 'The centre is live and visible to assigned staff.'
                : savedAs === 'suspended'
                  ? 'The centre is suspended and hidden from members. You can re-activate it anytime.'
                  : savedAs === 'staging'
                    ? 'The centre is staged for review — still invisible to members until activated.'
                    : 'The centre is saved as a draft. Complete setup and activate it when ready.'}
            </p>
            <button
              className="cmx-btn cmx-btn-navy"
              style={{ marginTop: 18, width: '100%', justifyContent: 'center' }}
              type="button"
              onClick={() => onSaved(savedAs === 'active')}
            >
              {isEdit ? 'Back to Centre' : 'Back to Centres'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Review helpers ── */
const StatusOption: React.FC<{ checked: boolean; title: string; desc: string; onSelect: () => void }> = ({
  checked,
  title,
  desc,
  onSelect,
}) => (
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
  <div
    style={{
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      border: `1px solid ${checked ? 'var(--blue)' : 'var(--border)'}`,
      borderRadius: 10,
      padding: '16px 18px',
      cursor: 'pointer',
      background: checked ? 'rgba(37,99,235,0.04)' : '#fff',
      transition: 'border-color .15s, background .15s',
    }}
    onClick={onSelect}
  >
    <span
      style={{
        flexShrink: 0,
        marginTop: 2,
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: `2px solid ${checked ? 'var(--blue)' : 'var(--muted)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked && <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--blue)' }} />}
    </span>
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--sub)', marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
    </div>
  </div>
);

const ReviewCard: React.FC<{ title: string; onEdit?: () => void; children: React.ReactNode }> = ({
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
        {onEdit && (
          <button
            style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
            type="button"
            onClick={onEdit}
          >
            Edit
          </button>
        )}
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

const KeyDateField: React.FC<{
  label: string;
  timezone: string;
  value: string | undefined;
  onChange: (isoOrUndefined: string | undefined) => void;
}> = ({ label, timezone, value, onChange }) => (
  <label className="flex flex-col gap-1">
    <span className="cmx-field-label">{label}</span>
    <input
      className="cmx-field"
      type="datetime-local"
      value={utcIsoToLocal(value, timezone)}
      onChange={e => onChange(localToUtcIso(e.target.value, timezone))}
    />
  </label>
);

const KeyDateRange: React.FC<{
  startLabel: string;
  endLabel: string;
  timezone: string;
  startValue: string | undefined;
  endValue: string | undefined;
  onChangeStart: (isoOrUndefined: string | undefined) => void;
  onChangeEnd: (isoOrUndefined: string | undefined) => void;
}> = ({ startLabel, endLabel, timezone, startValue, endValue, onChangeStart, onChangeEnd }) => {
  // ISO 8601 strings sort lexicographically in chronological order — plain string
  // comparison is safe here, no Date parsing needed.
  const rangeInvalid = Boolean(startValue && endValue && endValue <= startValue);
  return (
    <div style={{ marginBottom: rangeInvalid ? 4 : 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <KeyDateField label={startLabel} timezone={timezone} value={startValue} onChange={onChangeStart} />
        <KeyDateField label={endLabel} timezone={timezone} value={endValue} onChange={onChangeEnd} />
      </div>
      {rangeInvalid && (
        <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
          &quot;{endLabel}&quot; must be after &quot;{startLabel}&quot;.
        </div>
      )}
    </div>
  );
};

export default NewCentreWizard;
