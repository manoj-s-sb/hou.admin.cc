/**
 * Maps live global membership-plan templates (`GET /admin/memberships`, no
 * facilityCode — see store/memberships/api.ts's getMemberships) onto the same
 * `PlanMeta` shape the wizard was built around, so a plan created on the
 * Membership Plans page shows up here for selection without a redeploy —
 * no more hardcoded PLAN_CATALOGUE.
 */
import type { WizardPlanRow } from '../../../store/centres/types';
import type { MembershipPlan } from '../../../store/memberships/types';
import type { PlanMeta } from '../constants';

// Rotates for any plan whose colour wasn't set on the Membership Plans page.
const FALLBACK_PALETTE = ['#21295A', '#008482', '#d97706', '#0891b2', '#7c3aed', '#d42b2b', '#059669', '#be185d'];

// The wizard's demographic filter predates the live plan model, which only
// carries adult/junior/family eligibility flags — not youth/senior/student/
// professional. Map what we can; tags with no real signal fall back to
// 'adult' so a plan is never invisible under every filter.
const demographicsOf = (plan: MembershipPlan): string[] => {
  const tags: string[] = [];
  if (plan.eligibility?.adult) tags.push('adult', 'professional');
  if (plan.eligibility?.junior) tags.push('youth');
  if (plan.eligibility?.family) tags.push('family');
  return tags.length ? tags : ['adult'];
};

export const toPlanCatalogue = (plans: MembershipPlan[]): PlanMeta[] =>
  plans.map((p, i) => ({
    id: p.code,
    name: p.name,
    colour: p.colour || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
    access: p.accessHours || p.accessType,
    fortnightly: p.fortnightlyPrice,
    annual: p.annualPrice,
    defaultSlots: p.slotsPerCycle || 50,
    defaultFoundation: false,
    demographics: demographicsOf(p),
  }));

/** A fresh, disabled row for a catalogue plan — used to seed `WizardState.plans`. */
export const defaultPlanRow = (meta: PlanMeta): WizardPlanRow => ({
  planId: meta.id,
  enabled: false,
  fortnightlyPrice: meta.fortnightly,
  annualPrice: meta.annual,
  allocatedSlots: meta.defaultSlots,
  joiningFee: 0,
  memberCap: meta.defaultSlots,
  isFoundationEligible: meta.defaultFoundation,
  availableCountries: ['all'],
  firstGuestFee: null,
  additionalGuestDiscountPct: null,
  extraSessionCost: null,
});
