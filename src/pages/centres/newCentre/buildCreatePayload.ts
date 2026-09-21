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
import type {
  AdditionalFacilityType,
  ApiFacility,
  ApiLane,
  ApiMembership,
  ApiMembershipSalesFlow,
  ApiProductInput,
  CentreBundle,
  CentreCreateRequest,
  FacilityAddonsMap,
  OperatingHoursDay,
  OperatingHoursMap,
  WizardState,
} from '../../../store/centres/types';
import type { PlanMeta } from '../constants';

const num = (v: number | string | ''): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

/** Tolerate either a clean IANA value or a "America/Chicago (CT)" label. */
const stripTz = (tz: string): string => tz.replace(/\s*\(.*\)\s*$/, '').trim();

/** The wizard's country dropdown (constants.ts's COUNTRIES) uses short, partly
 * non-standard codes (UK/UAE, not ISO GB/AE). Maps them to real ISO 3166-1
 * alpha-3 so `facility.countryCode` (lowercase) / `address.country` (uppercase)
 * match the DB's actual shape. Unknown codes fall through to ''. */
const COUNTRY_ISO_ALPHA3: Record<string, string> = {
  AU: 'aus',
  US: 'usa',
  UK: 'gbr',
  UAE: 'are',
  IN: 'ind',
  NZ: 'nzl',
  ZA: 'zaf',
};
const toIso3 = (code: string): string => COUNTRY_ISO_ALPHA3[code.toUpperCase()] ?? '';

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
      map[key] = ['00:00-24:00'];
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
  // "hybrid", not "multipurpose" — matches what real lane documents (and the
  // slots module's laneType) actually use; see facilities/index.tsx's LANE_META.
  push('hybrid', num(state.multipurposeLanes));
  return lanes;
};

/**
 * Enabled plan rows → membership docs, matching the real doc shape (see a live
 * plan like BLR01's "premium" for reference). Only fields the wizard actually
 * collects get real values (pricing, registration fee amount, guest pricing,
 * location/facility codes); everything else the wizard has no UI for yet
 * (transitionPolicy, membershipPolicies' cancellation/hold/violations detail,
 * memberTypes, door/lane accessControl timing, benefits copy) is left as an
 * empty placeholder rather than guessed — most critically `stripe`, which must
 * NEVER be fabricated (a wrong product/price id would misroute real payments).
 */
const buildMemberships = (state: WizardState, catalogue: PlanMeta[]): ApiMembership[] => {
  const facilityCode = state.shortCode.toUpperCase();
  const countryCode = toIso3(state.country);
  const stateCode = (state.state || '').toLowerCase();

  return state.plans
    .filter(p => p.enabled)
    .map(p => {
      const meta = catalogue.find(c => c.id === p.planId);
      return {
        type: 'membership',
        code: p.planId,
        status: 'active',
        // Persist the proper display label + access hours so the centre's Plans &
        // Pricing page reads them from the API (not a frontend lookup).
        name: meta?.name ?? p.planId.charAt(0).toUpperCase() + p.planId.slice(1),
        isPopular: p.planId === 'premium',
        // Mirrors the facility's own location codes (same derivation, same gaps —
        // no city-code source in the wizard yet).
        cityCode: '',
        countryCode,
        stateCode,
        facilityCode,
        pricing: {
          billingCycles: ['fortnightly', 'annual'],
          regular: {
            fortnightly: p.fortnightlyPrice,
            annual: p.annualPrice,
            currency: 'usd',
            // Not computed — the real annual/fortnightly relationship isn't a
            // fixed multiplier, so a guessed % would likely be wrong.
            savings: {},
          },
          // No promo-pricing step in the wizard today.
          promo: {},
        },
        registrationFee: {
          enabled: p.joiningFee > 0,
          amount: p.joiningFee,
          currency: 'usd',
          appliesOn: 'initial-purchase',
          // Never fabricated — a wrong Stripe id would misroute a real charge.
          stripeProductId: '',
          stripePriceId: '',
          description: '',
          earlyBirdCutoffDate: '',
        },
        access: {
          type: meta?.access ?? '',
          mainDoorAccess: '',
          laneAccess: '',
          restrictions: {},
        },
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
          roomSlotRules: {},
        },
        memberTypes: {},
        accessControl: {
          // Wizard-only bookkeeping (which countries this plan is offered in) —
          // round-tripped by bundleToWizardState, not part of the real door/lane
          // accessControl shape, but harmless alongside it (backend is permissive).
          availableCountries: p.availableCountries,
          mainDoor: {},
          lane: {},
        },
        membershipPolicies: {},
        description: { fortnightly: '', annual: '' },
        stripe: {
          regular: { productId: '', fortnightlyPriceId: '', annualPriceId: '' },
          promo: { productId: '', fortnightlyPriceId: '', annualPriceId: '' },
          texRateId: '',
          taxRate: 0,
        },
        benefits: [],
      };
    });
};

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

/** Stable product `code` per additional-facility instance — matches the real, hand-created
 * docs' naming (e.g. "blr01-podcastroom") so the wizard's output lines up with existing data. */
const productCodeFor = (f: WizardState['additionalFacilities'][number], indexInType: number): string => {
  switch (f.type) {
    case 'gym':
      return 'gym';
    case 'gaming':
      return 'gaming';
    case 'podcast':
      return indexInType > 1 ? `podcastroom-${indexInType}` : 'podcastroom';
    case 'meeting':
      return indexInType > 1 ? `meetingroom-${indexInType}` : 'meetingroom';
    default: {
      const slug = (f.name || 'custom-facility')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      return slug || `custom-${indexInType}`;
    }
  }
};

