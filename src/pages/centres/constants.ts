import type { CSSProperties } from 'react';

import { getAllTimezones, getCountry, getTimezone } from 'countries-and-timezones';
import worldCountries from 'world-countries';

import type { AdditionalFacilityType, CentreApiStatus, OperatingHoursMap, PlanId } from '../../store/centres/types';

export const PLAN_COLORS: Record<PlanId, string> = {
  premium: '#21295A',
  standard: '#008482',
  offpeak: '#d97706',
  nightowl: '#0891b2',
  family: '#7c3aed',
};

export interface PlanMeta {
  /** Plan code — one of the fixed catalogue ids, or any live global plan's code. */
  id: PlanId | string;
  name: string;
  colour: string;
  access: string;
  fortnightly: number;
  annual: number;
  defaultSlots: number;
  defaultFoundation: boolean;
  demographics: string[];
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const DEMOGRAPHICS = [
  { key: 'all', label: 'All plans' },
  { key: 'adult', label: '👤 Adult' },
  { key: 'youth', label: '🧒 Youth' },
  { key: 'senior', label: '🧓 Senior' },
  { key: 'student', label: '🎓 Student' },
  { key: 'family', label: '👨‍👩‍👧 Family' },
  { key: 'professional', label: '💼 Professional' },
];

// ── World country data (name/dial-code/ISO/flag), sourced from the
// `world-countries` package instead of a short hand-picked list — every real
// country is selectable, not just the handful the business originally
// launched in. Two codes are deliberately kept non-standard (UK, not ISO GB;
// UAE, not ISO AE) because they're the exact values this app — and the
// backend's own alpha-3 mapping — already used before this list was widened;
// every other country uses its real ISO-2 code. ──
const LEGACY_CODE_ALIASES: Record<string, string> = { GB: 'UK', AE: 'UAE' };

interface WorldCountryEntry {
  code: string; // this app's code: real ISO-2, except the two aliases above
  label: string;
  iso2: string; // always the real ISO-2
  iso3: string; // always the real ISO-3
  dialCode: string;
  flag: string;
}

const ALL_COUNTRIES: WorldCountryEntry[] = worldCountries
  .filter(c => c.cca2 && c.cca3 && c.name?.common)
  .map(c => ({
    code: LEGACY_CODE_ALIASES[c.cca2] ?? c.cca2,
    label: c.name.common,
    iso2: c.cca2,
    iso3: c.cca3,
    dialCode: c.idd?.root ? `${c.idd.root}${c.idd.suffixes?.[0] ?? ''}` : '',
    flag: c.flag,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const COUNTRIES = ALL_COUNTRIES.map(({ code, label }) => ({ code, label }));

// Phone dial code for every country — keyed on the same (non-ISO for UK/UAE)
// `code` values as COUNTRIES/COUNTRY_FLAGS above.
export const COUNTRY_DIAL_CODES: Record<string, string> = Object.fromEntries(
  ALL_COUNTRIES.map(c => [c.code, c.dialCode])
);

// ISO-3166 alpha-2 codes for the postcode-lookup API (zippopotam.us), which needs
// real ISO codes — our own COUNTRIES.code values aren't all standard (UK/UAE).
export const COUNTRY_ISO_CODES: Record<string, string> = Object.fromEntries(
  ALL_COUNTRIES.map(c => [c.code, c.iso2.toLowerCase()])
);

// ISO-3166 alpha-3 (lowercase) for the backend's facility.countryCode/
// address.country fields — this app's code -> real alpha-3.
export const COUNTRY_ISO3_CODES: Record<string, string> = Object.fromEntries(
  ALL_COUNTRIES.map(c => [c.code, c.iso3.toLowerCase()])
);

// Inverse of COUNTRY_ISO3_CODES — a stored alpha-3 code (either case) back to
// this app's own country code, for displaying an existing centre's country.
export const COUNTRY_ISO3_TO_CODE: Record<string, string> = Object.fromEntries(
  ALL_COUNTRIES.map(c => [c.iso3.toUpperCase(), c.code])
);

// A stored country `code` -> the real ISO-2 the timezone library understands
// (undoes the UK/UAE aliasing above).
const toRealIso2 = (code: string): string => {
  const upper = (code || '').toUpperCase();
  return upper === 'UK' ? 'GB' : upper === 'UAE' ? 'AE' : upper;
};

const tzLabel = (name: string): string => {
  const tz = getTimezone(name);
  return tz ? `${name} (UTC${tz.utcOffsetStr})` : name;
};

/** Every real-world IANA timezone — the Time Zone dropdown's full list before
 * a country has been picked yet (or for a country with no curated mapping). */
export const TIMEZONES: { value: string; label: string }[] = Object.values(getAllTimezones())
  .filter(tz => !tz.aliasOf)
  .map(tz => ({ value: tz.name, label: tzLabel(tz.name) }))
  .sort((a, b) => a.value.localeCompare(b.value));

/** Just the timezones that actually apply to one country — the Time Zone
 * dropdown filters down to these once a country is selected, instead of
 * showing all ~340 global zones regardless of country. */
export const timezonesForCountry = (code: string): { value: string; label: string }[] => {
  const country = getCountry(toRealIso2(code));
  return country ? country.timezones.map(name => ({ value: name, label: tzLabel(name) })) : [];
};

export const FACILITY_OPTIONS = [
  'Batting Lanes',
  'Bowling Lanes',
  'Hybrid Lanes',
  'Simulator Bay',
  'Gym',
  'Coaching Area',
  'Lounge',
  'Pro Shop',
  'Changing Rooms',
  'Parking',
  'Café',
];

export const SLOT_DURATIONS = [30, 45, 60, 90];

export const ADDITIONAL_FACILITY_META: Record<string, { label: string; multiInstance: boolean }> = {
  gym: { label: 'Gym / Fitness Area', multiInstance: false },
  podcast: { label: 'Podcast Rooms', multiInstance: true },
  meeting: { label: 'Meeting Rooms', multiInstance: true },
  gaming: { label: 'Gaming Area', multiInstance: false },
};

/** Emoji flag for every country, keyed the same way as COUNTRIES (code ->
 * flag). A few legacy 3-letter/alternate codes already seen on real centre
 * records (USA, IND, plus the real ISO GB/AE before this app started
 * aliasing them to UK/UAE) are kept mapped to the same flag. */
const FLAG_BY_CODE: Record<string, string> = Object.fromEntries(ALL_COUNTRIES.map(c => [c.code, c.flag]));
const LEGACY_FLAG_ALIASES: Record<string, string> = { USA: 'US', IND: 'IN', GB: 'UK', AE: 'UAE' };

export const countryFlag = (countryCode: string): string => {
  const raw = (countryCode || '').toUpperCase();
  const code = LEGACY_FLAG_ALIASES[raw] ?? raw;
  return FLAG_BY_CODE[code] ?? '🏟️';
};

/** Deterministic accent colour for a centre's card stripe, derived from its code. */
const CENTRE_PALETTE = ['#21295A', '#008482', '#d97706', '#0891b2', '#7c3aed', '#d42b2b'];

export const centreColour = (code: string): string => {
  let hash = 0;
  for (let i = 0; i < (code || '').length; i += 1) hash = (hash + code.charCodeAt(i)) % CENTRE_PALETTE.length;
  return CENTRE_PALETTE[hash];
};

/* ── Shared layout ── */
export const GRID_3: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 };

/* ── Centre list page ── */
export const PAGE_LIMIT = 20;
export const STATUS_FILTERS: { key: '' | CentreApiStatus; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Draft' },
  { key: 'staging', label: 'Staging' },
  { key: 'suspended', label: 'Suspended' },
];

/* ── Status → pill tone. Render as `cmx-pill cmx-pill-<tone>`. ── */
export const CENTRE_STATUS: Record<CentreApiStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'green' },
  draft: { label: 'Draft', tone: 'amber' },
  staging: { label: 'Staging', tone: 'blue' },
  suspended: { label: 'Suspended', tone: 'red' },
};

/* ── Ops view: tabs + per-tab placeholders ── */
export type OpsTab =
  | 'members'
  | 'bookings'
  | 'induction'
  | 'tours'
  | 'tailgate'
  | 'maintenance'
  | 'plans'
  | 'facilities';
export const OPS_TABS: { key: OpsTab; label: string }[] = [
  { key: 'members', label: 'Members' },
  { key: 'bookings', label: 'Slot Bookings' },
  { key: 'induction', label: 'Induction' },
  { key: 'tours', label: 'Tour Details' },
  { key: 'tailgate', label: 'Tailgate Logs' },
  { key: 'maintenance', label: 'Maintenance Logs' },
  { key: 'plans', label: 'Plans' },
  { key: 'facilities', label: 'Facilities' },
];
export const OPS_PLACEHOLDERS: Record<string, { title: string; desc: string }> = {
  induction: { title: 'Induction Management', desc: 'Schedule and track security training for this centre.' },
  tours: { title: 'Tour Details', desc: 'Manage tour bookings and scheduling for this centre.' },
  tailgate: { title: 'Tailgate Logs', desc: 'Video logs, unidentified entries and violation tracking.' },
  maintenance: { title: 'Maintenance Logs', desc: 'Lane and equipment maintenance tracking for this centre.' },
};

/* ── Centre detail: ops module placeholders (modules not yet wired to the API) ── */
export const OPS_MODULE_COPY: Record<string, { title: string; desc: string }> = {
  induction: { title: 'Induction', desc: 'Schedule and track member induction sessions for this centre.' },
  tours: { title: 'Tour List', desc: 'Manage tour bookings and scheduling for this centre.' },
  waitlist: { title: 'Waitlist / Leads', desc: 'Prospective members and waitlisted leads for this centre.' },
  tailgate: {
    title: 'Tailgate Logs',
    desc: 'Video logs, unidentified entries and violation tracking for this centre.',
  },
  maintenance: { title: 'Maintenance Tasks', desc: 'Lane and equipment maintenance tracking for this centre.' },
  tickets: { title: 'Tickets / Incidents', desc: 'Support tickets and incident reports raised for this centre.' },
};

/* ── Facilities tab ── */
export const DEFAULT_AMENITIES = [
  'Changing Rooms',
  'Parking',
  'Café / Canteen',
  'Lounge / Viewing',
  'Pro Shop',
  'Coaching Area',
];

/* ── Operating-hours day keys (API order: Mon→Sun) ── */
export const DAY_KEYS: (keyof OperatingHoursMap)[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/* ── New Centre wizard ── */
export const WIZARD_STEPS = ['Details', 'Facilities', 'Add. Facilities', 'Plans & Pricing', 'Key Dates', 'Review'];
export const PLAN_COUNTRY_CHIPS = [
  { code: 'all', label: '🌐 All countries' },
  { code: 'US', label: '🇺🇸 USA' },
  { code: 'AU', label: '🇦🇺 Australia' },
  { code: 'IN', label: '🇮🇳 India' },
  { code: 'UK', label: '🇬🇧 UK' },
  { code: 'NZ', label: '🇳🇿 New Zealand' },
  { code: 'ZA', label: '🇿🇦 South Africa' },
];
export const WIZARD_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  staging: 'Staging',
  active: 'Active',
  suspended: 'Suspended',
};
export const SHORT_CODE_RE = /^[A-Z0-9]{3,6}$/;

/* ── Additional facilities step ── */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const SLOT_DURATION_OPTIONS = [
  '30 minutes',
  '45 minutes',
  '60 minutes',
  '90 minutes',
  '120 minutes',
  'No fixed slots (open access)',
];
export const ADDITIONAL_FACILITY_PANELS: {
  type: AdditionalFacilityType;
  icon: string;
  iconBg: string;
  title: string;
  desc: string;
  multi: boolean;
}[] = [
  {
    type: 'gym',
    icon: '🏋️',
    iconBg: '#fef9c3',
    title: 'Gym / Fitness area',
    desc: 'Bookable fitness space — capacity, pricing & guest access',
    multi: false,
  },
  {
    type: 'podcast',
    icon: '🎙',
    iconBg: '#ecedf4',
    title: 'Podcast rooms',
    desc: 'Recording spaces — add one or more rooms with individual configs',
    multi: true,
  },
  {
    type: 'meeting',
    icon: '🗂',
    iconBg: '#d0f0f0',
    title: 'Meeting rooms',
    desc: 'Conference spaces — add one or more rooms with individual configs',
    multi: true,
  },
  {
    type: 'gaming',
    icon: '🎮',
    iconBg: '#eeedfe',
    title: 'Gaming area',
    desc: 'PlayStation consoles — instant availability via app',
    multi: false,
  },
];
