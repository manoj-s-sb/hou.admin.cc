/**
 * Centre Management — all TypeScript models for the module, in one place.
 *
 * Three layers live here:
 *   1. Backend contract (doc-bundle API): FacilitySummary, CentreBundle, …
 *   2. Domain / wizard models the UI speaks: Centre, WizardState, PlanMeta, …
 *   3. The Redux slice state shape (CentresInitialState + initialState).
 *
 * Spellings are kept verbatim from the backend spec (note `freeSolts`).
 */

/* ════════════════════════════════════════════════════════════════════════════
 *  1. Backend contract — NEW doc-bundle model
 *
 *  A "centre" = one `facility` + N `lanes` + N `memberships` + one
 *  `membershipSalesFlow`, all tied by `facilityCode`. Mirrors:
 *    - POST /admin/centres/list     → { facilities[], total, skip, limit }
 *    - POST /admin/centres/details  → CentreBundle
 *    - POST /admin/centres/create   → CentreBundle
 * ════════════════════════════════════════════════════════════════════════════ */

export type CentreApiStatus = 'draft' | 'staging' | 'active' | 'suspended';

/* ── List ────────────────────────────────────────────────────────────────── */

/**
 * Per-centre rollup the card grid displays. NOT yet returned by
 * `/admin/centres/list` — the backend needs to enrich each list row with this
 * (member counts, bookings, utilisation, tailgates, open tasks, plan split).
 * Optional so the card degrades to "—" until that lands.
 */
export interface FacilityKpi {
  totalMembers?: number;
  /** Subset of totalMembers with an active (not paused/cancelled/pending) subscription. */
  activeMembers?: number;
  bookings30d?: number;
  /** Null when the centre isn't configured for utilisation (see `utilisationStatus`). */
  utilisationPct?: number | null;
  /** 'insufficient_config' when capacity/operating hours aren't set up yet. */
  utilisationStatus?: 'ok' | 'insufficient_config';
  noShowPct?: number;
  tailgates?: number;
  openTasks?: number;
  /** Member count per plan code (premium / standard / family / …). */
  plans?: Record<string, number>;
  /** Active-only member count per plan code — what the card's plan chips show. */
  activePlans?: Record<string, number>;
}

/** Per-facility rollup exactly as POST /admin/centres/list returns it. */
export interface FacilityStats {
  totalMembers?: number;
  membersByPlan?: Record<string, number>;
  /** Subset of totalMembers with an active (not paused/cancelled/pending) subscription. */
  activeMembers?: number;
  activeMembersByPlan?: Record<string, number>;
  totalBookingsLast30Days?: number;
  totalInductions?: number;
  noShowRatePercent?: number;
  tailgates?: number;
  openTasks?: number;
  /** Real utilisation %, or null when the centre isn't configured for it yet. */
  utilisationPct?: number | null;
  utilisationStatus?: 'ok' | 'insufficient_config';
}

/** One row returned by POST /admin/centres/list. */
export interface FacilitySummary {
  id: string;
  code: string;
  name: string;
  status: CentreApiStatus;
  cityCode: string;
  countryCode: string;
  stateCode: string;
  timezone: string;
  latitude: number;
  longitude: number;
  freeSolts: number; // sic — backend spelling
  createdAt: string;
  updatedAt: string;
  /** Raw rollup as the API sends it; mapped into `kpi` by the getCentres thunk. */
  stats?: FacilityStats;
  /** Normalised rollup the card reads (mapped from `stats`). */
  kpi?: FacilityKpi;
}

export interface CentreListRequest {
  status?: CentreApiStatus;
  search?: string;
  skip: number;
  limit: number;
  sort?: string; // default "createdAtTs"
  order?: 'asc' | 'desc'; // default "desc"
}

export interface CentreListResponse {
  facilities: FacilitySummary[];
  total: number;
  skip: number;
  limit: number;
}

/* ── Full documents (details / create bundle) ──────────────────────────────── */

