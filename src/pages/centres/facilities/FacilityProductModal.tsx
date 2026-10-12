import { useEffect, useMemo, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import NumberInput from '../../../components/NumberInput';
import { updateCentreFacilities } from '../../../store/centres/api';
import { AppDispatch } from '../../../store/store';

import { featureMetaFor } from './productMeta';

import type { ApiProduct } from '../../../store/centres/types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'commingsoon', label: 'Coming Soon' },
  { value: 'inactive', label: 'Inactive' },
];

type FacilityType = 'pay_per_slot' | 'membership_addon';
const FACILITY_TYPE_OPTIONS: { value: FacilityType; label: string }[] = [
  { value: 'pay_per_slot', label: 'Pay Per Booking' },
  { value: 'membership_addon', label: 'Membership Add-On' },
];

// Matches the New Centre wizard's Additional Facilities step (AdditionalFacilitiesStep.tsx's
// SLOT_OPTIONS) minus "No fixed slots" — this form always stores a concrete durationMinutes.
const DURATION_OPTIONS: { label: string; minutes: number }[] = [
  { label: '30 minutes', minutes: 30 },
  { label: '45 minutes', minutes: 45 },
  { label: '60 minutes', minutes: 60 },
  { label: '90 minutes', minutes: 90 },
  { label: '120 minutes', minutes: 120 },
];

const SLOT_START_INTERVAL_OPTIONS = [15, 30, 60];
const FREE_TRIAL_OPTIONS = [0, 1, 2] as const;

/** "Podcast Room" -> "podcastroom" — same slug shape _build_product_doc stores
 * (backend lower-cases it anyway; done here too so the collision check below
 * compares like-for-like before submitting). */
const slugify = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const money = (n: number): string =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Same field style as the New Centre wizard's Additional Facilities step
// (AdditionalFacilitiesStep.tsx's FF_INPUT) — this modal is the same facility
// config, just reached from the Facilities page instead of the wizard, so it
// should look like the same screen.
const FF_INPUT =
  'w-full rounded-[7px] border border-cmx-border bg-white px-2.5 py-2 text-[13px] text-cmx-text outline-none focus:border-cmx-blue focus:shadow-[0_0_0_2px_rgba(37,99,235,0.1)] disabled:bg-gray-50 disabled:text-muted';
const FIELD_LABEL = 'text-[11px] font-semibold uppercase tracking-[0.04em] text-sub';
const FIELD_ERROR = 'text-[11px] text-red-600';
const HELPER_TEXT = 'text-[11px] text-sub';

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--sub)',
      textTransform: 'uppercase',
      letterSpacing: '.05em',
      margin: '4px 0 10px',
    }}
  >
    {children}
  </div>
);

interface Props {
  centreCode: string;
  /** null = Add New; otherwise editing this existing product. */
  product: ApiProduct | null;
  /** Every other product's code at this centre — blocks an Add New that would
   * collide (the backend's `products` is create-only, so a collision would
   * otherwise silently no-op instead of saving). */
  existingCodes: string[];
  onClose: () => void;
  /** Called after a successful save so the page refetches the live bundle. */
  onSaved: () => void;
}

