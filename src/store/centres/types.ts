/**
 * Centre Management — all TypeScript models for the module, in one place.
 *
 * Three layers live here:
 *   1. Backend contract (doc-bundle API): FacilitySummary, CentreBundle, …
 *   2. Domain / wizard models the UI speaks: Centre, WizardState, CentreMember, …
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

export interface ApiFacility {
  type: 'facility';
  code: string; // 3–10, UPPER, unique
  name: string;
  cityCode: string;
  countryCode: string;
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
  isPopular: boolean;
  pricing: MembershipPricing;
  registrationFee: number;
  access: Record<string, unknown>;
  bookingRules: Record<string, unknown>;
  memberTypes: unknown[];
  accessControl: Record<string, unknown>;
  membershipPolicies: Record<string, unknown>;
  description: string;
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
export interface ApiProduct {
  type: 'product';
  id?: string;
  code: string;
  facilityCode: string;
  isAddon?: boolean;
  bookingModel?: string;
  name: string;
  description?: string;
  benefits?: string[];
  status: string; // e.g. "active" | "commingsoon"
  version?: number;
  slotPricing?: {
    default?: { price: number; currency: string };
    texRateId?: string;
    taxRate?: number;
  };
  sessionRules?: {
    durationMinutes?: number;
    slotIncrementMinutes?: number;
    slotCapacity?: number;
    maxBookingsPerDay?: number;
    maxActiveBookings?: number;
    advanceBookingDays?: number;
    noWalkIns?: boolean;
  };
  guestPolicy?: {
    maxGuestsPerSlot?: number;
    additionalGuestPrice?: number;
  };
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
  status?: string;
  fortnightlyPrice?: number;
  guestSessionPrice?: number;
  totalCapacity?: number;
  concurrentCapacity?: number;
  seatingCapacity?: number;
  slotDuration?: string;
  freeGuestVisits?: number;
}

/** Create/update body — same bundle shape, but `products` is the write-side (flatter) shape. */
export type CentreCreateRequest = Omit<CentreBundle, 'products'> & { products?: ApiProductInput[] };

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

export interface CentreMember {
  id: string;
  name: string;
  email: string;
  plan: string;
  memberType: string;
  joinDate: string;
  bookings: number;
  status: 'Active' | 'On Hold' | 'Suspended';
}

export interface CentreBooking {
  id: string;
  member: string;
  lane: string;
  date: string;
  time: string;
  sessionType: string;
  status: 'Confirmed' | 'Completed' | 'No-show' | 'Cancelled' | 'Waitlisted';
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
  planId: PlanId;
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

  // ── Ops dashboard ──
  members: CentreMember[];
  membersLoading: boolean;
  bookings: CentreBooking[];
  bookingsLoading: boolean;

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

  members: [],
  membersLoading: false,
  bookings: [],
  bookingsLoading: false,

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
