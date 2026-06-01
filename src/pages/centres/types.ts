/**
 * Centre Management — TypeScript data models.
 * Mirrors the backend models for the Centre Management module so the wizard,
 * card grid and ops view all speak the same shape.
 */

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

export interface CentrePlanAssignment {
  id: string;
  centreId: string;
  planId: PlanId;
  fortnightlyPrice: number;
  annualPrice: number;
  allocatedSlots: number;
  memberCap: number | null;
  isFoundationEligible: boolean;
  firstGuestFee: number;
  additionalGuestDiscountPct: number;
  extraSessionCost: number;
  status: 'enabled' | 'disabled';
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

export interface NetworkSummary {
  totalCentres: number;
  totalMembers: number;
  avgUtilisation: number;
  avgNoShow: number;
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
  firstGuestFee: number;
  additionalGuestDiscountPct: number;
  extraSessionCost: number;
}

export interface WizardState {
  /** Wizard session id returned by POST /wizard/start */
  wizardId: string | null;
  // Step 1
  name: string;
  shortCode: string;
  status: 'draft' | 'active';
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
  firstGuestFee: number;
  additionalGuestDiscountPct: number;
  extraSessionCost: number;
  discounts: CentreDiscount[];
}

export type AdditionalFacilityType = 'gym' | 'podcast' | 'meeting' | 'gaming';

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
  photoName?: string;
  // Gaming-specific
  psUnits?: number;
  chargePerHour?: number;
  minSession?: string;
  maxSession?: string;
}
