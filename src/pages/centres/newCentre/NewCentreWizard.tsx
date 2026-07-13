import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import { createCentre, updateCentre } from '../../../store/centres/api';
import { AppDispatch } from '../../../store/store';
import { PLAN_CATALOGUE, WIZARD_STEPS } from '../constants';

import AdditionalFacilitiesStep from './AdditionalFacilitiesStep';
import { buildCreatePayload } from './buildCreatePayload';
import { bundleToWizardState } from './bundleToWizardState';
import { downloadCentrePdf } from './centrePdf';
import Step1Identity from './Step1Identity';
import Step2Facilities from './Step2Facilities';
import Step4Plans from './Step4Plans';
import Step5Review from './Step5Review';
import { EMAIL_RE, genShortCode, initialState, minutesOf, SHORT_CODE_RE, toNum } from './wizardHelpers';

import type { CentreBundle, CentreDiscount, WizardPlanRow, WizardState } from '../../../store/centres/types';

interface Props {
  onClose: () => void;
  onSaved: (activated: boolean) => void;
  /** When provided, the wizard opens in edit mode, pre-filled from this bundle. */
  initialBundle?: CentreBundle;
}

const NewCentreWizard: React.FC<Props> = ({ onClose, onSaved, initialBundle }) => {
  const dispatch = useDispatch<AppDispatch>();
  const isEdit = Boolean(initialBundle);
  // Edit mode jumps straight to Review (step 5) with all steps already unlocked.
  const [step, setStep] = useState(isEdit ? 5 : 1);
  const [maxStepReached, setMaxStepReached] = useState(isEdit ? 5 : 1);
  const [demo, setDemo] = useState('all');
  const [s, setS] = useState<WizardState>(() => (initialBundle ? bundleToWizardState(initialBundle) : initialState()));
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  // Current persisted status of the centre being edited (undefined when creating).
  const currentStatus = initialBundle?.facility?.status;
  // Status the "Create Centre" / "Save Changes" button will persist (Review step radio).
  const [saveStatus, setSaveStatus] = useState<'draft' | 'active' | 'suspended'>(() =>
    currentStatus === 'active' ? 'active' : currentStatus === 'suspended' ? 'suspended' : 'draft'
  );
  // After a successful save we show a success modal before returning to the grid.
  const [savedAs, setSavedAs] = useState<null | 'draft' | 'active' | 'suspended'>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const dirtyRef = useRef(false);

  const set = (patch: Partial<WizardState>) => {
    dirtyRef.current = true;
    setS(prev => ({ ...prev, ...patch }));
  };

  const requestClose = useCallback(() => {
    if (dirtyRef.current && !window.confirm('Discard unsaved changes and close the wizard?')) return;
    onClose();
  }, [onClose]);

  // Autofocus the first field on open.
  useEffect(() => {
    firstFieldRef.current?.focus();
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
            <Step1Identity
              emailValid={emailValid}
              err={err}
              firstFieldRef={firstFieldRef}
              goStep={goStep}
              s={s}
              set={set}
              setHour={setHour}
              shortCodeValid={shortCodeValid}
              showErrors={showErrors}
              onCityChange={onCityChange}
            />
          )}

          {/* ══ STEP 2 ══ */}
          {step === 2 && (
            <Step2Facilities
              capacity={capacity}
              err={err}
              foundation={foundation}
              foundationOverflow={foundationOverflow}
              goStep={goStep}
              normalPool={normalPool}
              s={s}
              set={set}
              toggleFacility={toggleFacility}
            />
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
            <Step4Plans
              addDiscount={addDiscount}
              capacity={capacity}
              demo={demo}
              goStep={goStep}
              s={s}
              set={set}
              setDemo={setDemo}
              setPlan={setPlan}
              visiblePlans={visiblePlans}
            />
          )}

          {/* ══ STEP 5 ══ */}
          {step === 5 && (
            <Step5Review
              capacity={capacity}
              currentStatus={currentStatus}
              foundation={foundation}
              goStep={goStep}
              isEdit={isEdit}
              requestClose={requestClose}
              s={s}
              save={save}
              saveStatus={saveStatus}
              saving={saving}
              setSaveStatus={setSaveStatus}
              setStep={setStep}
              onDownloadPdf={onDownloadPdf}
            />
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
                background: savedAs === 'active' ? '#d0f0f0' : savedAs === 'suspended' ? '#fee2e2' : '#fef3c7',
                color: savedAs === 'active' ? '#008482' : savedAs === 'suspended' ? '#dc2626' : '#d97706',
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
                  : isEdit
                    ? 'Changes Saved'
                    : 'Centre Saved as Draft'}
            </p>
            <p style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6, color: 'var(--sub)' }}>
              {savedAs === 'active'
                ? 'The centre is live and visible to assigned staff.'
                : savedAs === 'suspended'
                  ? 'The centre is suspended and hidden from members. You can re-activate it anytime.'
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

export default NewCentreWizard;