export interface FacilityAddress {
  street: string;
  suburb: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface FacilityPhone {
  type: 'regular' | 'whatsapp';
  supportTime: string;
  phone: string;
}

export interface FacilityContact {
  email: string;
  phones: FacilityPhone[];
}

/** "monday".."sunday" → array of "HH:MM-HH:MM" ranges (["00:00-23:59"] when 24/7). */
export interface OperatingHoursMap {
  monday: string[];
  tuesday: string[];
  wednesday: string[];
  thursday: string[];
  friday: string[];
  saturday: string[];
  sunday: string[];
}

export interface FacilityHoliday {
  date: string;
  name: string;
}

/** One entry of `facility.addons[0]` — tab config for a bookable area (lane/gym/
 * podcastroom/meetingroom/...), distinct from the `product` docs which carry the
 * actual pricing/booking rules for the same feature. */
export interface FacilityAddonEntry {
  status: string;
  isTab: boolean;
  group: string;
  order: number;
  label: string;
  equipmentCount?: number;
  areaSqm?: number;
}

/** `facility.addons` is an array containing ONE object keyed by addon id
 * ("lane" | "gym" | "podcastroom" | "meetingroom" | ...) — matches the real DB shape. */
export type FacilityAddonsMap = Record<string, FacilityAddonEntry>;

export interface ApiFacility {
  type: 'facility';
  code: string; // 3–10, UPPER, unique
  name: string;
  cityCode: string;
  countryCode: string;
  regionCode: string;
  stateCode: string;
  timezone: string;
  status: CentreApiStatus;
  latitude: number;
  longitude: number;
  freeSolts: number; // sic
  // Overall member-slot capacity mirrored onto the facility doc so analytics
  // (Reports) can read it directly. The sales-flow doc's capacity.total remains
  // the source of truth; this write keeps the two in sync.
  capacity?: { overallCapacity: number; foundationPool?: number };
  // General amenities selected in the wizard's "Facilities Available" step — read
  // back by the centre Facilities page (so the chips are per-centre, not hardcoded).
  amenities?: string[];
  address: FacilityAddress;
  contact: FacilityContact;
  operatingHours: OperatingHoursMap;
  holidays: FacilityHoliday[];
  // Tab config for bookable areas (lane always present, plus whichever
  // additional facilities are enabled) — see FacilityAddonsMap.
  addons: FacilityAddonsMap[];
  // Collected partially / not at all by the wizard today — refine on real JSON.
  security?: Record<string, unknown>;
  features?: Record<string, unknown>;
  waitlist?: Record<string, unknown>;
  edgeDevice?: Record<string, unknown>;
  induction?: Record<string, unknown>;
  tour?: Record<string, unknown>;
  slotScheduleConfig?: Record<string, unknown>;
  // Not yet backed by a real lifecycle/scheduling endpoint — see CentreKeyDates. Sent
  // additively so it round-trips once the backend adopts it; safe to ignore until then.
  keyDates?: CentreKeyDates;
  // Server-generated (present on read only).
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LanePitchBox {
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
}

export interface ApiLane {
  type: 'lane';
  laneNo: number;
  laneType: 'batting' | 'bowling' | 'hybrid';
  status: string;
  code: string;
  lanePitchMapping: Record<string, LanePitchBox>; // "60".."160"
  speedRestriction?: Record<string, unknown> | null;
  ballIntervalRestriction?: Record<string, unknown> | null;
  startIntervalRestriction?: Record<string, unknown> | null;
  swing?: Record<string, unknown> | null;
  deviation?: Record<string, unknown> | null;
  ballsCountRestriction?: Record<string, unknown> | null;
  id?: string;
}

export interface MembershipPricing {
  billingCycles: string[];
  regular: Record<string, unknown>;
  promo: Record<string, unknown>;
}

export interface ApiMembership {
  type: 'membership';
  code: string; // premium | standard | offpeak | nightowl | family
  name: string;
  status?: string;
  isPopular: boolean;
  cityCode?: string;
  countryCode?: string;
  stateCode?: string;
  facilityCode?: string;
  pricing: MembershipPricing;
  registrationFee: Record<string, unknown>;
  access: Record<string, unknown>;
  bookingRules: Record<string, unknown>;
  memberTypes: Record<string, unknown>;
  accessControl: Record<string, unknown>;
  membershipPolicies: Record<string, unknown>;
  description: Record<string, unknown>;
  stripe: Record<string, unknown>;
  benefits: string[];
  id?: string;
}

export interface ApiMembershipSalesFlow {
  type: 'membershipsalesflow';
  centrePageUrl?: string;
  checkoutUrlTemplate?: string;
  centrePreview?: Record<string, unknown>;
  capacity: { total: number; plans: Record<string, number> };
  foundationMembership?: Record<string, unknown>;
  phase1?: Record<string, unknown>;
  phase2?: Record<string, unknown>;
  phase3?: Record<string, unknown>;
  phase4?: Record<string, unknown>;
  unsoldFoundationHandling?: Record<string, unknown>;
  adminControls?: Record<string, unknown>;
  redirectLogic?: Record<string, unknown>;
  id?: string;
}

/**
 * Bookable facility product (podcast room, meeting room, gym, ...), `type: "product"`,
 * linked to its centre via `facilityCode`. Lives alongside facility/lane/membership docs
 * in the same bundle; the Facilities page renders these directly (see facilities/index.tsx).
 */
/** `bookingModel: "membership_addon"` WRITE (wire) shapes — what the Facilities
 * page's Add/Edit form actually sends. CentreService transforms these into the
 * reference-schema READ shapes below (ApiGymPricing / ApiGymAccessDoor / ...) —
 * see _gym_pricing / _gym_access_control / _gym_free_trial / _gym_age_rules. */
export interface ApiGymAddonPricingInput {
  fortnightlyPrice?: number;
  /** Optional override of the calculated annual price (fortnightlyPrice × 26 ×
   * (1 - annualDiscountPct/100)). `null` (not just absent) means "use
   * calculated" — always send this key explicitly so a cleared override
   * actually clears, rather than the backend preserving a stale one. */
  annualPrice?: number | null;
}
export interface ApiGymFreeTrialInput {
  slotsPerMember?: 0 | 1 | 2;
}
export interface ApiGymAgeRangeInput {
  from?: number;
  to?: number;
}
export interface ApiGymAgeRulesInput {
  minimumAge?: number;
  parentMustBePresent?: ApiGymAgeRangeInput;
  parentalConsentRequired?: ApiGymAgeRangeInput;
}
export interface ApiGymPinWindowInput {
  beforeMinutes?: number;
}
export interface ApiGymPinRulesInput {
  /** PIN window for the gym's own access zone/door. */
  gymPinWindow?: ApiGymPinWindowInput;
  /** Separate general-facility entry PIN window, for a gym-only booking with no
   * lane booking to otherwise get the member through the building's front door. */
  facilityPinWindow?: ApiGymPinWindowInput;
}

/** `bookingModel: "membership_addon"` READ shapes — the reference schema real,
 * hand-created gym docs use (see hou01-gym). Built server-side from the WRITE
 * shapes above; never sent as-is by this form. */
export interface ApiGymPricing {
  billingCycles?: string[];
  individual?: {
    fortnightly?: number;
    annual?: number;
    currency?: string;
    savings?: { annual?: { percentage?: number } };
  };
  /** Always null here — no separate family/bundled plan is admin-configured. */
  bundled?: unknown;
}
/** Shared by both bookingModels — accessControl is always a per-door map keyed
 * by door/room code (the room's own code, or "mainDoor" for the facility's main
 * entrance), each holding just a minutes-before window. No on/off flag, no
 * "minutes after" for either bookingModel. */
export interface ApiGymAccessDoor {
  preAccessTime?: number;
}
/** Pay-per-slot (podcast/meeting/gaming/custom) hourly pricing — a member picks
 * any whole number of hours and pays perHour × hours. */
export interface ApiPayPerSlotPricing {
  perHour?: number;
  currency?: string;
}
export interface ApiGymFreeTrialRead {
  slotsPerMembershipLifetime?: number;
  enabled?: boolean;
  guestsAllowed?: unknown;
  enforceAllTogether?: unknown;
  consumeOn?: unknown;
  adminOverrideAllowed?: unknown;
}
export interface ApiGymAgeRangeRead {
  min?: number;
  max?: number;
  guardianMustAttend?: boolean;
  documents?: unknown;
}
export interface ApiGymAgeRulesRead {
  minAge?: number;
  supervisedRange?: ApiGymAgeRangeRead;
  consentRange?: ApiGymAgeRangeRead;
  unrestrictedAge?: number;
}

export interface ApiProduct {
  type: 'product';
  id?: string;
  code: string;
  facilityCode: string;
  isAddon?: boolean;
  bookingModel?: string; // "pay_per_slot" (default) | "membership_addon" (Gym)
  name: string;
  description?: string;
  /** Resolved server-side on every read (see CentreService._resolve_product_images).
   * `blobName` is the STABLE identifier to send back unchanged in an edit that
   * doesn't touch images — `url` is a temporary SAS read URL and expires; never
   * send it back as if it were a blobName. */
  images?: { blobName: string; url: string }[];
  benefits?: string[];
  status: string; // e.g. "active" | "commingsoon"
  version?: number;
  sessionRules?: {
    maxBookingsPerDay?: number;
    maxActiveBookings?: number;
    advanceBookingDays?: number;
    noWalkIns?: boolean;
    // Pay-per-slot (podcast/meeting/gaming/custom) — hourly, variable-length
    // booking: a member picks any whole number of hours in [minHours, maxHours]
    // and pays pricing.perHour × hours.
    minHours?: number;
    maxHours?: number;
    // Gym-specific (reference field names). Gym's own "Session duration" is
    // fixed, unlike the hourly model above — unaffected by it.
    durationMinutes?: number;
    slotIncrementMinutes?: number;
    slotCapacity?: number;
    /** Minimum gap (hours) between a member's gym sessions — per membership
     * plan code assigned to this centre (e.g. {"premium": 4, "standard": 8}),
     * not a fixed tier split. See FacilityProductModal.tsx's gapHoursByPlan. */
    bookingFrequency?: Record<string, number>;
  };
  guestPolicy?: {
    maxGuestsPerSlot?: number;
    additionalGuestPrice?: number;
    // Gym-specific.
    guestsCountTowardCapacity?: boolean;
    laneGuestFreeGymSameDay?: boolean;
    freeGuestsPerBillingCycle?: number;
  };
  // Stored as real top-level fields (not squeezed into the nested shapes above) —
  // see CentreService._build_product_doc / update_centre_bundle's product-edit step.
  annualDiscountPct?: number;
  totalCapacity?: number;
  concurrentCapacity?: number;
  seatingCapacity?: number;
  /** Pay-per-slot only — gym uses guestPolicy.freeGuestsPerBillingCycle instead. */
  freeGuestVisits?: number;
  openTime?: string;
  closeTime?: string;
  // Membership add-on (Gym) — reference schema fields. `pricing`/`accessControl`
  // `pricing`'s shape depends on bookingModel (ApiGymPricing vs
  // ApiPayPerSlotPricing); `accessControl` is the SAME per-door map shape for
  // both (see ApiGymAccessDoor) — just keyed by whichever doors that
  // bookingModel's form configures.
  pricing?: ApiGymPricing | ApiPayPerSlotPricing;
  /** Admin-only override tracking — NOT part of the reference schema (see
   * ApiGymAddonPricingInput.annualPrice). null/absent = use the calculated
   * annual price in pricing.individual.annual. */
  addonPricing?: { annualPriceOverride?: number | null };
  accessControl?: Record<string, ApiGymAccessDoor>;
  freeTrial?: ApiGymFreeTrialRead;
  ageRules?: ApiGymAgeRulesRead;
  inductionRequired?: boolean;
  // Outside the admin form's scope — populated by another process, read back
  // (and round-tripped) verbatim if present, otherwise null/absent.
  subType?: string;
  cityCode?: string;
  countryCode?: string;
  stateCode?: string;
  model?: unknown;
  stripe?: unknown;
  violationPolicy?: unknown;
  inductionRules?: unknown;
}

/** Grouped bundle returned by /details and /create. */
export interface CentreBundle {
  facility: ApiFacility;
  lanes: ApiLane[];
  memberships: ApiMembership[];
  membershipSalesFlow: ApiMembershipSalesFlow;
  products?: ApiProduct[];
}

/**
 * Write payload for one product (New Centre wizard's Additional Facilities step →
 * /admin/centres/create or /update). The server always persists the SAME nested
 * structure the real docs use (slotPricing/sessionRules/guestPolicy) — see
 * CentreService._build_product_doc — mapping these flatter fields into it.
 * CREATE-ONLY on /update: a `code` that already exists is left untouched, never
 * overwritten or deleted (see buildCreatePayload.ts / bundleToWizardState.ts).
 */
export interface ApiProductInput {
  type: 'product';
  code: string;
  name: string;
  description?: string;
  /** blobNames from uploadProductImage — see ApiProduct.images for the resolved shape. */
  images?: string[];
  status?: string;
  isAddon?: boolean;
  fortnightlyPrice?: number;
  guestSessionPrice?: number;
  totalCapacity?: number;
  concurrentCapacity?: number;
  seatingCapacity?: number;
  slotDuration?: string;
  freeGuestVisits?: number;
  // Already-nested shape (matches the real docs) — sent as-is instead of the
  // flat wizard fields above when the caller already has the real structure
  // (e.g. the Facilities page's "Add New" form). See ProductInput (backend).
  // Pay-per-slot (podcast/meeting/gaming/custom) hourly pricing.
  pricing?: ApiPayPerSlotPricing;
  sessionRules?: {
    maxBookingsPerDay?: number;
    advanceBookingDays?: number;
    noWalkIns?: boolean;
    // Pay-per-slot hourly booking range.
    minHours?: number;
    maxHours?: number;
    // Gym-specific.
    durationMinutes?: number;
    slotStartIntervalMinutes?: number;
    maxMembersPerSlot?: number;
    /** Per-plan minimum gap hours, keyed by this centre's own membership plan codes. */
    bookingFrequency?: Record<string, number>;
    slotCapacity?: number;
  };
  guestPolicy?: {
    maxGuestsPerSlot?: number;
    additionalGuestPrice?: number;
    // Gym-specific.
    guestsCountTowardCapacity?: boolean;
    freeGymEntryWithLaneBooking?: boolean;
  };
  // Door PIN windows for pay-per-slot facilities — same {beforeMinutes} shape
  // as Gym's, no "minutes after": `doorPin` is the room's own door, `facilityPin`
  // the building's main entrance (same two-door idea as Gym's gymPinWindow/
  // facilityPinWindow).
  doorPin?: ApiGymPinWindowInput;
  facilityPin?: ApiGymPinWindowInput;
  // Stored verbatim as top-level fields (not mapped into the nested shapes above).
  annualDiscountPct?: number;
  openTime?: string;
  closeTime?: string;
  // Membership add-on (Gym) — bookingModel: "membership_addon" for the Gym,
  // omit for the default "pay_per_slot". These groups are stored verbatim,
  // same shape as ApiProduct's.
  bookingModel?: string;
  addonPricing?: ApiGymAddonPricingInput;
  freeTrial?: ApiGymFreeTrialInput;
  ageRules?: ApiGymAgeRulesInput;
  pinRules?: ApiGymPinRulesInput;
  inductionRequired?: boolean;
}

/** Create/update body — same bundle shape, but `products` is the write-side (flatter) shape. */
export type CentreCreateRequest = Omit<CentreBundle, 'products'> & { products?: ApiProductInput[] };

/**
 * Partial edit of an EXISTING product (Facilities page's per-product "Edit"
 * action) → /admin/centres/update's `productUpdates`. Only the fields actually
 * set are sent; the backend merges them into the stored doc's real nested
 * shape, leaving anything unset exactly as it was. Distinct from
 * `ApiProductInput`/`products` (create-only, bulk, wizard-driven).
 */
export interface ApiProductUpdateInput {
  code: string;
  name?: string;
  description?: string;
  /** blobNames — always sent as the FULL current list (even [] to clear every
   * image), unlike every other field here where omitting means "unchanged". */
  images?: string[];
  status?: string;
  // Pay-per-slot (podcast/meeting/gaming/custom) hourly pricing — replaces the
  // old fixed price/durationMinutes model entirely.
  pricePerHour?: number;
  minHours?: number;
  maxHours?: number;
  /** Door PIN windows for these same facilities — minutes-before only, no
   * "after". doorPin = the room's own door; facilityPin = the building's main
   * entrance (same two-door idea as Gym's). */
  doorPinBeforeMinutes?: number;
  facilityPinBeforeMinutes?: number;
  // Gym's own fixed "Session duration" — unaffected by the hourly model above.
  durationMinutes?: number;
  slotCapacity?: number;
  maxBookingsPerDay?: number;
  advanceBookingDays?: number;
  maxGuestsPerSlot?: number;
  additionalGuestPrice?: number;
  annualDiscountPct?: number;
  totalCapacity?: number;
  concurrentCapacity?: number;
  seatingCapacity?: number;
  freeGuestVisits?: number;
  openTime?: string;
  closeTime?: string;
  // Membership add-on (Gym) fields.
  bookingModel?: string;
  addonPricing?: ApiGymAddonPricingInput;
  freeTrial?: ApiGymFreeTrialInput;
  ageRules?: ApiGymAgeRulesInput;
  pinRules?: ApiGymPinRulesInput;
  inductionRequired?: boolean;
  slotStartIntervalMinutes?: number;
  maxMembersPerSlot?: number;
  /** Per-plan minimum gap hours, keyed by this centre's own membership plan
   * codes — always the FULL current map (same convention as `images`). */
  bookingFrequency?: Record<string, number>;
  noWalkIns?: boolean;
  guestsCountTowardCapacity?: boolean;
  freeGymEntryWithLaneBooking?: boolean;
}

/**
 * Lightweight body for the Facilities page's own edits (amenities, add/edit a
 * bookable facility) — a narrow slice of /admin/centres/update's full bundle
 * shape, since this page never touches lanes/memberships/sales-flow.
 */
export interface FacilitiesPatchRequest {
  centreId: string;
  facility?: { amenities?: string[] };
  products?: ApiProductInput[];
  productUpdates?: ApiProductUpdateInput[];
}

/* ════════════════════════════════════════════════════════════════════════════
 *  2. Domain / wizard models
 * ════════════════════════════════════════════════════════════════════════════ */

export type CentreStatus = 'draft' | 'staging' | 'active' | 'suspended';

export type PlanId = 'premium' | 'standard' | 'offpeak' | 'nightowl' | 'family';

export type CountryCode = 'AU' | 'US' | 'UK' | 'UAE' | 'IN' | 'NZ' | 'ZA';

export interface OperatingHoursDay {
  /** 0 = Monday … 6 = Sunday */
  day: number;
  openTime: string; // "HH:mm"
  closeTime: string; // "HH:mm"
  isOpen: boolean;
}

export interface Centre {
  id: string;
  name: string;
  shortCode: string;
  status: CentreStatus;
  /** Per-centre brand colour (hex) used for the card stripe + accents */
  colour: string;
  /** Emoji flag for the centre's country */
  flag: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postcode?: string;
  country: CountryCode | string;
  /** IANA timezone, e.g. "America/Chicago" */
  timezone: string;
  /** Optional display abbreviation, e.g. "IST" */
  timezoneLabel?: string | null;
  phone: string;
  email: string;
  overallCapacity: number;
  foundationPool: number;
  battingLanes: number;
  bowlingLanes: number;
  multipurposeLanes: number;
  slotDurationMinutes: number;
  advanceBookingWindowDays: number;
  facilities?: string[];
  operatingHours: OperatingHoursDay[];
  is24x7: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanBreakdownItem {
  planId: PlanId;
  label: string;
  colour: string;
  members: number;
}

export interface CentreKPISnapshot {
  centreId: string;
  totalMembers: number;
  activeMembers: number;
  utilisationPct: number;
  noShowPct: number;
  bookings30d: number;
  planBreakdown: PlanBreakdownItem[];
}

/** A centre row joined with its latest KPI snapshot — what the card grid renders. */
export interface CentreWithKPI extends Centre {
  kpi: CentreKPISnapshot;
}

/** An admin-authored note attached to a waitlist or lead entry. */
export interface AdminNote {
  id: string;
  text: string;
  createdByName: string;
  createdById: string | null;
  createdAt: string;
}

/** Contact-status pipeline for a waitlist/lead entry — tracks admin follow-up, independent of the free-text admin notes. */
export type ContactStatus = 'not_contacted' | 'contacted' | 'no_response' | 'converted' | 'not_interested';

/** One entry in a waitlist/lead entry's `statusHistory` — who changed the contact status, and when. */
export interface StatusHistoryEntry {
  id: string;
  status: ContactStatus;
  changedByName: string;
  changedById: string | null;
  changedAt: string;
}

/** One row from GET /admin/centres/:facilityCode/waitlist. Fields are optional/defensive. */
export interface WaitlistEntry {
  id?: string;
  name?: string;
  email?: string;
  /** Backend field is spelled "phoneNo". */
  phoneNo?: string;
  /** Phone country code, e.g. "+1" — only present when the signup/import captured one. */
  countryCode?: string;
  /** Backend source flag — 'foundation' | 'launchWaitlist'. */
  subscriptionSrc?: string;
  registerdVia?: string; // sic — backend spelling
  /** QR-campaign attribution code (e.g. a qrcampaign doc's `code`), when the
   * signup came through a campaign link/QR scan rather than the plain form. */
  registrationSource?: string;
  plan?: string;
  createdAt?: string;
  /** Server-supplied queue position; derived from the row index when absent. */
  position?: number;
  /** Admin notes, oldest first. Defaults to [] server-side — never null. */
  notes?: AdminNote[];
  /** Defaults to 'not_contacted' server-side on older docs — never absent on a real response. */
  status?: ContactStatus;
  /** Contact-status change log, oldest first. Defaults to [] server-side — never null. */
  statusHistory?: StatusHistoryEntry[];
  details?: {
    subscription_code?: string;
    [key: string]: unknown;
  };
}

/** One row of a "Import from Excel" upload, sent to POST /admin/centres/waitlist/import. */
export interface WaitlistImportRow {
  name: string;
  email: string;
  phone?: string;
  countryCode?: string;
  registerdVia?: string; // sic — backend spelling
  timestamp?: string;
}

/** Response from POST /admin/centres/waitlist/import. */
export interface WaitlistImportResult {
  createdCount: number;
  skippedCount: number;
  skipped?: { email: string; reason: string }[];
}

/** One row from GET /admin/centres/:facilityCode/leads. Fields are optional/defensive. */
export interface LeadEntry {
  id?: string;
  /** Raw funnel action, e.g. "checkout_session_creation_attempted". */
  action?: string;
  timestamp?: string;
  createdAt?: string;
  /** Admin notes, oldest first. Defaults to [] server-side — never null. */
  notes?: AdminNote[];
  /** Defaults to 'not_contacted' server-side on older docs — never absent on a real response. */
  status?: ContactStatus;
  /** Contact-status change log, oldest first. Defaults to [] server-side — never null. */
  statusHistory?: StatusHistoryEntry[];
  /** Set on leads added manually via "+ Add Lead" — not present on funnel-tracked leads. */
  name?: string;
  phone?: string;
  details?: {
    /** Only present on manually-added leads — funnel-tracked leads have no name of their own here. */
    name?: string;
    email?: string;
    /** Only present on manually-added leads (backend field is spelled "phoneNo") — funnel-tracked leads have no phone. */
    phoneNo?: string;
    /** Funnel-derived leads' plan — the checkout-session subscription code. */
    subscription_code?: string;
    /** Manually-added leads' plan — free-text "Plan interest" chosen on the Add Lead form. */
    planInterest?: string;
    billing_cycle?: string;
    [key: string]: unknown;
  };
}

/* ── Wizard form models ── */

export interface CentreDiscount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'free_sessions';
  value: number;
  appliesTo: string;
  promoCode: string;
}

export interface WizardPlanRow {
  /** Plan code — one of the fixed catalogue ids, or any live global plan's code. */
  planId: PlanId | string;
  enabled: boolean;
  fortnightlyPrice: number;
  annualPrice: number;
  allocatedSlots: number;
  joiningFee: number;
  memberCap: number | null;
  isFoundationEligible: boolean;
  /** Country codes the plan is available in; ['all'] = everywhere. */
  availableCountries: string[];
  firstGuestFee: number | null;
  additionalGuestDiscountPct: number | null;
  extraSessionCost: number | null;
}

export interface WizardState {
  /** Wizard session id returned by POST /wizard/start */
  wizardId: string | null;
  // Step 1
  name: string;
  shortCode: string;
  status: CentreApiStatus;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  timezone: string;
  phone: string;
  email: string;
  is24x7: boolean;
  operatingHours: OperatingHoursDay[];
  // Step 2
  overallCapacity: number | '';
  foundationPool: number | '';
  battingLanes: number | '';
  bowlingLanes: number | '';
  multipurposeLanes: number | '';
  facilities: string[];
  slotDurationMinutes: number;
  advanceBookingWindowDays: number;
  // Step 3
  additionalFacilities: AdditionalFacility[];
  // Step 4
  plans: WizardPlanRow[];
  firstGuestFee: number | null;
  additionalGuestDiscountPct: number | null;
  extraSessionCost: number | null;
  discounts: CentreDiscount[];
  // Review — optional scheduling metadata, all UTC ISO 8601. Not yet consumed by any
  // backend action (no lifecycle endpoint exists) — carried through as a facility
  // field for whenever that lands. Empty/absent = not scheduled for that behavior.
  keyDates: CentreKeyDates;
}

export interface CentreKeyDates {
  goLiveAt?: string;
  waitlistOpenAt?: string;
  waitlistCloseAt?: string;
  salesStartAt?: string;
  salesEndAt?: string;
  promoStartAt?: string;
  promoEndAt?: string;
}

export type AdditionalFacilityType = 'gym' | 'podcast' | 'meeting' | 'gaming' | 'custom';

export interface FacilityPhoto {
  name: string;
  previewUrl: string;
}

export interface AdditionalFacility {
  id: string;
  type: AdditionalFacilityType;
  enabled: boolean;
  name: string;
  // Pricing
  fortnightlyPrice: number;
  annualDiscountPct: number;
  // Capacity & access
  totalCapacity: number;
  concurrentCapacity: number;
  seatingCapacity?: number;
  slotDuration: string; // "60 minutes" | "No fixed slots (open access)"
  // Guest access
  guestSessionPrice: number;
  freeGuestVisits: number;
  // Operating hours
  openTime: string;
  closeTime: string;
  /** When true, this facility is open 24 hours — openTime/closeTime are kept
   * (as '00:00'/'23:59') for display/back-compat but the two time inputs are
   * hidden in favour of a single "24 Hours" toggle. */
  is24Hours?: boolean;
  photos?: FacilityPhoto[];
  // Gaming-specific
  psUnits?: number;
  chargePerHour?: number;
  minSession?: string;
  maxSession?: string;
  // Gym-specific (bookingModel="membership_addon" — billed with the member's
  // plan rather than paid per slot). `fortnightlyPrice` above doubles as the
  // gym's fortnightly add-on price. See ApiGym*/FacilityProductModal.tsx for
  // the matching Facilities-page fields this mirrors. A family's gym charge is
  // just fortnightlyPrice × however many family members have the add-on — no
  // separate rate is configured.
  /** Optional override of the calculated annual price — see ApiGymPricingTier. */
  annualPrice?: number;
  gymModel?: 'bundled' | 'standalone' | 'both';
  slotStartIntervalMinutes?: number;
  maxMembersPerSlot?: number;
  minGapHours?: number;
  freeGymEntryWithLaneBooking?: boolean;
  freeTrialSlots?: 0 | 1 | 2;
  minimumAge?: number;
  parentPresentFrom?: number;
  parentPresentTo?: number;
  consentFrom?: number;
  consentTo?: number;
  gymPinRequired?: boolean;
  gymPinBefore?: number;
  gymPinAfter?: number;
  facilityPinBefore?: number;
  facilityPinAfter?: number;
  inductionRequired?: boolean;
  // Custom facilities only — lets "Add custom facility" choose the same two
  // facility types the Facilities page offers: paid per booking (hourly), or
  // a membership add-on like Gym (reuses all the gym-specific fields above).
  bookingModel?: 'pay_per_slot' | 'membership_addon';
  // Pay-per-slot (podcast/meeting/gaming/custom) hourly pricing — a member
  // picks any whole number of hours from 1 up to maxBookableHours (no
  // separate "min", it's always 1); `fortnightlyPrice` above doubles as the
  // hourly rate for these types too.
  maxBookableHours?: number;
  // Door PIN windows for pay-per-slot facilities — minutes-before only, same
  // two-door idea as Gym's gymPinBefore/facilityPinBefore: `doorPinBefore` is
  // this room's own door, `roomFacilityPinBefore` the building's main entrance.
  doorPinBefore?: number;
  roomFacilityPinBefore?: number;
}

/* ════════════════════════════════════════════════════════════════════════════
 *  3. Redux slice state
 * ════════════════════════════════════════════════════════════════════════════ */

/** Params accepted by the `getCentres` list thunk. */
export interface GetCentresParams {
  status?: CentreApiStatus;
  search?: string;
  skip: number;
  limit: number;
}

export interface CentresInitialState {
  // ── Centre grid (list) ──
  facilities: FacilitySummary[];
  total: number;
  isLoading: boolean;
  error: string | null;
  /** requestId of the most recently dispatched getCentres call — lets the reducer
   * discard an older, slower request's response that resolves after a newer one
   * (e.g. typing "h" then "hh" quickly), which would otherwise silently overwrite
   * the correct results with a stale/broader list. */
  centresRequestId: string | null;

  // ── Single centre (details bundle) ──
  details: CentreBundle | null;
  detailsLoading: boolean;
  detailsError: string | null;

  // ── Create / update ──
  saving: boolean;

  // ── Waitlist / Leads ──
  waitlist: WaitlistEntry[];
  waitlistLoading: boolean;
  waitlistError: string | null;
  waitlistTotal: number;
  waitlistPage: number;
  waitlistLimit: number;
  leads: LeadEntry[];
  leadsLoading: boolean;
  leadsError: string | null;
  leadsTotal: number;
  leadsPage: number;
  leadsLimit: number;
}

export const initialState: CentresInitialState = {
  facilities: [],
  total: 0,
  isLoading: true,
  error: null,
  centresRequestId: null,

  details: null,
  detailsLoading: false,
  detailsError: null,

  saving: false,

  waitlist: [],
  waitlistLoading: false,
  waitlistError: null,
  waitlistTotal: 0,
  waitlistPage: 1,
  waitlistLimit: 20,
  leads: [],
  leadsLoading: false,
  leadsError: null,
  leadsTotal: 0,
  leadsPage: 1,
  leadsLimit: 20,
};
