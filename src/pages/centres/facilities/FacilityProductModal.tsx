import { useEffect, useMemo, useRef, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import NumberInput from '../../../components/NumberInput';
import { updateCentreFacilities, uploadProductImage } from '../../../store/centres/api';
import { AppDispatch } from '../../../store/store';

import { featureMetaFor } from './productMeta';

import type { ApiMembership, ApiProduct } from '../../../store/centres/types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'draft', label: 'Draft' },
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

// Sentinel <select> value for "Custom…" — distinct from any real minutes
// value, which is always a positive number as a string.
const CUSTOM_OPTION = 'custom';

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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

type ImageItem = { blobName: string; previewUrl: string; uploading?: boolean };

/**
 * Upload product images directly to blob storage via a write SAS (see
 * uploadProductImage), same pattern the wizard's PhotoUpload picker uses for
 * the UI but, unlike that one, actually persisted on the product doc
 * (`images`) rather than a browser-only preview.
 */
const ImageUpload: React.FC<{
  centreCode: string;
  images: ImageItem[];
  maxImages: number;
  busy?: boolean;
  onChange: (images: ImageItem[]) => void;
  onError: (message: string | null) => void;
}> = ({ centreCode, images, maxImages, busy, onChange, onError }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    const urls = images.map(i => i.previewUrl).filter(u => u.startsWith('blob:'));
    return () => urls.forEach(url => URL.revokeObjectURL(url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isUploading = images.some(i => i.uploading);

  const pickFiles = async (files: File[]) => {
    onError(null);
    if (isUploading) {
      onError('Please wait for the current upload to finish.');
      return;
    }
    if (images.length + files.length > maxImages) {
      onError(`You can upload at most ${maxImages} images.`);
      return;
    }
    const oversized = files.find(f => f.size > MAX_IMAGE_BYTES);
    if (oversized) {
      onError('Image too large — must be 5 MB or less.');
      return;
    }

    const startIdx = images.length;
    const placeholders: ImageItem[] = files.map(f => ({
      blobName: '',
      previewUrl: URL.createObjectURL(f),
      uploading: true,
    }));
    const withPlaceholders = [...images, ...placeholders];
    onChange(withPlaceholders);

    const results = await Promise.allSettled(files.map(file => uploadProductImage(centreCode, file)));
    const next = [...withPlaceholders];
    let anyFailed = false;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        next[startIdx + i] = { blobName: r.value, previewUrl: placeholders[i].previewUrl, uploading: false };
      } else {
        anyFailed = true;
      }
    });
    if (anyFailed) {
      onChange(next.filter((img, idx) => !(idx >= startIdx && img.uploading)));
      onError('Some images failed to upload — please try again.');
    } else {
      onChange(next);
    }
  };

  const removeAt = (index: number) => {
    const url = images[index].previewUrl;
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    onChange(images.filter((_, i) => i !== index));
  };

  const inputEl = (
    <input
      ref={inputRef}
      multiple
      accept="image/png,image/jpeg,image/gif,image/webp"
      disabled={busy || isUploading}
      style={{ display: 'none' }}
      type="file"
      onChange={e => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = '';
        if (files.length) void pickFiles(files);
      }}
    />
  );

  return (
    <>
      <div
        style={{
          border: '1.5px dashed var(--border)',
          borderRadius: 8,
          minHeight: 64,
          padding: '8px 12px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: images.length ? 'flex-start' : 'center',
          gap: 12,
          background: '#fff',
        }}
      >
        {images.length === 0 && (
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              cursor: busy ? 'default' : 'pointer',
              width: '100%',
            }}
          >
            <svg fill="none" height={16} stroke="var(--muted)" strokeWidth={2} viewBox="0 0 24 24" width={16}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            <span style={{ fontSize: 11, color: 'var(--sub)' }}>Upload images</span>
            {inputEl}
          </label>
        )}
        {images.map((img, i) => (
          <div
            key={img.previewUrl}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 84 }}
          >
            <button
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: img.uploading ? 'default' : 'zoom-in',
                position: 'relative',
              }}
              title={img.uploading ? 'Uploading…' : 'Click to preview'}
              type="button"
              onClick={() => !img.uploading && setLightboxUrl(img.previewUrl)}
            >
              <img
                alt="Preview"
                src={img.previewUrl}
                style={{ height: 40, borderRadius: 4, objectFit: 'cover', opacity: img.uploading ? 0.5 : 1 }}
              />
            </button>
            <span style={{ fontSize: 11, color: 'var(--sub)' }}>{img.uploading ? 'Uploading…' : 'Image'}</span>
            <button
              disabled={busy}
              style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 11, cursor: 'pointer' }}
              type="button"
              onClick={() => removeAt(i)}
            >
              Remove
            </button>
          </div>
        ))}
        {images.length > 0 && images.length < maxImages && (
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              width: 84,
              height: 64,
              border: '1.5px dashed var(--border)',
              borderRadius: 8,
              cursor: busy ? 'default' : 'pointer',
            }}
          >
            <span style={{ fontSize: 20, color: 'var(--muted)', lineHeight: 1 }}>+</span>
            <span style={{ fontSize: 10, color: 'var(--sub)' }}>Add</span>
            {inputEl}
          </label>
        )}
      </div>
      {lightboxUrl && (
        <div
          role="button"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(0,0,0,.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
          }}
          tabIndex={0}
          onClick={() => setLightboxUrl(null)}
          onKeyDown={e => e.key === 'Escape' && setLightboxUrl(null)}
        >
          <img alt="Preview" src={lightboxUrl} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }} />
        </div>
      )}
    </>
  );
};

