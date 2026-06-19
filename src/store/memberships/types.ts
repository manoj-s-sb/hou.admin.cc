/**
 * Memberships — TypeScript data models + Redux state shape.
 *
 * These are the *global* plan templates (defined once, assigned to any centre
 * with local pricing). Mirrors the shape the backend exposes so the page,
 * comparison tables and drawer all speak the same model.
 */
import type { PlanId } from '../../pages/centres/types';

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

  /**
   * The raw API membership this plan was mapped from. Kept so that saving an
   * edit can merge the changed fields back onto the full backend shape instead
   * of dropping the fields the flat model doesn't carry (promo pricing,
   * benefits, isPopular, door/lane access, …). Undefined for brand-new plans.
   */
  _raw?: ApiMembership;
}

/* ── Live backend shapes ──────────────────────────────────────────────────── */

/**
 * A single membership as returned by `GET /admin/memberships?facilityCode=…`
 * and accepted by `POST /admin/memberships/update`. Only the fields the UI
 * reads or writes are typed; the rest pass through untouched on save.
 */
export interface ApiMembership {
  id: string;
  name: string;
  code: string;
  status?: string;
  facilityCode?: string;
  countryCode?: string;
  isPopular?: boolean;
  benefits?: string[];
  pricing?: {
    billingCycles?: string[];
    regular?: {
      fortnightly?: number;
      annual?: number;
      currency?: string;
      additionalmemberfortnightlyPrice?: number;
      [key: string]: unknown;
    };
    promo?: Record<string, unknown>;
    maxMembersAllowed?: number;
    [key: string]: unknown;
  };
  access?: {
    type?: string;
    mainDoorAccess?: string;
    laneAccess?: string;
    [key: string]: unknown;
  };
  bookingRules?: {
    generalBookingRules?: {
      maxBookingsPerDay?: number;
      maxActiveBookings?: number;
      // Backend key is intentionally misspelled ("Frothnightly") — mirror it.
      maxFrothnightlyBookings?: number;
      advanceBookingDays?: number;
      bookingCarryOver?: {
        allowed?: boolean;
        maxCarryOverPerCycle?: number;
        maxAccumulated?: number;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    slotPurchaseRules?: {
      enabled?: boolean;
      price?: number;
      maxPurchaseSlotsPerCycle?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  memberTypes?: { adult?: unknown; junior?: unknown };
  description?: { fortnightly?: string; annual?: string };
  [key: string]: unknown;
}

/** Payload carried in the `data` envelope key of the memberships list response. */
export interface ApiMembershipsPayload {
  facilityCode: string;
  facility?: unknown;
  memberships: ApiMembership[];
  count: number;
}

/* ── Thunk results ────────────────────────────────────────────────────────── */

/** Outcome of a create attempt, discriminated so the drawer can show field/toasts. */
export type CreatePlanResult =
  | { status: 'ok' }
  | { status: 'duplicate' } // 409 — code already exists
  | { status: 'validation'; fields: string[] } // 400 — data.errors[].loc
  | { status: 'auth' } // 401 / 403
  | { status: 'error' };

/** Shape of a 400 validation body returned by the create endpoint. */
export interface ValidationErrorBody {
  data?: { errors?: { loc?: string[] | string; msg?: string }[] };
}

/* ── Redux slice state ────────────────────────────────────────────────────── */

export interface MembershipsInitialState {
  plans: MembershipPlan[];
  isLoading: boolean;
  error: string | null;
}

export const initialState: MembershipsInitialState = {
  plans: [],
  isLoading: true,
  error: null,
};
