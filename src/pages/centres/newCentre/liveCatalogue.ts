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

// MP-10: the plan's own tags ARE the wizard's demographic language now — no
// more guessed mapping from a fixed adult/junior/family shape onto a different
// 6-group one. A plan with no tags at all still falls back to 'adult' rather
// than being invisible under every filter.
const demographicsOf = (plan: MembershipPlan): string[] =>
  plan.eligibilityTags.length ? plan.eligibilityTags : ['adult'];

// MP-1: an archived plan is retired from new assignments — exclude it from the
// catalogue so it can never be selected for a centre going forward. This is
// additive-only against the wizard's `s.plans` (see the useEffect that seeds
// missing rows from this catalogue), so a centre that already has this plan
// enabled from before it was archived keeps that row untouched; only a brand
// new selection is blocked.
export const toPlanCatalogue = (plans: MembershipPlan[]): PlanMeta[] =>
  plans
    .filter(p => p.status !== 'archived')
    .map((p, i) => ({
      id: p.code,
      name: p.name,
      colour: p.colour || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
      access: p.accessHours || p.accessType,
      fortnightly: p.fortnightlyPrice,
      offersAnnual: p.offersAnnual,
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
  // Starts matching whatever the template offers — the admin can still turn it
  // off per centre (e.g. a country where annual billing isn't offered yet).
  offersAnnual: meta.offersAnnual,
  annualPrice: meta.offersAnnual ? meta.annual : 0,
  allocatedSlots: meta.defaultSlots,
  joiningFee: 0,
  memberCap: meta.defaultSlots,
  isFoundationEligible: meta.defaultFoundation,
  availableCountries: ['all'],
  firstGuestFee: null,
  additionalGuestDiscountPct: null,
  extraSessionCost: null,
});