/**
 * Additional bookable facilities (gym/podcast/meeting/gaming/custom) → product docs.
 * The backend (CentreService._build_product_doc) maps these flat fields into the SAME
 * nested structure the real docs use, and on /update these are CREATE-ONLY — an
 * existing product code is never overwritten or deleted (see facility_models.py).
 */
const buildProducts = (state: WizardState): ApiProductInput[] => {
  const seen: Record<string, number> = {};
  return state.additionalFacilities
    .filter(f => f.enabled)
    .map(f => {
      seen[f.type] = (seen[f.type] ?? 0) + 1;
      return {
        type: 'product',
        code: productCodeFor(f, seen[f.type]),
        name: f.name,
        status: 'active',
        fortnightlyPrice: f.fortnightlyPrice,
        guestSessionPrice: f.guestSessionPrice,
        totalCapacity: f.totalCapacity,
        concurrentCapacity: f.concurrentCapacity,
        seatingCapacity: f.seatingCapacity,
        slotDuration: f.slotDuration,
        freeGuestVisits: f.freeGuestVisits,
      };
    });
};

// Additional-facility type → the addon key + display label the real DB docs use
// (matches productCodeFor's naming for podcast/meeting).
const ADDON_KEY: Record<AdditionalFacilityType, string> = {
  gym: 'gym',
  podcast: 'podcastroom',
  meeting: 'meetingroom',
  gaming: 'gaming',
  custom: 'custom',
};
const ADDON_LABEL: Record<AdditionalFacilityType, string> = {
  gym: 'Gym',
  podcast: 'Podcast Room',
  meeting: 'Meeting Room',
  gaming: 'Gaming',
  custom: 'Custom',
};

/**
 * `facility.addons` — tab-config metadata (which tabs show on the centre page,
 * in what order), distinct from the `product` docs (buildProducts) which carry
 * the actual pricing/booking rules for the same feature. Lane is always a tab;
 * the rest mirror whichever "Additional Facilities" the wizard has enabled.
 */
const buildAddons = (state: WizardState): FacilityAddonsMap[] => {
  const map: FacilityAddonsMap = {
    lane: { status: 'active', isTab: true, group: 'tab', order: 1, label: 'Lane' },
  };
  let order = 2;
  state.additionalFacilities
    .filter(f => f.enabled)
    .forEach(f => {
      map[ADDON_KEY[f.type]] = {
        status: 'active',
        isTab: true,
        group: 'tab',
        order: order++,
        label: f.name || ADDON_LABEL[f.type],
      };
    });
  return [map];
};

const buildFacility = (state: WizardState): ApiFacility => ({
  type: 'facility',
  code: state.shortCode.toUpperCase(),
  name: state.name,
  // No city-code source in the wizard today (free-text city name only) — send
  // empty rather than the name itself, which isn't a valid code.
  cityCode: '',
  countryCode: toIso3(state.country),
  // Not collected by the wizard (no region picker) — empty until one exists.
  regionCode: '',
  // Best-effort: the wizard's State field is free text (often postcode-lookup
  // filled with a short code like "KA"), lowercased to match the DB convention.
  stateCode: (state.state || '').toLowerCase(),
  timezone: stripTz(state.timezone),
  status: state.status,
  // Not collected by the wizard (no map/coordinate picker) yet.
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
    // No suburb field in the wizard today.
    suburb: '',
    city: state.city,
    state: state.state,
    postcode: state.postcode,
    country: toIso3(state.country).toUpperCase(),
  },
  contact: {
    email: state.email,
    // The wizard collects one phone number — reused for both channels, since
    // there's no separate WhatsApp number field. supportTime isn't collected.
    phones: [
      { type: 'regular', supportTime: '', phone: state.phone },
      { type: 'whatsapp', supportTime: '', phone: state.phone },
    ],
  },
  operatingHours: toOperatingHours(state.operatingHours, state.is24x7),
  // Not collected by the wizard yet (no holiday-dates step).
  holidays: [],
  addons: buildAddons(state),
  // Not collected by the wizard yet — refine when a real UI step lands for these.
  security: {},
  // Additional bookable facilities are written as `product` docs (see buildProducts
  // below), not here — this field is unused dead weight kept only for back-compat.
  features: {},
  waitlist: {},
  edgeDevice: {},
  induction: {},
  tour: {},
  slotScheduleConfig: {
    slotDurationMinutes: state.slotDurationMinutes,
    advanceBookingWindowDays: state.advanceBookingWindowDays,
  },
  // No backend lifecycle endpoint consumes this yet — carried through so it round-trips
  // (edit re-opens with whatever was set) once that lands. Unset fields serialize away.
  keyDates: state.keyDates,
});

export function buildCreatePayload(
  state: WizardState,
  catalogue: PlanMeta[],
  original?: CentreBundle
): CentreCreateRequest {
  const facility = buildFacility(state);
  const lanes = buildLanes(state);
  const memberships = buildMemberships(state, catalogue);
  const membershipSalesFlow = buildSalesFlow(state);
  // Products are matched by `code` on the backend (not a grafted id) — an existing
  // code is skipped there (create-only), so nothing to graft here on edit.
  const products = buildProducts(state);

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

  return { facility, lanes, memberships, membershipSalesFlow, products };
}
