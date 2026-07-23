/**
 * Maps the 5-step wizard's flat `WizardState` onto the backend's grouped
 * create bundle ({ facility, lanes[], memberships[], membershipSalesFlow }).
 *
 * Best-effort: every key the spec documents is set. Nested objects the wizard
 * does not collect (security/features/induction/tour/slotScheduleConfig, lane
 * restrictions, detailed membership rules, sales-flow phases) use the DEFAULT_*
 * constants below so refinement — once a real CENTRE_CREATE_SAMPLE.json is
 * supplied — is localized to this file.
 */
import { PLAN_CATALOGUE } from '../constants';

import type {
  ApiFacility,
  ApiLane,
  ApiMembership,
  ApiMembershipSalesFlow,
  CentreBundle,
  CentreCreateRequest,
  OperatingHoursDay,
  OperatingHoursMap,
  WizardState,
} from '../../../store/centres/types';

const num = (v: number | string | ''): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

/** Tolerate either a clean IANA value or a "America/Chicago (CT)" label. */
const stripTz = (tz: string): string => tz.replace(/\s*\(.*\)\s*$/, '').trim();

const DAY_KEYS: (keyof OperatingHoursMap)[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/** Build the {monday..sunday:["HH:MM-HH:MM"]} map from the wizard's day rows. */
const toOperatingHours = (days: OperatingHoursDay[], is24x7: boolean): OperatingHoursMap => {
  const map = {} as OperatingHoursMap;
  DAY_KEYS.forEach((key, idx) => {
    if (is24x7) {
      map[key] = ['00:00-23:59'];
      return;
    }
    const row = days.find(d => d.day === idx);
    map[key] = row?.isOpen ? [`${row.openTime}-${row.closeTime}`] : [];
  });
  return map;
};

// ── Defaults for fields the wizard doesn't yet collect (refine on real JSON) ──
const DEFAULT_LANE_PITCH = { '60': { xStart: 0, xEnd: 0, yStart: 0, yEnd: 0 } };
const DEFAULT_BOOKING_RULES = {
  generalBookingRules: {},
  slotPurchaseRules: {},
  guestBookingRules: {},
  coachBookingRules: {},
};

/** Expand lane counts into individual lane docs. */
const buildLanes = (state: WizardState): ApiLane[] => {
  const lanes: ApiLane[] = [];
  let laneNo = 1;
  const code = state.shortCode.toUpperCase();
  const push = (type: ApiLane['laneType'], count: number) => {
    for (let i = 0; i < count; i += 1) {
      lanes.push({
        type: 'lane',
        laneNo,
        laneType: type,
        status: 'active',
        code: `${code}-L${laneNo}`,
        lanePitchMapping: { ...DEFAULT_LANE_PITCH },
        speedRestriction: null,
        ballIntervalRestriction: null,
        startIntervalRestriction: null,
        swing: null,
        deviation: null,
        ballsCountRestriction: null,
      });
      laneNo += 1;
    }
  };
  push('batting', num(state.battingLanes));
  push('bowling', num(state.bowlingLanes));
  push('multipurpose', num(state.multipurposeLanes));
  return lanes;
};

/** Enabled plan rows → membership docs. Guest charges go under bookingRules. */
const buildMemberships = (state: WizardState): ApiMembership[] =>
  state.plans
    .filter(p => p.enabled)
    .map(p => {
      const meta = PLAN_CATALOGUE.find(c => c.id === p.planId);
      return {
        type: 'membership',
        code: p.planId,
        // Persist the proper display label + access hours so the centre's Plans &
        // Pricing page reads them from the API (not a frontend lookup).
        name: meta?.name ?? p.planId.charAt(0).toUpperCase() + p.planId.slice(1),
        isPopular: p.planId === 'premium',
        pricing: {
          billingCycles: ['fortnightly', 'annual'],
          regular: { fortnightly: p.fortnightlyPrice, annual: p.annualPrice },
          promo: {},
        },
        registrationFee: p.joiningFee,
        access: { hours: meta?.access ?? '' },
        bookingRules: {
          ...DEFAULT_BOOKING_RULES,
          // Only persist guest-pricing fields that were actually set — blank stays absent
          // (so the centre shows "—" rather than a hardcoded value).
          guestBookingRules: {
            ...(p.firstGuestFee !== null ? { firstGuestFee: p.firstGuestFee } : {}),
            ...(p.additionalGuestDiscountPct !== null
              ? { additionalGuestDiscountPct: p.additionalGuestDiscountPct }
              : {}),
            ...(p.extraSessionCost !== null ? { extraSessionCost: p.extraSessionCost } : {}),
          },
        },
        memberTypes: [],
        accessControl: { availableCountries: p.availableCountries },
        membershipPolicies: {},
        description: '',
        stripe: { regular: null, promo: null, texRateId: null, taxRate: 0 },
        benefits: [],
      };
    });

/** Capacity + foundation → sales-flow doc. */
const buildSalesFlow = (state: WizardState): ApiMembershipSalesFlow => {
  const plans: Record<string, number> = {};
  state.plans
    .filter(p => p.enabled)
    .forEach(p => {
      plans[p.planId] = p.allocatedSlots;
    });
  return {
    type: 'membershipsalesflow',
    capacity: { total: num(state.overallCapacity), plans },
    foundationMembership: { pool: num(state.foundationPool) },
  };
};

/** Additional bookable facilities (gym/podcast/meeting/gaming) → features map. */
const buildFeatures = (state: WizardState): Record<string, unknown> => {
  const features: Record<string, unknown> = {};
  state.additionalFacilities
    .filter(f => f.enabled)
    .forEach(f => {
      const existing = features[f.type];
      const entry = {
        name: f.name,
        fortnightlyPrice: f.fortnightlyPrice,
        annualDiscountPct: f.annualDiscountPct,
        totalCapacity: f.totalCapacity,
        concurrentCapacity: f.concurrentCapacity,
        slotDuration: f.slotDuration,
        guestSessionPrice: f.guestSessionPrice,
        freeGuestVisits: f.freeGuestVisits,
        openTime: f.openTime,
        closeTime: f.closeTime,
        psUnits: f.psUnits,
        chargePerHour: f.chargePerHour,
      };
      // Multi-instance types (podcast/meeting) collect into an array.
      if (Array.isArray(existing)) (existing as unknown[]).push(entry);
      else if (existing) features[f.type] = [existing, entry];
      else features[f.type] = f.type === 'podcast' || f.type === 'meeting' ? [entry] : entry;
    });
  return features;
};

const buildFacility = (state: WizardState): ApiFacility => ({
  type: 'facility',
  code: state.shortCode.toUpperCase(),
  name: state.name,
  cityCode: state.city, // TODO: backend may expect a code, not a name
  countryCode: state.country,
  stateCode: state.state,
  timezone: stripTz(state.timezone),
  status: state.status,
  latitude: 0,
  longitude: 0,
  freeSolts: num(state.foundationPool),
  // Mirror the overall capacity onto the facility doc (matches the seed shape) so
  // Reports/analytics — which read facility.capacity.overallCapacity — reflect it.
  capacity: {
    overallCapacity: num(state.overallCapacity),
    foundationPool: num(state.foundationPool),
  },
  // General amenities the user ticked in "Facilities Available" — surfaced on the
  // centre Facilities page (so those chips are real per-centre data, not hardcoded).
  amenities: state.facilities,
  address: {
    street: [state.addressLine1, state.addressLine2].filter(Boolean).join(', '),
    suburb: '',
    city: state.city,
    state: state.state,
    postcode: state.postcode,
    country: state.country,
  },
  contact: {
    email: state.email,
    phones: [{ type: 'regular', supportTime: '', phone: state.phone }],
  },
  operatingHours: toOperatingHours(state.operatingHours, state.is24x7),
  holidays: [],
  // Not collected by the wizard yet — refine when the sample JSON is available.
  security: {},
  features: buildFeatures(state),
  waitlist: {},
  edgeDevice: {},
  induction: {},
  tour: {},
  slotScheduleConfig: {
    slotDurationMinutes: state.slotDurationMinutes,
    advanceBookingWindowDays: state.advanceBookingWindowDays,
  },
});

export function buildCreatePayload(state: WizardState, original?: CentreBundle): CentreCreateRequest {
  const facility = buildFacility(state);
  const lanes = buildLanes(state);
  const memberships = buildMemberships(state);
  const membershipSalesFlow = buildSalesFlow(state);

  // On edit, graft the server-generated ids back on so the backend updates the
  // existing docs (matched by code) rather than treating this as a create.
  if (original) {
    facility.id = original.facility?.id;
    membershipSalesFlow.id = original.membershipSalesFlow?.id;
    lanes.forEach(l => {
      l.id = original.lanes?.find(o => o.code === l.code)?.id;
    });
    memberships.forEach(m => {
      m.id = original.memberships?.find(o => o.code === m.code)?.id;
    });
  }

  return { facility, lanes, memberships, membershipSalesFlow };
}
