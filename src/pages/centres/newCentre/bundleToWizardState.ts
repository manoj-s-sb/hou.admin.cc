/**
 * Reverse of `buildCreatePayload` — maps a backend `CentreBundle` (returned by
 * /admin/centres/details) back onto the flat `WizardState` so the New Centre
 * wizard can open pre-filled for editing / activating an existing draft.
 *
 * Best-effort: fields the wizard never persisted to the bundle (the facilities
 * chip list, additional bookable facilities, centre discounts) fall back to
 * sensible defaults — the bundle is the source of truth for everything else.
 */
import { DAYS, PLAN_CATALOGUE } from '../constants';

import { makeAdditionalFacility } from './AdditionalFacilitiesStep';

import type {
  AdditionalFacility,
  AdditionalFacilityType,
  ApiMembership,
  CentreBundle,
  OperatingHoursDay,
  OperatingHoursMap,
  PlanId,
  WizardPlanRow,
  WizardState,
} from '../../../store/centres/types';

const DAY_KEYS: (keyof OperatingHoursMap)[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

/** Present (not null/undefined) — used to keep guest-pricing blank when unset. */
const hasVal = (v: unknown): boolean => v !== undefined && v !== null;

const FEATURE_TYPES: AdditionalFacilityType[] = ['gym', 'podcast', 'meeting', 'gaming', 'custom'];

/**
 * Rebuild the wizard's additional-facilities list from the saved `facility.features`
 * map so editing a centre shows the ones already configured (and re-saving keeps
 * them instead of replacing the map with only the newly-added one).
 */
const featuresToAdditional = (features: Record<string, unknown> | undefined): AdditionalFacility[] => {
  const out: AdditionalFacility[] = [];
  Object.entries(features ?? {}).forEach(([type, val]) => {
    if (!FEATURE_TYPES.includes(type as AdditionalFacilityType)) return;
    const entries = Array.isArray(val) ? val : val && typeof val === 'object' ? [val] : [];
    entries.forEach((raw, i) => {
      const e = raw as Record<string, unknown>;
      const base = makeAdditionalFacility(type as AdditionalFacilityType, i + 1);
      out.push({
        ...base,
        name: (e.name as string) || base.name,
        fortnightlyPrice: num(e.fortnightlyPrice),
        annualDiscountPct: num(e.annualDiscountPct),
        totalCapacity: num(e.totalCapacity) || base.totalCapacity,
        concurrentCapacity: num(e.concurrentCapacity) || base.concurrentCapacity,
        slotDuration: (e.slotDuration as string) || base.slotDuration,
        guestSessionPrice: num(e.guestSessionPrice),
        freeGuestVisits: num(e.freeGuestVisits),
        openTime: (e.openTime as string) || base.openTime,
        closeTime: (e.closeTime as string) || base.closeTime,
        psUnits: hasVal(e.psUnits) ? num(e.psUnits) : base.psUnits,
        chargePerHour: hasVal(e.chargePerHour) ? num(e.chargePerHour) : base.chargePerHour,
      });
    });
  });
  return out;
};

/** Parse a "HH:MM-HH:MM" range into [open, close]; falls back to sane defaults. */
const splitRange = (range: string | undefined): [string, string] => {
  const m = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(range ?? '');
  return m ? [m[1], m[2]] : ['06:00', '23:00'];
};

const toWizardHours = (hours: OperatingHoursMap | undefined): OperatingHoursDay[] =>
  DAYS.map((_, day) => {
    const ranges = hours?.[DAY_KEYS[day]] ?? [];
    const [openTime, closeTime] = splitRange(ranges[0]);
    return { day, openTime, closeTime, isOpen: ranges.length > 0 };
  });

const is24x7Hours = (hours: OperatingHoursMap | undefined): boolean =>
  !!hours && DAY_KEYS.every(k => (hours[k] ?? [])[0] === '00:00-23:59');

/** Base plan rows (all disabled) — enabled rows get overlaid from the bundle. */
const basePlanRows = (): WizardPlanRow[] =>
  PLAN_CATALOGUE.map(p => ({
    planId: p.id,
    enabled: false,
    fortnightlyPrice: p.fortnightly,
    annualPrice: p.annual,
    allocatedSlots: p.defaultSlots,
    joiningFee: 0,
    memberCap: p.defaultSlots,
    isFoundationEligible: p.defaultFoundation,
    availableCountries: ['all'],
    firstGuestFee: null,
    additionalGuestDiscountPct: null,
    extraSessionCost: null,
  }));

const guestRulesOf = (m: ApiMembership): Record<string, unknown> =>
  (m.bookingRules?.guestBookingRules as Record<string, unknown>) ?? {};

export function bundleToWizardState(bundle: CentreBundle): WizardState {
  const { facility, lanes, memberships, membershipSalesFlow } = bundle;
  const addr = facility.address;
  const slotCfg = (facility.slotScheduleConfig ?? {}) as Record<string, unknown>;
  const capacityPlans = membershipSalesFlow?.capacity?.plans ?? {};
  const reg = memberships[0] ? guestRulesOf(memberships[0]) : {};

  const laneCount = (type: string) => lanes.filter(l => l.laneType === type).length;
  // Capacity source of truth is the sales-flow doc; fall back to the value mirrored
  // onto the facility doc (facility.capacity.overallCapacity) when the sales-flow is absent.
  const totalCapacity = num(membershipSalesFlow?.capacity?.total) || num(facility.capacity?.overallCapacity);

  // The saved per-plan allocation lives in capacity.plans. Backends may key it by
  // plan id, membership code, or name — try each. Returns null when truly absent
  // (vs. 0) so we never confuse "unallocated" with "missing data".
  const lookupAlloc = (planId: string, m: ApiMembership): number | null => {
    for (const key of [planId, m.code, m.name]) {
      if (key && Object.prototype.hasOwnProperty.call(capacityPlans, key)) {
        return num(capacityPlans[key]);
      }
    }
    return null;
  };

  // Pass 1: overlay enabled memberships; record which ones had no saved allocation.
  const unknownAlloc: PlanId[] = [];
  let knownAllocSum = 0;
  const plans = basePlanRows().map(row => {
    const m = memberships.find(mm => mm.code === row.planId);
    if (!m) return row;
    const regular = (m.pricing?.regular ?? {}) as Record<string, unknown>;
    const guest = guestRulesOf(m);
    const countries = ((m.accessControl as Record<string, unknown>)?.availableCountries as string[]) ?? ['all'];
    const alloc = lookupAlloc(row.planId, m);
    if (alloc === null) unknownAlloc.push(row.planId);
    else knownAllocSum += alloc;
    return {
      ...row,
      enabled: true,
      fortnightlyPrice: num(regular.fortnightly) || row.fortnightlyPrice,
      annualPrice: num(regular.annual) || row.annualPrice,
      allocatedSlots: alloc ?? row.allocatedSlots,
      joiningFee: num(m.registrationFee),
      isFoundationEligible: row.isFoundationEligible,
      availableCountries: countries.length ? countries : ['all'],
      firstGuestFee: hasVal(guest.firstGuestFee) ? num(guest.firstGuestFee) : null,
      additionalGuestDiscountPct: hasVal(guest.additionalGuestDiscountPct)
        ? num(guest.additionalGuestDiscountPct)
        : null,
      extraSessionCost: hasVal(guest.extraSessionCost) ? num(guest.extraSessionCost) : null,
    };
  });

  // Pass 2: for plans with no saved allocation, share out the remaining capacity
  // rather than each defaulting to its (large) catalogue slot count — which would
  // otherwise blow past a small total and falsely trip over-allocation on load.
  if (unknownAlloc.length && totalCapacity > 0) {
    const leftover = Math.max(totalCapacity - knownAllocSum, 0);
    const per = Math.floor(leftover / unknownAlloc.length);
    plans.forEach(p => {
      if (unknownAlloc.includes(p.planId)) p.allocatedSlots = per;
    });
  }

  return {
    wizardId: null,
    name: facility.name ?? '',
    shortCode: (facility.code ?? '').toUpperCase(),
    status: facility.status === 'active' ? 'active' : facility.status === 'suspended' ? 'suspended' : 'draft',
    addressLine1: addr?.street ?? '',
    addressLine2: '',
    city: addr?.city ?? facility.cityCode ?? '',
    state: addr?.state ?? facility.stateCode ?? '',
    postcode: addr?.postcode ?? '',
    country: addr?.country ?? facility.countryCode ?? '',
    timezone: facility.timezone ?? '',
    phone: facility.contact?.phones?.[0]?.phone ?? '',
    email: facility.contact?.email ?? '',
    is24x7: is24x7Hours(facility.operatingHours),
    operatingHours: toWizardHours(facility.operatingHours),
    overallCapacity: totalCapacity || '',
    foundationPool:
      num(facility.freeSolts) ||
      num((membershipSalesFlow?.foundationMembership as Record<string, unknown>)?.pool) ||
      '',
    battingLanes: laneCount('batting'),
    bowlingLanes: laneCount('bowling'),
    // Real lane documents use "hybrid" — see buildCreatePayload.ts.
    multipurposeLanes: laneCount('hybrid'),
    facilities: facility.amenities?.length ? facility.amenities : ['Batting Lanes', 'Bowling Lanes'],
    slotDurationMinutes: num(slotCfg.slotDurationMinutes) || 45,
    advanceBookingWindowDays: num(slotCfg.advanceBookingWindowDays) || 7,
    additionalFacilities: featuresToAdditional(facility.features),
    plans,
    firstGuestFee: hasVal(reg.firstGuestFee) ? num(reg.firstGuestFee) : null,
    additionalGuestDiscountPct: hasVal(reg.additionalGuestDiscountPct) ? num(reg.additionalGuestDiscountPct) : null,
    extraSessionCost: hasVal(reg.extraSessionCost) ? num(reg.extraSessionCost) : null,
    discounts: [],
    keyDates: facility.keyDates ?? {},
  };
}