const FacilityProductModal: React.FC<Props> = ({ centreCode, product, existingCodes, onClose, onSaved }) => {
  const dispatch = useDispatch<AppDispatch>();
  const isEdit = !!product;

  const [facilityType, setFacilityType] = useState<FacilityType>('pay_per_slot');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('active');

  // Pay-per-slot fields.
  const [price, setPrice] = useState<number | null>(null);
  const [totalCapacity, setTotalCapacity] = useState<number | null>(null);
  const [seatingCapacity, setSeatingCapacity] = useState<number | null>(null);

  // Shared fields (both facility types).
  const [slotCapacity, setSlotCapacity] = useState<number | null>(1);
  const [annualDiscountPct, setAnnualDiscountPct] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(60);
  const [maxBookingsPerDay, setMaxBookingsPerDay] = useState<number | null>(null);
  const [advanceBookingDays, setAdvanceBookingDays] = useState<number | null>(null);
  const [maxGuestsPerSlot, setMaxGuestsPerSlot] = useState<number | null>(null);
  const [additionalGuestPrice, setAdditionalGuestPrice] = useState<number | null>(null);
  const [freeGuestVisits, setFreeGuestVisits] = useState<number | null>(null);
  const [is24Hours, setIs24Hours] = useState(false);
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('20:00');

  // Gym — pricing.
  const [gymFortnightlyPrice, setGymFortnightlyPrice] = useState<number | null>(19.95);
  const [familyRate, setFamilyRate] = useState<number | null>(10);
  // null = use the calculated annual price (fortnightly × 26 × discount); a
  // typed value overrides it, e.g. for a promotional annual price that doesn't
  // match the discount math exactly.
  const [annualPrice, setAnnualPrice] = useState<number | null>(null);

  // Gym — capacity & booking.
  const [slotStartIntervalMinutes, setSlotStartIntervalMinutes] = useState(15);
  const [maxMembersPerSlot, setMaxMembersPerSlot] = useState<number | null>(10);
  const [minGapHours, setMinGapHours] = useState<number | null>(8);

  // Gym — guest access.
  const [freeGymEntryWithLaneBooking, setFreeGymEntryWithLaneBooking] = useState(true);

  // Gym — free trial.
  const [freeTrialSlots, setFreeTrialSlots] = useState<0 | 1 | 2>(1);

  // Gym — age rules.
  const [minimumAge, setMinimumAge] = useState<number | null>(13);
  const [parentPresentFrom, setParentPresentFrom] = useState<number | null>(13);
  const [parentPresentTo, setParentPresentTo] = useState<number | null>(14);
  const [consentFrom, setConsentFrom] = useState<number | null>(15);
  const [consentTo, setConsentTo] = useState<number | null>(17);

  // Gym — access & PINs.
  const [gymPinRequired, setGymPinRequired] = useState(true);
  const [gymPinBefore, setGymPinBefore] = useState<number | null>(15);
  const [gymPinAfter, setGymPinAfter] = useState<number | null>(15);
  const [facilityPinBefore, setFacilityPinBefore] = useState<number | null>(15);
  const [facilityPinAfter, setFacilityPinAfter] = useState<number | null>(15);

  // Gym — induction.
  const [inductionRequired, setInductionRequired] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    const isGym = product?.bookingModel === 'membership_addon';
    setFacilityType(isGym ? 'membership_addon' : 'pay_per_slot');
    setName(product?.name ?? '');
    setStatus(product?.status || 'active');
    setPrice(product?.slotPricing?.default?.price ?? null);
    setAnnualDiscountPct(product?.annualDiscountPct ?? null);
    setDurationMinutes(product?.sessionRules?.durationMinutes ?? 60);
    setTotalCapacity(product?.totalCapacity ?? null);
    setSeatingCapacity(product?.seatingCapacity ?? null);
    setSlotCapacity(product?.sessionRules?.slotCapacity ?? 1);
    setMaxBookingsPerDay(product?.sessionRules?.maxBookingsPerDay ?? null);
    setAdvanceBookingDays(product?.sessionRules?.advanceBookingDays ?? null);
    setMaxGuestsPerSlot(product?.guestPolicy?.maxGuestsPerSlot ?? null);
    setAdditionalGuestPrice(product?.guestPolicy?.additionalGuestPrice ?? null);
    setFreeGuestVisits(product?.freeGuestVisits ?? null);
    setIs24Hours(product?.openTime === '00:00' && product?.closeTime === '23:59');
    setOpenTime(product?.openTime ?? '08:00');
    setCloseTime(product?.closeTime ?? '20:00');

    setGymFortnightlyPrice(product?.addonPricing?.fortnightlyPrice ?? 19.95);
    setFamilyRate(product?.addonPricing?.familyRate ?? 10);
    setAnnualPrice(product?.addonPricing?.annualPrice ?? null);
    setSlotStartIntervalMinutes(product?.sessionRules?.slotStartIntervalMinutes ?? 15);
    setMaxMembersPerSlot(product?.sessionRules?.maxMembersPerSlot ?? 10);
    setMinGapHours(product?.sessionRules?.minGapHours ?? 8);
    setFreeGymEntryWithLaneBooking(product?.guestPolicy?.freeGymEntryWithLaneBooking ?? true);
    setFreeTrialSlots(product?.freeTrial?.slotsPerMember ?? 1);
    setMinimumAge(product?.ageRules?.minimumAge ?? 13);
    setParentPresentFrom(product?.ageRules?.parentMustBePresent?.from ?? 13);
    setParentPresentTo(product?.ageRules?.parentMustBePresent?.to ?? 14);
    setConsentFrom(product?.ageRules?.parentalConsentRequired?.from ?? 15);
    setConsentTo(product?.ageRules?.parentalConsentRequired?.to ?? 17);
    setGymPinRequired(product?.pinRules?.gymPinRequired ?? true);
    setGymPinBefore(product?.pinRules?.gymPinWindow?.beforeMinutes ?? 15);
    setGymPinAfter(product?.pinRules?.gymPinWindow?.afterMinutes ?? 15);
    setFacilityPinBefore(product?.pinRules?.facilityPinWindow?.beforeMinutes ?? 15);
    setFacilityPinAfter(product?.pinRules?.facilityPinWindow?.afterMinutes ?? 15);
    setInductionRequired(product?.inductionRequired ?? true);
  }, [product]);

  const isGym = facilityType === 'membership_addon';
  const newCode = isEdit ? '' : slugify(name);
  const codeCollision = !isEdit && !!newCode && existingCodes.includes(newCode);
  const meta = featureMetaFor(isEdit ? (product?.code ?? '') : newCode || 'custom');

  const annualGymPrice = useMemo(() => {
    const base = (gymFortnightlyPrice ?? 0) * 26; // 26 fortnights/year
    const pct = annualDiscountPct ?? 0;
    return base * (1 - pct / 100);
  }, [gymFortnightlyPrice, annualDiscountPct]);

  // Age ranges must not overlap, and minimumAge must be <= the start of the
  // "parent must be present" range (a child below minimumAge has no gym access
  // at all, so the ranges above it must pick up exactly where it leaves off).
  const ageErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!isGym) return errs;
    const minAge = minimumAge ?? 0;
    const pFrom = parentPresentFrom ?? 0;
    const pTo = parentPresentTo ?? 0;
    const cFrom = consentFrom ?? 0;
    const cTo = consentTo ?? 0;
    if (minAge > pFrom) errs.minimumAge = 'Minimum age must be at or below the start of the next age range.';
    if (pFrom > pTo) errs.parentPresent = '"From" must not be after "To".';
    if (cFrom > cTo) errs.parentalConsent = '"From" must not be after "To".';
    if (pFrom <= pTo && cFrom <= cTo && pTo >= cFrom) {
      errs.ageOverlap =
        'Age ranges overlap — the "parental consent" range must start after the "parent present" range ends.';
    }
    return errs;
  }, [isGym, minimumAge, parentPresentFrom, parentPresentTo, consentFrom, consentTo]);

  const errors = useMemo(() => {
    const errs: Record<string, string> = { ...ageErrors };
    if (!name.trim()) errs.name = 'Facility name is required.';
    if (isGym) {
      if (gymFortnightlyPrice === null) errs.gymFortnightlyPrice = 'Required.';
      if (familyRate === null) errs.familyRate = 'Required.';
      if (maxMembersPerSlot === null) errs.maxMembersPerSlot = 'Required.';
    }
    return errs;
  }, [ageErrors, name, isGym, gymFortnightlyPrice, familyRate, maxMembersPerSlot]);

  const canSubmit = Object.keys(errors).length === 0 && !codeCollision && (isEdit || newCode.length > 0);

  const handleSubmit = async () => {
    setTried(true);
    if (!canSubmit || isSaving) return;
    setIsSaving(true);
    // 24 Hours → a fixed sentinel range rather than leaving open/close unset, so
    // an admin who later unchecks it sees the full-day range instead of blanks.
    const effectiveOpenTime = is24Hours ? '00:00' : openTime;
    const effectiveCloseTime = is24Hours ? '23:59' : closeTime;

    const sharedFields = {
      name: name.trim(),
      status,
      annualDiscountPct: annualDiscountPct ?? undefined,
      advanceBookingDays: advanceBookingDays ?? undefined,
      additionalGuestPrice: additionalGuestPrice ?? undefined,
      freeGuestVisits: freeGuestVisits ?? undefined,
      openTime: effectiveOpenTime,
      closeTime: effectiveCloseTime,
    };

    const gymFields = {
      bookingModel: 'membership_addon' as const,
      addonPricing: {
        fortnightlyPrice: gymFortnightlyPrice ?? 0,
        familyRate: familyRate ?? 0,
        annualPrice: annualPrice ?? undefined,
      },
      durationMinutes: durationMinutes ?? 60,
      slotStartIntervalMinutes,
      maxMembersPerSlot: maxMembersPerSlot ?? 10,
      minGapHours: minGapHours ?? 0,
      noWalkIns: true,
      maxGuestsPerSlot: maxMembersPerSlot ?? 10,
      guestsCountTowardCapacity: true,
      freeGymEntryWithLaneBooking,
      freeTrial: { slotsPerMember: freeTrialSlots },
      ageRules: {
        minimumAge: minimumAge ?? 0,
        parentMustBePresent: { from: parentPresentFrom ?? 0, to: parentPresentTo ?? 0 },
        parentalConsentRequired: { from: consentFrom ?? 0, to: consentTo ?? 0 },
      },
      pinRules: {
        gymPinRequired,
        gymPinWindow: { beforeMinutes: gymPinBefore ?? 0, afterMinutes: gymPinAfter ?? 0 },
        facilityPinWindow: { beforeMinutes: facilityPinBefore ?? 0, afterMinutes: facilityPinAfter ?? 0 },
      },
      inductionRequired,
    };

    const payPerSlotFields = {
      price: price ?? 0,
      durationMinutes: durationMinutes ?? 60,
      totalCapacity: totalCapacity ?? undefined,
      seatingCapacity: seatingCapacity ?? undefined,
      slotCapacity: slotCapacity ?? 1,
      concurrentCapacity: slotCapacity ?? undefined,
      maxBookingsPerDay: maxBookingsPerDay ?? undefined,
      maxGuestsPerSlot: maxGuestsPerSlot ?? undefined,
    };

    try {
      if (isEdit && product) {
        await dispatch(
          updateCentreFacilities({
            centreId: centreCode,
            productUpdates: [{ code: product.code, ...sharedFields, ...(isGym ? gymFields : payPerSlotFields) }],
          })
        ).unwrap();
        toast.success(`"${name.trim()}" updated.`);
      } else if (isGym) {
        await dispatch(
          updateCentreFacilities({
            centreId: centreCode,
            products: [
              {
                type: 'product',
                code: newCode,
                ...sharedFields,
                isAddon: true,
                bookingModel: 'membership_addon',
                addonPricing: gymFields.addonPricing,
                sessionRules: {
                  durationMinutes: durationMinutes ?? 60,
                  slotStartIntervalMinutes,
                  maxMembersPerSlot: maxMembersPerSlot ?? 10,
                  minGapHours: minGapHours ?? 0,
                  advanceBookingDays: advanceBookingDays ?? undefined,
                  noWalkIns: true,
                },
                guestPolicy: {
                  maxGuestsPerSlot: maxMembersPerSlot ?? 10,
                  additionalGuestPrice: additionalGuestPrice ?? undefined,
                  guestsCountTowardCapacity: true,
                  freeGymEntryWithLaneBooking,
                },
                freeTrial: gymFields.freeTrial,
                ageRules: gymFields.ageRules,
                pinRules: gymFields.pinRules,
                inductionRequired,
              },
            ],
          })
        ).unwrap();
        toast.success(`"${name.trim()}" added.`);
      } else {
        await dispatch(
          updateCentreFacilities({
            centreId: centreCode,
            products: [
              {
                type: 'product',
                code: newCode,
                ...sharedFields,
                slotPricing: { default: { price: price ?? 0, currency: 'usd' } },
                sessionRules: {
                  durationMinutes: durationMinutes ?? 60,
                  slotCapacity: slotCapacity ?? 1,
                  maxBookingsPerDay: maxBookingsPerDay ?? undefined,
                  advanceBookingDays: advanceBookingDays ?? undefined,
                },
                guestPolicy: {
                  maxGuestsPerSlot: maxGuestsPerSlot ?? undefined,
                  additionalGuestPrice: additionalGuestPrice ?? undefined,
                },
                totalCapacity: totalCapacity ?? undefined,
                concurrentCapacity: slotCapacity ?? undefined,
                seatingCapacity: seatingCapacity ?? undefined,
              },
            ],
          })
        ).unwrap();
        toast.success(`"${name.trim()}" added.`);
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error((error as string) || 'Could not save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const showErr = (key: string) => tried && errors[key] && <p className={FIELD_ERROR}>{errors[key]}</p>;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="button"
      tabIndex={0}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        role="dialog"
        style={{
          background: '#fff',
          borderRadius: 12,
          width: '90vw',
          maxWidth: 900,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 6px 20px rgba(16,24,40,.12)',
        }}
      >
        {/* Header — same icon-circle + title layout as the wizard's facility panels */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderBottom: '1px solid var(--border)',
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: meta.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            {meta.icon}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>
            {isEdit ? `Edit ${product?.name || 'Facility'}` : 'Add Bookable Facility'}
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <label className="flex flex-col gap-1" style={{ marginBottom: 12 }}>
            <span className={FIELD_LABEL}>Facility type *</span>
            <select
              className={FF_INPUT}
              disabled={isEdit}
              value={facilityType}
              onChange={e => setFacilityType(e.target.value as FacilityType)}
            >
              {FACILITY_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {isEdit && <span className={HELPER_TEXT}>Facility type can&apos;t be changed after creation.</span>}
          </label>

          <label className="flex flex-col gap-1" style={{ marginBottom: 12 }}>
            <span className={FIELD_LABEL}>Facility name *</span>
            <input className={FF_INPUT} type="text" value={name} onChange={e => setName(e.target.value)} />
            {showErr('name')}
            {codeCollision && (
              <span className={FIELD_ERROR}>A facility with this name already exists — choose a different name.</span>
            )}
          </label>

          <label className="flex flex-col gap-1" style={{ marginBottom: 12 }}>
            <span className={FIELD_LABEL}>Status</span>
            <select className={FF_INPUT} value={status} onChange={e => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <SectionLabel>{isGym ? 'Gym Pricing' : 'Pricing'}</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {!isGym && (
              <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>Price per slot ($)</span>
                <NumberInput className={FF_INPUT} min={0} step={0.01} value={price} onValueChange={setPrice} />
              </label>
            )}
            {isGym && (
              <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>Fortnightly gym add-on price ($) *</span>
                <NumberInput
                  className={FF_INPUT}
                  min={0}
                  step={0.01}
                  value={gymFortnightlyPrice}
                  onValueChange={setGymFortnightlyPrice}
                />
                {showErr('gymFortnightlyPrice')}
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Annual discount (%)</span>
              <NumberInput
                className={FF_INPUT}
                max={100}
                min={0}
                value={annualDiscountPct}
                onValueChange={setAnnualDiscountPct}
              />
            </label>
            {isGym && (
              <>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Annual price ($)</span>
                  <NumberInput
                    className={FF_INPUT}
                    min={0}
                    placeholder={money(annualGymPrice)}
                    step={0.01}
                    value={annualPrice}
                    onValueChange={setAnnualPrice}
                  />
                  <span className={HELPER_TEXT}>
                    Leave blank to use the calculated price ({money(annualGymPrice)}).
                  </span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Family gym rate ($ per fortnight) *</span>
                  <NumberInput
                    className={FF_INPUT}
                    min={0}
                    step={0.01}
                    value={familyRate}
                    onValueChange={setFamilyRate}
                  />
                  <span className={HELPER_TEXT}>Per member — same rate for 2 to 4 family members.</span>
                  {showErr('familyRate')}
                </label>
              </>
            )}
          </div>

          <SectionLabel>Capacity &amp; Access</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Session duration</span>
              <select
                className={FF_INPUT}
                value={durationMinutes ?? 60}
                onChange={e => setDurationMinutes(Number(e.target.value))}
              >
                {DURATION_OPTIONS.map(o => (
                  <option key={o.minutes} value={o.minutes}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {isGym && (
              <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>Slot start interval</span>
                <select
                  className={FF_INPUT}
                  value={slotStartIntervalMinutes}
                  onChange={e => setSlotStartIntervalMinutes(Number(e.target.value))}
                >
                  {SLOT_START_INTERVAL_OPTIONS.map(m => (
                    <option key={m} value={m}>
                      {m} minutes
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!isGym && (
              <>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Total capacity</span>
                  <NumberInput className={FF_INPUT} min={0} value={totalCapacity} onValueChange={setTotalCapacity} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Max concurrent users</span>
                  <NumberInput className={FF_INPUT} min={1} value={slotCapacity} onValueChange={setSlotCapacity} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Seating capacity</span>
                  <NumberInput
                    className={FF_INPUT}
                    min={0}
                    value={seatingCapacity}
                    onValueChange={setSeatingCapacity}
                  />
                </label>
              </>
            )}
            {isGym && (
              <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>Max members per slot *</span>
                <NumberInput
                  className={FF_INPUT}
                  min={1}
                  value={maxMembersPerSlot}
                  onValueChange={setMaxMembersPerSlot}
                />
                {showErr('maxMembersPerSlot')}
              </label>
            )}
          </div>

          <SectionLabel>Guest Access</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Extra guest price ($)</span>
              <NumberInput
                className={FF_INPUT}
                min={0}
                step={0.01}
                value={additionalGuestPrice}
                onValueChange={setAdditionalGuestPrice}
              />
            </label>
            {!isGym && (
              <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>Max guests / slot</span>
                <NumberInput
                  className={FF_INPUT}
                  min={0}
                  value={maxGuestsPerSlot}
                  onValueChange={setMaxGuestsPerSlot}
                />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>
                {isGym ? 'Free guests per billing cycle' : 'Free guest visits / month'}
              </span>
              <NumberInput className={FF_INPUT} min={0} value={freeGuestVisits} onValueChange={setFreeGuestVisits} />
              {isGym && <span className={HELPER_TEXT}>Billing cycle is fortnightly.</span>}
            </label>
            {isGym && (
              <label
                className="flex items-center gap-1.5 text-[12px] font-medium text-cmx-text"
                style={{ marginTop: 18 }}
              >
                <input
                  checked={freeGymEntryWithLaneBooking}
                  type="checkbox"
                  onChange={e => setFreeGymEntryWithLaneBooking(e.target.checked)}
                />
                Free gym entry for guests on the same day&apos;s lane booking
              </label>
            )}
          </div>

          {isGym && (
            <>
              <SectionLabel>Free Trial</SectionLabel>
              <div style={{ marginBottom: 12 }}>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Free trial gym slots per member</span>
                  <select
                    className={FF_INPUT}
                    value={freeTrialSlots}
                    onChange={e => setFreeTrialSlots(Number(e.target.value) as 0 | 1 | 2)}
                  >
                    {FREE_TRIAL_OPTIONS.map(n => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <span className={HELPER_TEXT}>Once per member lifetime. Not available for guests.</span>
                </label>
              </div>

              <SectionLabel>Age Rules</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 4 }}>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Minimum age</span>
                  <NumberInput className={FF_INPUT} min={0} value={minimumAge} onValueChange={setMinimumAge} />
                  {showErr('minimumAge')}
                </label>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Parent must be present (from — to)</span>
                  <div className="flex items-center gap-2">
                    <NumberInput
                      className={FF_INPUT}
                      min={0}
                      value={parentPresentFrom}
                      onValueChange={setParentPresentFrom}
                    />
                    <span>–</span>
                    <NumberInput
                      className={FF_INPUT}
                      min={0}
                      value={parentPresentTo}
                      onValueChange={setParentPresentTo}
                    />
                  </div>
                  {showErr('parentPresent')}
                </label>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Parental consent required (from — to)</span>
                  <div className="flex items-center gap-2">
                    <NumberInput className={FF_INPUT} min={0} value={consentFrom} onValueChange={setConsentFrom} />
                    <span>–</span>
                    <NumberInput className={FF_INPUT} min={0} value={consentTo} onValueChange={setConsentTo} />
                  </div>
                  {showErr('parentalConsent')}
                </label>
              </div>
              {showErr('ageOverlap')}
              <p className={HELPER_TEXT} style={{ marginBottom: 12 }}>
                Age limits for non-US centres are not yet decided — review before launch outside the US.
              </p>
            </>
          )}

          <SectionLabel>Booking Rules</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {!isGym && (
              <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>Max bookings / day</span>
                <NumberInput
                  className={FF_INPUT}
                  min={0}
                  value={maxBookingsPerDay}
                  onValueChange={setMaxBookingsPerDay}
                />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Advance booking (days)</span>
              <NumberInput
                className={FF_INPUT}
                min={0}
                value={advanceBookingDays}
                onValueChange={setAdvanceBookingDays}
              />
            </label>
            {isGym && (
              <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>Minimum gap between sessions (hours)</span>
                <NumberInput className={FF_INPUT} min={0} value={minGapHours} onValueChange={setMinGapHours} />
                <span className={HELPER_TEXT}>For Premium members booking more than one session a day.</span>
              </label>
            )}
          </div>

          {isGym && (
            <>
              <SectionLabel>Access &amp; PINs</SectionLabel>
              <label
                className="flex items-center gap-1.5 text-[12px] font-medium text-cmx-text"
                style={{ marginBottom: 10 }}
              >
                <input checked={gymPinRequired} type="checkbox" onChange={e => setGymPinRequired(e.target.checked)} />
                Gym PIN required
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Gym PIN active — minutes before slot start</span>
                  <NumberInput className={FF_INPUT} min={0} value={gymPinBefore} onValueChange={setGymPinBefore} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Gym PIN active — minutes after slot end</span>
                  <NumberInput className={FF_INPUT} min={0} value={gymPinAfter} onValueChange={setGymPinAfter} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Facility PIN (gym-only bookings) — minutes before</span>
                  <NumberInput
                    className={FF_INPUT}
                    min={0}
                    value={facilityPinBefore}
                    onValueChange={setFacilityPinBefore}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Facility PIN (gym-only bookings) — minutes after</span>
                  <NumberInput
                    className={FF_INPUT}
                    min={0}
                    value={facilityPinAfter}
                    onValueChange={setFacilityPinAfter}
                  />
                </label>
              </div>

              <SectionLabel>Induction</SectionLabel>
              <label
                className="flex items-center gap-1.5 text-[12px] font-medium text-cmx-text"
                style={{ marginBottom: 12 }}
              >
                <input
                  checked={inductionRequired}
                  type="checkbox"
                  onChange={e => setInductionRequired(e.target.checked)}
                />
                Induction required before first gym booking
              </label>
            </>
          )}

          <div className="flex items-center justify-between" style={{ margin: '4px 0 10px' }}>
            <SectionLabel>Operating Hours</SectionLabel>
            <label className="flex items-center gap-1.5 text-[12px] font-medium text-cmx-text">
              <input checked={is24Hours} type="checkbox" onChange={e => setIs24Hours(e.target.checked)} />
              24 Hours
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Opens</span>
              <input
                className={FF_INPUT}
                disabled={is24Hours}
                type="time"
                value={openTime}
                onChange={e => setOpenTime(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Closes</span>
              <input
                className={FF_INPUT}
                disabled={is24Hours}
                type="time"
                value={closeTime}
                onChange={e => setCloseTime(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            borderTop: '1px solid var(--border)',
            padding: '14px 20px',
          }}
        >
          <button className="cmx-btn cmx-btn-outline" disabled={isSaving} type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="cmx-btn cmx-btn-navy"
            disabled={!canSubmit || isSaving}
            type="button"
            onClick={handleSubmit}
          >
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Facility'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FacilityProductModal;
