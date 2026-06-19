/**
 * Centre Management — NEW backend contract types (doc-bundle model).
 *
 * A "centre" = one `facility` + N `lanes` + N `memberships` + one
 * `membershipSalesFlow`, all tied by `facilityCode`. These mirror the shapes
 * returned/accepted by:
 *   - POST /admin/centres/list     → { facilities[], total, skip, limit }
 *   - POST /admin/centres/details  → CentreBundle
 *   - POST /admin/centres/create   → CentreBundle (echoes the created docs)
 *
 * Spellings are kept verbatim from the backend spec (note `freeSolts`).
 * Deeply-nested sub-objects the wizard does not yet collect are typed loosely
 * (Record<string, unknown>) and will be tightened once a real response JSON is
 * supplied.
 */

export type CentreApiStatus = 'draft' | 'active' | 'suspended';

/* ── List ────────────────────────────────────────────────────────────────── */

/**
 * Per-centre rollup the card grid displays. NOT yet returned by
 * `/admin/centres/list` — the backend needs to enrich each list row with this
 * (member counts, bookings, utilisation, tailgates, open tasks, plan split).
 * Optional so the card degrades to "—" until that lands.
 */
export interface FacilityKpi {
  totalMembers?: number;
  bookings30d?: number;
  utilisationPct?: number;
  noShowPct?: number;
  tailgates?: number;
  openTasks?: number;
  /** Member count per plan code (premium / standard / family / …). */
  plans?: Record<string, number>;
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
  /** Optional rollup — present once the backend enriches list rows. */
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
  status: 'draft' | 'active';
  latitude: number;
  longitude: number;
  freeSolts: number; // sic
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
  laneType: 'batting' | 'bowling' | 'multipurpose';
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

/** Grouped bundle returned by /details and /create. */
export interface CentreBundle {
  facility: ApiFacility;
  lanes: ApiLane[];
  memberships: ApiMembership[];
  membershipSalesFlow: ApiMembershipSalesFlow;
}

export interface CentreDetailsRequest {
  code: string;
}

/** Create body — same bundle, server fills id/timestamps. */
export type CentreCreateRequest = CentreBundle;
