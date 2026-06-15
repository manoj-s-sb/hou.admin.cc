/**
 * Translation layer between the live membership endpoints and the flat
 * `MembershipPlan` model the Membership Plans page renders.
 *
 *  - `mapApiMembership`  GET `/admin/memberships?facilityCode=…` → flat plan
 *  - `toUpdatePayload`   flat plan → POST `/admin/memberships/update` body
 *
 * Keep this as the single translation point — if the backend shape shifts,
 * only this file changes, not the page or the drawer.
 */
import { PLAN_COLORS } from '../centres/constants';

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
    annualPrice: regular.annual ?? 0,

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

    eligibility: {
      adult: !!m.memberTypes?.adult,
      junior: !!m.memberTypes?.junior,
      family: isFamily,
    },
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
      billingCycles: rawPricing.billingCycles ?? ['fortnightly', 'annual'],
      regular: {
        ...rawRegular,
        fortnightly: plan.fortnightlyPrice,
        annual: plan.annualPrice,
        currency,
        ...(plan.additionalMemberFee !== null ? { additionalmemberfortnightlyPrice: plan.additionalMemberFee } : {}),
      },
    },
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
