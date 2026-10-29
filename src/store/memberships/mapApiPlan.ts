/**
 * Translation layer between the live membership endpoints and the flat
 * `MembershipPlan` model the Membership Plans page renders.
 *
 *  - `mapApiMembership`  GET `/admin/memberships?facilityCode=…` → flat plan
 *  - `toCreatePayload`   flat plan → POST `/admin/memberships/create` body
 *  - `toUpdatePayload`   flat plan → POST `/admin/memberships/update` body
 *
 * Keep this as the single translation point — if the backend shape shifts,
 * only this file changes, not the page or the drawer.
 */
import { PLAN_COLORS } from '../../pages/centres/constants';

import type { AccessType, ApiMembership, ApiMembershipsPayload, MembershipPlan, PlanStatus } from './types';

export type { ApiMembership, ApiMembershipsPayload };

const ACCESS_TYPES: AccessType[] = ['24/7', 'offpeak', 'nightowl', 'custom'];
const FALLBACK_COLOUR = '#21295A';

const toAccessType = (raw?: string): AccessType =>
  ACCESS_TYPES.includes(raw as AccessType) ? (raw as AccessType) : 'custom';

/* ── GET response → flat plan ─────────────────────────────────────────────── */

export function mapApiMembership(m: ApiMembership): MembershipPlan {
  const general = m.bookingRules?.generalBookingRules ?? {};
  const carry = general.bookingCarryOver ?? {};
  const slot = m.bookingRules?.slotPurchaseRules ?? {};
  const regular = m.pricing?.regular ?? {};
  const accessType = toAccessType(m.access?.type);
  const isFamily = m.code === 'family' || (m.pricing?.maxMembersAllowed ?? 0) > 1;

  return {
    id: m.id,
    name: m.name,
    code: m.code,
    description: m.description?.fortnightly,
    colour: PLAN_COLORS[m.code as keyof typeof PLAN_COLORS] ?? FALLBACK_COLOUR,

    fortnightlyPrice: regular.fortnightly ?? 0,
    // MP-8: absence of "annual" in billingCycles (or of the regular.annual field
    // itself) means this plan genuinely has no annual option — not that it costs
    // $0. Default to offered when the doc predates this field, matching the
    // create/update endpoints' own default of both cycles.
    offersAnnual: (m.pricing?.billingCycles ?? ['fortnightly', 'annual']).includes('annual'),
    annualPrice: regular.annual ?? 0,
    // Preserve the price's own currency (default USD) so the page converts FROM
    // it instead of assuming USD — the reverse mapper already keeps it too.
    currency: (regular.currency ?? 'USD').toUpperCase(),

    accessType,
    accessHours: accessType === '24/7' ? '24/7' : (m.access?.type ?? '—'),
    peakAccess: accessType === '24/7',

    slotsPerCycle: general.maxFrothnightlyBookings ?? 0,
    dailyBookingLimit: general.maxBookingsPerDay ?? 0,
    maxFutureBookings: general.maxActiveBookings ?? 0,
    carryover: carry.allowed ? (carry.maxCarryOverPerCycle ?? 0) : 0,
    carryCap: carry.maxAccumulated ?? 0,
    advanceWindowDays: general.advanceBookingDays ?? 0,

    extraSessionEnabled: !!slot.enabled,
    extraSessionPrice: slot.price ?? 0,

    // MP-10: whatever keys memberTypes actually has, in whatever case the doc
    // stores them — not just adult/junior. `isFamily` is kept as an ADDITIONAL
    // inferred tag (not a replacement) for plans saved before this fix ever
    // explicitly set a "family" key, so they don't lose that signal on read.
    eligibilityTags: Array.from(
      new Set([...Object.keys(m.memberTypes ?? {}).map(k => k.toLowerCase()), ...(isFamily ? ['family'] : [])])
    ),
    additionalMemberFee: regular.additionalmemberfortnightlyPrice ?? null,
    memberCap: m.pricing?.maxMembersAllowed ?? 0,
    // Live endpoint is scoped to one facility, so the plan is active at (at least)
    // this centre. A network-wide count would need a separate aggregate call.
    centresActive: 1,
    // Always show regardless of the page's region chips; region filtering would
    // require mapping facility/country codes to the chip keys.
    regions: ['all'],

    status: (m.status === 'active' ? 'active' : 'archived') as PlanStatus,

    // Preserve the full backend shape for a lossless round-trip on save.
    _raw: m,
  };
}

/* ── Flat plan → POST /admin/memberships/create body ──────────────────────── */

/** The flat body accepted by `POST /admin/memberships/create` (global template). */
export interface CreatePlanBody {
  name: string;
  code: string;
  description?: string;
  priceFortnightly: number;
  priceAnnual?: number;
  accessType: AccessType;
  customHours?: { start: string; end: string };
  peakAccess: boolean;
  slotsPerCycle: number;
  dailyLimit: number;
  maxFutureBookings: number;
  carryover: number;
  carryCap: number;
  advanceWindowDays: number;
  extraSessionEnabled: boolean;
  /** MP-10: open-ended — any tag string, not just adult/junior/family. */
  eligibilityTags: string[];
  additionalMemberFee?: number;
  memberCap: number;
  status: PlanStatus;
}

