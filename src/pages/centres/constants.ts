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
  /** Whether the global template offers annual billing at all — the wizard's
   * default-off starting point for this plan's own per-centre annual option. */
  offersAnnual: boolean;
  annual: number;
  defaultSlots: number;
  defaultFoundation: boolean;
  demographics: string[];
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// MP-10: the known, curated eligibility tags — shown as ready-made checkboxes
// on the Plan form, and used to prettify these specific keys wherever a plan's
// tags are displayed. This is a label lookup, NOT the only tags a plan can
// have: the Plan form also lets an admin add any other tag on the spot, and
// the wizard's own demographic filter is built dynamically from whatever tags
// actually exist across all live plans (see NewCentreWizard's dynamicDemographics)
// — so a brand new tag works everywhere immediately, no code change required.
export const ELIGIBILITY_TAG_OPTIONS = [
  { key: 'adult', label: '👤 Adult' },
  { key: 'youth', label: '🧒 Youth' },
  { key: 'senior', label: '🧓 Senior' },
  { key: 'student', label: '🎓 Student' },
  { key: 'family', label: '👨‍👩‍👧 Family' },
  { key: 'professional', label: '💼 Professional' },
];
export const ELIGIBILITY_TAG_LABELS: Record<string, string> = Object.fromEntries(
  ELIGIBILITY_TAG_OPTIONS.map(d => [d.key, d.label])
);
/** Humanizes a tag for display — the curated label when known, else a plain
 * capitalized fallback so a brand-new custom tag still reads cleanly. */
export const labelForTag = (key: string): string =>
  ELIGIBILITY_TAG_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);

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
    // `idd.root` is the real, dialable country code (e.g. "+1" for both the US
    // and Canada, "+7" for both Russia and Kazakhstan — genuinely shared, not
    // a mistake). `idd.suffixes` is NOT a tiebreaker digit to append — it's
    // world-countries' internal list of domestic area-code hints for
    // countries whose numbering plan is split with others under the same
    // root. Appending suffixes[0] produced nonsense like "+1201" for the US
    // and "+73" for Russia. The real international dial code is root alone.
    dialCode: c.idd?.root || '',
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

// The `countries-and-timezones` package's own `utcOffsetStr` is a single
// static value per zone — for most zones it's the non-DST (winter) offset,
// which showed New York as "UTC-05:00" even in summer when it's really
// EDT/UTC-04:00. It's also inconsistent between zones that share the exact
// same real rules (its data had Vancouver and Los Angeles — both Pacific
// Time — disagreeing). Computing the offset from `Intl.DateTimeFormat`
// against today's actual date sidesteps both problems: it reflects whatever
// is really in effect right now, for every zone, from the same
// always-current source the rest of the browser's date handling uses.
const currentUtcOffset = (name: string): string | null => {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: name, timeZoneName: 'shortOffset' })
      .formatToParts(new Date())
      .find(p => p.type === 'timeZoneName');
    const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(part?.value ?? '');
    if (!match) return part?.value === 'GMT' ? '+00:00' : null;
    const [, sign, hours, minutes] = match;
    return `${sign}${hours.padStart(2, '0')}:${minutes ?? '00'}`;
  } catch {
    return null;
  }
};

const tzLabel = (name: string): string => {
  const offset = currentUtcOffset(name) ?? getTimezone(name)?.utcOffsetStr;
  return offset ? `${name} (UTC${offset})` : name;
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

// Postcode shape per country — keyed on this app's own `code` values (so 'UK'/'UAE',
// matching COUNTRIES above, not raw ISO). Covers the markets this app actually
// operates in today plus a few other common ones; every other country falls back
// to a loose "looks like a real postcode" check rather than being rejected outright
// — hand-maintaining all ~250 countries' real postal formats isn't worth it for a
// rule whose whole point is catching obvious nonsense like "abc" in a US address.
const POSTCODE_PATTERNS: Record<string, RegExp> = {
  US: /^\d{5}(-\d{4})?$/,
  CA: /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/,
  UK: /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/,
  IN: /^\d{6}$/,
  AU: /^\d{4}$/,
  NZ: /^\d{4}$/,
  ZA: /^\d{4}$/,
  DE: /^\d{5}$/,
  FR: /^\d{5}$/,
  // UAE has no mandatory nationwide postal-code system — nothing to validate.
};

// Loose fallback for any country without a curated pattern above: a handful of
// letters/digits (plus space/hyphen for formats like "1234-567"), not empty, not
// obviously fake. Real-world postcodes run roughly 2–10 characters everywhere.
const GENERIC_POSTCODE_RE = /^[A-Za-z0-9][A-Za-z0-9\s-]{1,9}$/;

/** Whether `postcode` looks like a real postal code for `countryCode` (this
 * app's own country code). Empty is NOT validated here — "required" is a
 * separate, already-existing check; this only catches a filled-in value that
 * doesn't look real (e.g. "abc" for a US address). */
export const isValidPostcode = (postcode: string, countryCode: string): boolean => {
  const trimmed = postcode.trim();
  if (!trimmed) return true;
  const pattern = POSTCODE_PATTERNS[(countryCode || '').toUpperCase()];
  return pattern ? pattern.test(trimmed) : GENERIC_POSTCODE_RE.test(trimmed);
};

// National phone-number length (digits only, AFTER the country's dial code —
// e.g. "5551234567" for a US number, not "+15551234567"), [min, max] inclusive.
// Real numbering plans vary within a country (mobile vs. landline, area-code
// length), so this is a range, not one exact count — the point is catching
// something obviously wrong like a 3-digit number, not policing every valid
// format. Keyed on this app's own `code` values, same as the postcode map above.
const PHONE_LENGTH_RANGES: Record<string, [number, number]> = {
  US: [10, 10],
  CA: [10, 10],
  UK: [9, 10],
  IN: [10, 10],
  AU: [9, 9],
  NZ: [8, 9],
  ZA: [9, 9],
  UAE: [8, 9],
  DE: [6, 11],
  FR: [9, 9],
};

// Fallback for any country without a curated range above — the ITU's E.164
// standard caps a full international number (country code + national number)
// at 15 digits, and a real national number is practically never under 6.
const GENERIC_PHONE_LENGTH_RANGE: [number, number] = [6, 14];

/** Whether `localNumber` (the phone number's digits, with the country's dial
 * code already stripped off — see `stripDialCode`) is a plausible length for
 * `countryCode` (this app's own country code). Empty is NOT validated here —
 * "required" is a separate, already-existing check; this only catches a
 * filled-in value that's obviously too short/long, e.g. a 3-digit number. */
export const isValidPhoneLength = (localNumber: string, countryCode: string): boolean => {
  const digits = localNumber.replace(/\D/g, '');
  if (!digits) return true;
  const [min, max] = PHONE_LENGTH_RANGES[(countryCode || '').toUpperCase()] ?? GENERIC_PHONE_LENGTH_RANGE;
  return digits.length >= min && digits.length <= max;
};

// 'Gym' is deliberately NOT here — it already has its own dedicated panel in
// Step 3 (Additional Facilities), with its own toggle and full pricing/
// capacity/guest-access config. Listing it again here as a plain checkbox
// duplicated the same concept under two different names/places in the wizard.
export const FACILITY_OPTIONS = [
  'Batting Lanes',
  'Bowling Lanes',
  'Hybrid Lanes',
  'Simulator Bay',
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
