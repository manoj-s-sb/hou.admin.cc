import type { CSSProperties } from 'react';

import type {
  AdditionalFacilityType,
  CentreApiStatus,
  CentreBooking,
  CentreMember,
  OperatingHoursMap,
  PlanId,
} from '../../store/centres/types';

export const PLAN_COLORS: Record<PlanId, string> = {
  premium: '#21295A',
  standard: '#008482',
  offpeak: '#d97706',
  nightowl: '#0891b2',
  family: '#7c3aed',
};

export interface PlanMeta {
  id: PlanId;
  name: string;
  colour: string;
  access: string;
  fortnightly: number;
  annual: number;
  defaultSlots: number;
  defaultFoundation: boolean;
  demographics: string[];
}

/** Global plan catalogue — the network-wide plans a centre can opt into. */
export const PLAN_CATALOGUE: PlanMeta[] = [
  {
    id: 'premium',
    name: 'Premium',
    colour: '#21295A',
    access: '24/7',
    fortnightly: 59.95,
    annual: 2493.92,
    defaultSlots: 50,
    defaultFoundation: true,
    demographics: ['adult', 'professional'],
  },
  {
    id: 'standard',
    name: 'Standard',
    colour: '#008482',
    access: '24/7',
    fortnightly: 39.95,
    annual: 1661.92,
    defaultSlots: 200,
    defaultFoundation: true,
    demographics: ['adult', 'youth', 'senior'],
  },
  {
    id: 'offpeak',
    name: 'Off Peak',
    colour: '#d97706',
    access: '9am–3pm & 11pm–6am',
    fortnightly: 19.95,
    annual: 829.92,
    defaultSlots: 50,
    defaultFoundation: false,
    demographics: ['senior', 'student'],
  },
  {
    id: 'nightowl',
    name: 'Night Owl',
    colour: '#0891b2',
    access: '11pm–6am',
    fortnightly: 13.95,
    annual: 580.32,
    defaultSlots: 100,
    defaultFoundation: false,
    demographics: ['student', 'professional'],
  },
  {
    id: 'family',
    name: 'Family',
    colour: '#7c3aed',
    access: '24/7',
    fortnightly: 39.95,
    annual: 1661.92,
    defaultSlots: 50,
    defaultFoundation: true,
    demographics: ['family'],
  },
];

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

export const COUNTRIES = [
  { code: 'AU', label: 'Australia' },
  { code: 'US', label: 'United States' },
  { code: 'UK', label: 'United Kingdom' },
  { code: 'UAE', label: 'United Arab Emirates' },
  { code: 'IN', label: 'India' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'ZA', label: 'South Africa' },
];

export const TIMEZONES: { value: string; label: string }[] = [
  { value: 'America/Chicago', label: 'America/Chicago (CT)' },
  { value: 'America/New_York', label: 'America/New_York (ET)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PT)' },
  { value: 'America/Denver', label: 'America/Denver (MT)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST)' },
  { value: 'Australia/Melbourne', label: 'Australia/Melbourne (AEST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
];

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

/** Emoji flag for a country code (used on the centre cards). */
const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸',
  USA: '🇺🇸',
  AU: '🇦🇺',
  UK: '🇬🇧',
  GB: '🇬🇧',
  UAE: '🇦🇪',
  AE: '🇦🇪',
  IN: '🇮🇳',
  IND: '🇮🇳',
  NZ: '🇳🇿',
  ZA: '🇿🇦',
};

export const countryFlag = (countryCode: string): string => COUNTRY_FLAGS[(countryCode || '').toUpperCase()] ?? '🏟️';

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
  { key: 'suspended', label: 'Suspended' },
];

/* ── Status → pill tone. Render as `cmx-pill cmx-pill-<tone>`. ── */
export const CENTRE_STATUS: Record<CentreApiStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'green' },
  draft: { label: 'Draft', tone: 'amber' },
  suspended: { label: 'Suspended', tone: 'red' },
};
export const MEMBER_STATUS_TONE: Record<CentreMember['status'], string> = {
  Active: 'green',
  'On Hold': 'amber',
  Suspended: 'red',
};
export const BOOKING_STATUS_TONE: Record<CentreBooking['status'], string> = {
  Confirmed: 'blue',
  Completed: 'green',
  'No-show': 'red',
  Cancelled: 'gray',
  Waitlisted: 'amber',
};

/* ── Members tab ── */
export const AVATAR_COLORS = ['#21295A', '#008482', '#d97706', '#7c3aed', '#0891b2', '#d42b2b'];

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
export const WIZARD_STEPS = ['Details', 'Facilities', 'Add. Facilities', 'Plans & Pricing', 'Review'];
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
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