/** Maps the drawer's flat plan model to the create endpoint's flat body. */
export function toCreatePayload(plan: MembershipPlan, customHours?: { start: string; end: string }): CreatePlanBody {
  const body: CreatePlanBody = {
    name: plan.name.trim(),
    code: plan.code.trim().toLowerCase(),
    description: plan.description?.trim() || undefined,
    priceFortnightly: plan.fortnightlyPrice,
    accessType: plan.accessType,
    peakAccess: plan.peakAccess,
    slotsPerCycle: plan.slotsPerCycle,
    dailyLimit: plan.dailyBookingLimit,
    maxFutureBookings: plan.maxFutureBookings,
    carryover: plan.carryover,
    carryCap: plan.carryCap,
    advanceWindowDays: plan.advanceWindowDays,
    extraSessionEnabled: plan.extraSessionEnabled,
    eligibilityTags: plan.eligibilityTags,
    memberCap: plan.memberCap,
    status: plan.status,
  };
  // MP-8: omitting priceAnnual (not sending a falsy/0 one) is what tells
  // create_membership_plan to leave "annual" out of billingCycles entirely —
  // the correct "not offered" signal, vs. a real $0 price.
  if (plan.offersAnnual && plan.annualPrice) body.priceAnnual = plan.annualPrice;
  if (plan.accessType === 'custom' && customHours) body.customHours = customHours;
  if (plan.additionalMemberFee !== null && plan.additionalMemberFee !== undefined) {
    body.additionalMemberFee = plan.additionalMemberFee;
  }
  return body;
}

/* ── Flat plan → POST /admin/memberships/update body ──────────────────────── */

/**
 * Builds the update payload by merging the drawer's edited fields onto the
 * original raw membership (`plan._raw`), so fields the flat model doesn't carry
 * — promo pricing, benefits, isPopular, door/lane access, etc. — survive the
 * round-trip instead of being wiped. New plans (no `_raw`) get sensible defaults.
 */
export function toUpdatePayload(plan: MembershipPlan): ApiMembership {
  const raw = plan._raw ?? ({} as ApiMembership);
  const rawPricing = raw.pricing ?? {};
  const rawRegular = rawPricing.regular ?? {};
  const { annual: _rawAnnual, ...rawRegularWithoutAnnual } = rawRegular;
  const rawBooking = raw.bookingRules ?? {};
  const rawGeneral = rawBooking.generalBookingRules ?? {};
  const rawCarry = rawGeneral.bookingCarryOver ?? {};
  const rawSlot = rawBooking.slotPurchaseRules ?? {};
  const currency = rawRegular.currency ?? 'usd';

  return {
    ...raw,
    id: String(plan.id),
    name: plan.name,
    code: plan.code,
    status: plan.status,
    isPopular: raw.isPopular ?? false,
    benefits: raw.benefits ?? [],
    description: {
      fortnightly: plan.description ?? raw.description?.fortnightly ?? '',
      annual: raw.description?.annual ?? plan.description ?? '',
    },
    pricing: {
      ...rawPricing,
      // MP-8: when annual billing is turned off, drop "annual" from BOTH
      // billingCycles and regular — a stale `annual` left in `regular` from
      // before it was toggled off would still read as a real price.
      billingCycles: plan.offersAnnual ? ['fortnightly', 'annual'] : ['fortnightly'],
      regular: {
        ...(plan.offersAnnual ? rawRegular : rawRegularWithoutAnnual),
        fortnightly: plan.fortnightlyPrice,
        currency,
        ...(plan.offersAnnual ? { annual: plan.annualPrice } : {}),
        ...(plan.additionalMemberFee !== null ? { additionalmemberfortnightlyPrice: plan.additionalMemberFee } : {}),
      },
    },
    // MP-10: this was previously never sent at all, so editing a plan's
    // eligibility checkboxes silently did nothing — the raw doc's original
    // memberTypes survived untouched regardless of what the admin ticked.
    // Preserve a tag's existing rich sub-fields (e.g. adult's minAge) when
    // it's kept; a brand-new tag gets a plain {} flag.
    memberTypes: Object.fromEntries(plan.eligibilityTags.map(tag => [tag, raw.memberTypes?.[tag] ?? {}])),
    access: {
      ...raw.access,
      type: plan.accessType,
    },
    bookingRules: {
      ...rawBooking,
      generalBookingRules: {
        ...rawGeneral,
        maxBookingsPerDay: plan.dailyBookingLimit,
        maxActiveBookings: plan.maxFutureBookings,
        maxFrothnightlyBookings: plan.slotsPerCycle,
        advanceBookingDays: plan.advanceWindowDays,
        bookingCarryOver: {
          ...rawCarry,
          allowed: plan.carryover > 0,
          maxCarryOverPerCycle: plan.carryover,
          maxAccumulated: plan.carryCap,
        },
      },
      slotPurchaseRules: {
        ...rawSlot,
        enabled: plan.extraSessionEnabled,
        price: plan.extraSessionPrice,
      },
    },
  };
}
