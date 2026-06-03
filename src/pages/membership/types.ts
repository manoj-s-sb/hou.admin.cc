/**
 * Membership Plans — TypeScript data models.
 *
 * These are the *global* plan templates (defined once, assigned to any centre
 * with local pricing). Mirrors the shape the backend will expose so the page,
 * comparison tables and drawer all speak the same model.
 */
import type { PlanId } from '../centres/types';

export type PlanStatus = 'active' | 'archived';

export type AccessType = '24/7' | 'offpeak' | 'nightowl' | 'custom';

export interface PlanEligibility {
  adult: boolean;
  junior: boolean;
  family: boolean;
}

export interface MembershipPlan {
  /** Stable id — one of the catalogue ids, or a generated id for new plans. */
  id: PlanId | string;
  name: string;
  /** Lowercase system code, e.g. "premium". */
  code: string;
  description?: string;
  /** Brand colour (hex) used for the column accent + pills. */
  colour: string;

  // ── Pricing (network reference, USD base) ──
  fortnightlyPrice: number;
  annualPrice: number;

  // ── Access ──
  accessType: AccessType;
  /** Human-readable access window, e.g. "24/7" or "9am–3pm Mon–Fri". */
  accessHours: string;
  peakAccess: boolean;

  // ── Booking limits (per fortnightly cycle) ──
  /** Slots per fortnightly cycle. 0 = unlimited. */
  slotsPerCycle: number;
  dailyBookingLimit: number;
  maxFutureBookings: number;
  /** Unused slots carried to next cycle. 0 = no carryover. */
  carryover: number;
  /** Max slots that can accumulate. 0 = N/A. */
  carryCap: number;
  advanceWindowDays: number;

  // ── Extra session purchase (fortnightly only) ──
  extraSessionEnabled: boolean;
  extraSessionPrice: number;

  // ── Eligibility & caps ──
  eligibility: PlanEligibility;
  /** Family additional-member fee. null = N/A. */
  additionalMemberFee: number | null;
  /** Network-wide member cap. 0 = unlimited. */
  memberCap: number;
  /** Number of centres this plan is active at. */
  centresActive: number;
  /** Country/region codes the plan is offered in; ['all'] = everywhere. */
  regions: string[];

  status: PlanStatus;
}

/** Network-default guest charge config (overridable per centre). */
export interface GuestChargeDefaults {
  firstGuestFee: number;
  additionalGuestDiscountPct: number;
  maxGuestsPerSlot: number;
}