interface Props {
  centreCode: string;
  /** null = Add New; otherwise editing this existing product. */
  product: ApiProduct | null;
  /** Every other product's code at this centre — blocks an Add New that would
   * collide (the backend's `products` is create-only, so a collision would
   * otherwise silently no-op instead of saving). */
  existingCodes: string[];
  /** This centre's assigned membership plans — drives the per-plan "minimum
   * gap between sessions" rows (Gym only). */
  plans: ApiMembership[];
  onClose: () => void;
  /** Called after a successful save so the page refetches the live bundle. */
  onSaved: () => void;
}

const FacilityProductModal: React.FC<Props> = ({ centreCode, product, existingCodes, plans, onClose, onSaved }) => {
  const dispatch = useDispatch<AppDispatch>();
  const isEdit = !!product;

  const [facilityType, setFacilityType] = useState<FacilityType>('pay_per_slot');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('active');
  const [description, setDescription] = useState('');

  // Images — uploaded via uploadProductImage (blob SAS), stored as blobNames
  // on the product and resolved to SAS read URLs on every read. `previewUrl`
  // is what's rendered (the resolved URL on edit, a local object URL for a
  // just-picked file still mid-upload).
  const [images, setImages] = useState<{ blobName: string; previewUrl: string; uploading?: boolean }[]>([]);
  const [imagesError, setImagesError] = useState<string | null>(null);

  // Pay-per-slot fields — hourly, variable-length pricing: a member picks any
  // whole number of hours from 1 up to maxBookableHours, and pays pricePerHour
  // × however many they book. Replaces the old fixed "price per slot" + fixed
  // session duration entirely. No separate "min" — it's always 1 hour.
  const [pricePerHour, setPricePerHour] = useState<number | null>(null);
  const [maxBookableHours, setMaxBookableHours] = useState<number | null>(1);
  const [totalCapacity, setTotalCapacity] = useState<number | null>(null);
  // Door PIN window for this room — pay-per-slot only (Gym has its own
  // separate gymPinBefore/facilityPinBefore, two doors instead of one).
  const [doorPinBefore, setDoorPinBefore] = useState<number | null>(15);
  const [roomFacilityPinBefore, setRoomFacilityPinBefore] = useState<number | null>(15);

  // Shared fields (both facility types).
  const [annualDiscountPct, setAnnualDiscountPct] = useState<number | null>(null);
  // Gym's own fixed "Session duration" — unaffected by the pay-per-slot
  // hourly-pricing change above.
  const [durationMinutes, setDurationMinutes] = useState<number | null>(60);
  // true once the admin picks "Custom…" (or the stored value doesn't match
  // any preset, e.g. an existing facility with a 75-minute session).
  const [durationCustomMode, setDurationCustomMode] = useState(false);
  const [maxBookingsPerDay, setMaxBookingsPerDay] = useState<number | null>(null);
  const [advanceBookingDays, setAdvanceBookingDays] = useState<number | null>(null);
  const [additionalGuestPrice, setAdditionalGuestPrice] = useState<number | null>(null);
  const [freeGuestVisits, setFreeGuestVisits] = useState<number | null>(null);
  const [is24Hours, setIs24Hours] = useState(false);
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('20:00');

  // Gym — pricing.
  const [gymFortnightlyPrice, setGymFortnightlyPrice] = useState<number | null>(19.95);
  // null = use the calculated annual price (fortnightly × 26 × discount); a
  // typed value overrides it, e.g. for a promotional annual price that doesn't
  // match the discount math exactly.
  const [annualPrice, setAnnualPrice] = useState<number | null>(null);

  // Gym — capacity & booking.
  const [slotStartIntervalMinutes, setSlotStartIntervalMinutes] = useState(15);
  const [slotIntervalCustomMode, setSlotIntervalCustomMode] = useState(false);
  const [maxMembersPerSlot, setMaxMembersPerSlot] = useState<number | null>(10);
  // Minimum gap (hours) between a member's gym sessions, per membership plan
  // assigned to this centre (e.g. Premium members can book more than once a
  // day with a shorter gap than Standard) — keyed by plan code.
  const [gapHoursByPlan, setGapHoursByPlan] = useState<Record<string, number | null>>({});

  // Gym — free trial.
  const [freeTrialSlots, setFreeTrialSlots] = useState<0 | 1 | 2>(1);

  // Gym — age rules. A ladder, not four independent numbers: each range picks
  // up exactly where the previous one ends, so only the three boundaries are
  // admin-entered — "parent must be present FROM" is always minimumAge itself,
  // and "consent required FROM" is always parentPresentTo + 1.
  const [minimumAge, setMinimumAge] = useState<number | null>(13);
  const [parentPresentTo, setParentPresentTo] = useState<number | null>(14);
  const [consentTo, setConsentTo] = useState<number | null>(17);

  // Gym — access & PINs. Both doors' "minutes after" windows are fixed at 0
  // (access ends right at the relevant time) — not admin-configurable. A
  // door's presence in accessControl (reference schema) IS it being
  // enabled — there's no separate on/off flag to configure.
  const [gymPinBefore, setGymPinBefore] = useState<number | null>(15);
  const [facilityPinBefore, setFacilityPinBefore] = useState<number | null>(15);

  // Gym — induction.
  const [inductionRequired, setInductionRequired] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    const isGym = product?.bookingModel === 'membership_addon';
    setFacilityType(isGym ? 'membership_addon' : 'pay_per_slot');
    setName(product?.name ?? '');
    setStatus(product?.status || 'active');
    setDescription(product?.description ?? '');
    setImages((product?.images ?? []).map(img => ({ blobName: img.blobName, previewUrl: img.url })));
    setImagesError(null);
    setPricePerHour((product?.pricing as { perHour?: number } | undefined)?.perHour ?? null);
    setMaxBookableHours(product?.sessionRules?.maxHours ?? 1);
    setAnnualDiscountPct(product?.annualDiscountPct ?? null);
    if (isGym) {
      const d = product?.sessionRules?.durationMinutes ?? 60;
      setDurationMinutes(d);
      setDurationCustomMode(!DURATION_OPTIONS.some(o => o.minutes === d));
    }
    if (!isGym) {
      // accessControl is the SAME per-door map shape as Gym's — this room's
      // own door keyed by its own code, the building's main door as "mainDoor".
      setDoorPinBefore(product?.accessControl?.[product?.code ?? '']?.preAccessTime ?? 15);
      setRoomFacilityPinBefore(product?.accessControl?.mainDoor?.preAccessTime ?? 15);
    }
    setTotalCapacity(product?.totalCapacity ?? null);
    setMaxBookingsPerDay(product?.sessionRules?.maxBookingsPerDay ?? null);
    setAdvanceBookingDays(product?.sessionRules?.advanceBookingDays ?? null);
    setAdditionalGuestPrice(product?.guestPolicy?.additionalGuestPrice ?? null);
    setFreeGuestVisits((isGym ? product?.guestPolicy?.freeGuestsPerBillingCycle : product?.freeGuestVisits) ?? null);
    setIs24Hours(product?.openTime === '00:00' && product?.closeTime === '23:59');
    setOpenTime(product?.openTime ?? '08:00');
    setCloseTime(product?.closeTime ?? '20:00');

    setGymFortnightlyPrice(
      (product?.pricing as { individual?: { fortnightly?: number } } | undefined)?.individual?.fortnightly ?? 19.95
    );
    setAnnualPrice(product?.addonPricing?.annualPriceOverride ?? null);
    {
      const si = product?.sessionRules?.slotIncrementMinutes ?? 15;
      setSlotStartIntervalMinutes(si);
      setSlotIntervalCustomMode(!SLOT_START_INTERVAL_OPTIONS.includes(si));
    }
    // Gym's own per-slot capacity is stored at sessionRules.slotCapacity in the
    // reference schema — same JSON key pay-per-slot's "Max concurrent users"
    // uses for its own, unrelated meaning; the two are mutually exclusive per
    // bookingModel so this is safe.
    setMaxMembersPerSlot(product?.sessionRules?.slotCapacity ?? 10);
    {
      const saved = product?.sessionRules?.bookingFrequency ?? {};
      setGapHoursByPlan(Object.fromEntries(plans.map(pl => [pl.code, saved[pl.code] ?? 8])));
    }
    setFreeTrialSlots((product?.freeTrial?.slotsPerMembershipLifetime as 0 | 1 | 2 | undefined) ?? 1);
    setMinimumAge(product?.ageRules?.minAge ?? 13);
    setParentPresentTo(product?.ageRules?.supervisedRange?.max ?? 14);
    setConsentTo(product?.ageRules?.consentRange?.max ?? 17);
    {
      const gymAccess = product?.accessControl as Record<string, { preAccessTime?: number }> | undefined;
      setGymPinBefore(gymAccess?.[product?.code ?? '']?.preAccessTime ?? 15);
      setFacilityPinBefore(gymAccess?.mainDoor?.preAccessTime ?? 15);
    }
    setInductionRequired(product?.inductionRequired ?? true);
  }, [product, plans]);

  const isGym = facilityType === 'membership_addon';
  const newCode = isEdit ? '' : slugify(name);
  const codeCollision = !isEdit && !!newCode && existingCodes.includes(newCode);
  const meta = featureMetaFor(isEdit ? (product?.code ?? '') : newCode || 'custom');

  const annualGymPrice = useMemo(() => {
    const base = (gymFortnightlyPrice ?? 0) * 26; // 26 fortnights/year
    const pct = annualDiscountPct ?? 0;
    return base * (1 - pct / 100);
  }, [gymFortnightlyPrice, annualDiscountPct]);

  // Draft = "still being configured, not visible to members at all" — unlike
  // Active/Coming Soon/Inactive, saving as a draft skips every required-field
  // check below except the facility name, so an admin can save a half-filled
  // form and come back later instead of losing everything typed so far.
  const isDraft = status === 'draft';

  // A ladder, not independent ranges: below minimumAge, no access at all;
  // [minimumAge, parentPresentTo] needs a parent present; [parentPresentTo+1,
  // consentTo] needs signed consent instead; consentTo+1 and up is
  // unrestricted. Each boundary only needs to be >= the one before it.
  const ageErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!isGym || isDraft) return errs;
    const minAge = minimumAge ?? 0;
    const pTo = parentPresentTo ?? 0;
    const cTo = consentTo ?? 0;
    if (pTo < minAge) {
      errs.parentPresent = 'Must be at or after the minimum age.';
    }
    if (cTo < pTo + 1) {
      errs.parentalConsent = 'Must be after the "parent must be present" age ends.';
    }
    return errs;
  }, [isGym, isDraft, minimumAge, parentPresentTo, consentTo]);

  const errors = useMemo(() => {
    const errs: Record<string, string> = { ...ageErrors };
    if (!name.trim()) errs.name = 'Facility name is required.';
    if (isDraft) return errs;
    if (durationCustomMode && !(durationMinutes && durationMinutes > 0)) {
      errs.durationMinutes = 'Enter a custom duration in minutes.';
    }
    if (isGym) {
      if (gymFortnightlyPrice === null) errs.gymFortnightlyPrice = 'Required.';
      if (maxMembersPerSlot === null) errs.maxMembersPerSlot = 'Required.';
      if (slotIntervalCustomMode && !(slotStartIntervalMinutes && slotStartIntervalMinutes > 0)) {
        errs.slotStartIntervalMinutes = 'Enter a custom interval in minutes.';
      }
    } else {
      if (!(maxBookableHours && maxBookableHours > 0)) errs.maxBookableHours = 'Required, at least 1 hour.';
    }
    return errs;
  }, [
    ageErrors,
    name,
    isDraft,
    durationCustomMode,
    durationMinutes,
    isGym,
    gymFortnightlyPrice,
    maxMembersPerSlot,
    slotIntervalCustomMode,
    slotStartIntervalMinutes,
    maxBookableHours,
  ]);

  const imagesUploading = images.some(img => img.uploading);
  const canSubmit =
    Object.keys(errors).length === 0 && !codeCollision && (isEdit || newCode.length > 0) && !imagesUploading;

  // `saveAsDraft` bypasses the full-validation gate (`canSubmit`) entirely —
  // only the facility name (and code collision) must be satisfied — and
  // forces the saved status to "draft" regardless of whatever the Status
  // dropdown currently shows, so a half-filled form can be saved without
  // first switching that dropdown by hand.
  const handleSubmit = async (saveAsDraft = false) => {
    setTried(true);
    if (isSaving || imagesUploading) return;
    if (saveAsDraft) {
      if (!name.trim() || codeCollision || (!isEdit && newCode.length === 0)) return;
    } else if (!canSubmit) {
      return;
    }
    setIsSaving(true);
    // 24 Hours → a fixed sentinel range rather than leaving open/close unset, so
    // an admin who later unchecks it sees the full-day range instead of blanks.
    const effectiveOpenTime = is24Hours ? '00:00' : openTime;
    const effectiveCloseTime = is24Hours ? '23:59' : closeTime;

    const sharedFields = {
      name: name.trim(),
      status: saveAsDraft ? 'draft' : status,
      description: description.trim() || undefined,
      // Always the FULL current list — see ApiProductUpdateInput.images.
      images: images.map(img => img.blobName),
      advanceBookingDays: advanceBookingDays ?? undefined,
      openTime: effectiveOpenTime,
      closeTime: effectiveCloseTime,
    };

    // Full current map, every assigned plan — same convention as `images`.
    const gymBookingFrequency = Object.fromEntries(plans.map(pl => [pl.code, gapHoursByPlan[pl.code] ?? 0]));

    const gymFields = {
      bookingModel: 'membership_addon' as const,
      annualDiscountPct: annualDiscountPct ?? undefined,
      additionalGuestPrice: additionalGuestPrice ?? undefined,
      freeGuestVisits: freeGuestVisits ?? undefined,
      addonPricing: {
        fortnightlyPrice: gymFortnightlyPrice ?? 0,
        // Explicit null (not undefined-collapsed to an absent key) when not
        // overridden — the backend trusts exactly what's sent here to tell
        // "no override" apart from "admin cleared a previous override".
        annualPrice,
      },
      durationMinutes: durationMinutes ?? 60,
      slotStartIntervalMinutes,
      maxMembersPerSlot: maxMembersPerSlot ?? 10,
      bookingFrequency: gymBookingFrequency,
      noWalkIns: true,
      maxGuestsPerSlot: maxMembersPerSlot ?? 10,
      guestsCountTowardCapacity: true,
      // Not admin-configurable — always on (see Guest Access section).
      freeGymEntryWithLaneBooking: true,
      freeTrial: { slotsPerMember: freeTrialSlots },
      // Ladder, not independent ranges — "from" of each range is always
      // exactly where the previous one leaves off (see the ageErrors comment).
      ageRules: {
        minimumAge: minimumAge ?? 0,
        parentMustBePresent: { from: minimumAge ?? 0, to: parentPresentTo ?? 0 },
        parentalConsentRequired: { from: (parentPresentTo ?? 0) + 1, to: consentTo ?? 0 },
      },
      // Reference schema (accessControl) tracks only a single preAccessTime per
      // door — no on/off flag, no "minutes after". Built server-side from this.
      pinRules: {
        gymPinWindow: { beforeMinutes: gymPinBefore ?? 0 },
        facilityPinWindow: { beforeMinutes: facilityPinBefore ?? 0 },
      },
      inductionRequired,
    };

    const payPerSlotFields = {
      pricePerHour: pricePerHour ?? 0,
      minHours: 1,
      maxHours: maxBookableHours ?? 1,
      totalCapacity: totalCapacity ?? undefined,
      maxBookingsPerDay: maxBookingsPerDay ?? undefined,
      doorPinBeforeMinutes: doorPinBefore ?? 0,
      facilityPinBeforeMinutes: roomFacilityPinBefore ?? 0,
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
                annualDiscountPct: annualDiscountPct ?? undefined,
                freeGuestVisits: freeGuestVisits ?? undefined,
                isAddon: true,
                bookingModel: 'membership_addon',
                addonPricing: gymFields.addonPricing,
                sessionRules: {
                  durationMinutes: durationMinutes ?? 60,
                  slotStartIntervalMinutes,
                  maxMembersPerSlot: maxMembersPerSlot ?? 10,
                  bookingFrequency: gymBookingFrequency,
                  advanceBookingDays: advanceBookingDays ?? undefined,
                  noWalkIns: true,
                },
                guestPolicy: {
                  maxGuestsPerSlot: maxMembersPerSlot ?? 10,
                  additionalGuestPrice: additionalGuestPrice ?? undefined,
                  guestsCountTowardCapacity: true,
                  freeGymEntryWithLaneBooking: true,
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
                pricing: { perHour: pricePerHour ?? 0, currency: 'usd' },
                sessionRules: {
                  minHours: 1,
                  maxHours: maxBookableHours ?? 1,
                  maxBookingsPerDay: maxBookingsPerDay ?? undefined,
                  advanceBookingDays: advanceBookingDays ?? undefined,
                },
                doorPin: { beforeMinutes: doorPinBefore ?? 0 },
                facilityPin: { beforeMinutes: roomFacilityPinBefore ?? 0 },
                totalCapacity: totalCapacity ?? undefined,
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
            justifyContent: 'space-between',
            gap: 12,
            borderBottom: '1px solid var(--border)',
            padding: '16px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
              flexShrink: 0,
            }}
            type="button"
            onClick={onClose}
          >
            ×
          </button>
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

          <label className="flex flex-col gap-1" style={{ marginBottom: 12 }}>
            <span className={FIELD_LABEL}>Rules and Guidelines</span>
            <textarea
              className={FF_INPUT}
              placeholder="Cancellation policy, room rules, usage guidelines shown to members and guests…"
              rows={3}
              style={{ resize: 'vertical' }}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </label>

          <div className="flex flex-col gap-1" style={{ marginBottom: 12 }}>
            <span className={FIELD_LABEL}>Images</span>
            <ImageUpload
              busy={isSaving}
              centreCode={centreCode}
              images={images}
              maxImages={MAX_IMAGES}
              onChange={setImages}
              onError={setImagesError}
            />
            {imagesError && <span className={FIELD_ERROR}>{imagesError}</span>}
            <span className={HELPER_TEXT}>Up to {MAX_IMAGES} images (JPG, PNG, GIF, WEBP · max 5MB each).</span>
          </div>

          <SectionLabel>{isGym ? 'Gym Pricing' : 'Pricing'}</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {!isGym && (
              <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>Price per hour ($)</span>
                <NumberInput
                  className={FF_INPUT}
                  min={0}
                  step={0.01}
                  value={pricePerHour}
                  onValueChange={setPricePerHour}
                />
                <span className={HELPER_TEXT}>Charged per hour — a 3-hour booking costs 3 × this price.</span>
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
            {isGym && (
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
                <span className={HELPER_TEXT}>Leave blank to use the calculated price ({money(annualGymPrice)}).</span>
              </label>
            )}
            {isGym && (
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
            )}
            {isGym && (
              <span className={HELPER_TEXT}>
                A family&apos;s gym charge is this price × however many family members have the add-on — no separate
                family rate.
              </span>
            )}
          </div>

          <SectionLabel>Capacity &amp; Access</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            {!isGym && (
              <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>Total booking hours</span>
                <NumberInput
                  className={FF_INPUT}
                  min={1}
                  value={maxBookableHours}
                  onValueChange={setMaxBookableHours}
                />
                <span className={HELPER_TEXT}>A member picks any whole number of hours, from 1 up to this.</span>
                {showErr('maxBookableHours')}
              </label>
            )}
            {isGym && (
              <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>Session duration</span>
                <select
                  className={FF_INPUT}
                  value={durationCustomMode ? CUSTOM_OPTION : String(durationMinutes ?? 60)}
                  onChange={e => {
                    if (e.target.value === CUSTOM_OPTION) {
                      setDurationCustomMode(true);
                    } else {
                      setDurationCustomMode(false);
                      setDurationMinutes(Number(e.target.value));
                    }
                  }}
                >
                  {DURATION_OPTIONS.map(o => (
                    <option key={o.minutes} value={o.minutes}>
                      {o.label}
                    </option>
                  ))}
                  <option value={CUSTOM_OPTION}>Custom…</option>
                </select>
                {durationCustomMode && (
                  <NumberInput
                    className={FF_INPUT}
                    min={1}
                    placeholder="Minutes"
                    value={durationMinutes}
                    onValueChange={setDurationMinutes}
                  />
                )}
                {showErr('durationMinutes')}
              </label>
            )}
            {isGym && (
              <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>Slot start interval</span>
                <select
                  className={FF_INPUT}
                  value={slotIntervalCustomMode ? CUSTOM_OPTION : String(slotStartIntervalMinutes)}
                  onChange={e => {
                    if (e.target.value === CUSTOM_OPTION) {
                      setSlotIntervalCustomMode(true);
                    } else {
                      setSlotIntervalCustomMode(false);
                      setSlotStartIntervalMinutes(Number(e.target.value));
                    }
                  }}
                >
                  {SLOT_START_INTERVAL_OPTIONS.map(m => (
                    <option key={m} value={m}>
                      {m} minutes
                    </option>
                  ))}
                  <option value={CUSTOM_OPTION}>Custom…</option>
                </select>
                {slotIntervalCustomMode && (
                  <NumberInput
                    className={FF_INPUT}
                    min={1}
                    placeholder="Minutes"
                    value={slotStartIntervalMinutes}
                    onValueChange={setSlotStartIntervalMinutes}
                  />
                )}
                {showErr('slotStartIntervalMinutes')}
              </label>
            )}
            {!isGym && (
              <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>Total capacity</span>
                <NumberInput className={FF_INPUT} min={0} value={totalCapacity} onValueChange={setTotalCapacity} />
              </label>
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

          {isGym && (
            <>
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
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Free guests per billing cycle</span>
                  <NumberInput
                    className={FF_INPUT}
                    min={0}
                    value={freeGuestVisits}
                    onValueChange={setFreeGuestVisits}
                  />
                  <span className={HELPER_TEXT}>Billing cycle is fortnightly.</span>
                </label>
              </div>
            </>
          )}

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
              {/* A ladder, not three independent ranges — each age band picks up
                  exactly where the previous one ends, so only the three
                  boundaries below are entered; the "from" of each band is
                  implied, shown as plain text instead of a redundant input. */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 4 }}>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Minimum age to access the gym</span>
                  <NumberInput className={FF_INPUT} min={0} value={minimumAge} onValueChange={setMinimumAge} />
                  <span className={HELPER_TEXT}>Below this age: no gym access at all.</span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Parent/guardian must be present until age</span>
                  <NumberInput
                    className={FF_INPUT}
                    min={0}
                    value={parentPresentTo}
                    onValueChange={setParentPresentTo}
                  />
                  <span className={HELPER_TEXT}>
                    Ages {minimumAge ?? 0}–{parentPresentTo ?? 0}: a parent/guardian must attend.
                  </span>
                  {showErr('parentPresent')}
                </label>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Consent required until age</span>
                  <NumberInput className={FF_INPUT} min={0} value={consentTo} onValueChange={setConsentTo} />
                  <span className={HELPER_TEXT}>
                    Ages {(parentPresentTo ?? 0) + 1}–{consentTo ?? 0}: can attend alone with signed consent.
                  </span>
                  {showErr('parentalConsent')}
                </label>
              </div>
              <p className={HELPER_TEXT} style={{ marginBottom: 4 }}>
                Ages {(consentTo ?? 0) + 1}+: unrestricted access, no supervision or paperwork needed.
              </p>
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
          </div>

          {isGym && (
            <>
              <span className={FIELD_LABEL}>Minimum gap between sessions (hours) — per membership plan</span>
              <p className={HELPER_TEXT} style={{ marginTop: 2, marginBottom: 8 }}>
                How long a member on each plan must wait before their next gym session that same day.
              </p>
              {plans.length === 0 ? (
                <p className={HELPER_TEXT} style={{ marginBottom: 12 }}>
                  No membership plans are assigned to this centre yet — assign one in Plans &amp; Pricing first.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  {plans.map(pl => (
                    <label key={pl.code} className="flex flex-col gap-1">
                      <span className={FIELD_LABEL}>{pl.name || pl.code}</span>
                      <NumberInput
                        className={FF_INPUT}
                        min={0}
                        value={gapHoursByPlan[pl.code] ?? 0}
                        onValueChange={v => setGapHoursByPlan(prev => ({ ...prev, [pl.code]: v }))}
                      />
                    </label>
                  ))}
                </div>
              )}
            </>
          )}

          {isGym && (
            <>
              <SectionLabel>Access &amp; PINs</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Gym PIN active — minutes before slot start</span>
                  <NumberInput className={FF_INPUT} min={0} value={gymPinBefore} onValueChange={setGymPinBefore} />
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

          {!isGym && (
            <>
              <SectionLabel>Access &amp; PINs</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Door PIN active — minutes before slot start</span>
                  <NumberInput className={FF_INPUT} min={0} value={doorPinBefore} onValueChange={setDoorPinBefore} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={FIELD_LABEL}>Facility PIN (main entrance) — minutes before</span>
                  <NumberInput
                    className={FF_INPUT}
                    min={0}
                    value={roomFacilityPinBefore}
                    onValueChange={setRoomFacilityPinBefore}
                  />
                </label>
              </div>
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
            className="cmx-btn cmx-btn-outline"
            disabled={isSaving}
            title="Save with whatever's filled in so far — only the facility name is required."
            type="button"
            onClick={() => handleSubmit(true)}
          >
            Save as Draft
          </button>
          <button
            className="cmx-btn cmx-btn-navy"
            // Only disabled while actually saving — NOT on validation failure.
            // An HTML-disabled button swallows the click entirely, so
            // handleSubmit's own setTried(true) (which reveals the inline
            // error text) would never run, making the button look broken
            // with no visible explanation. Letting the click through always
            // means an invalid form shows its errors instead of doing nothing.
            disabled={isSaving}
            type="button"
            onClick={() => handleSubmit(false)}
          >
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Facility'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FacilityProductModal;
