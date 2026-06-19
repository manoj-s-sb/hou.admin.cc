import type { PlanId } from './types';

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
  NZ: '🇳🇿',
  ZA: '🇿🇦',
};

export const countryFlag = (countryCode: string): string =>
  COUNTRY_FLAGS[(countryCode || '').toUpperCase()] ?? '🏟️';

/** Deterministic accent colour for a centre's card stripe, derived from its code. */
const CENTRE_PALETTE = ['#21295A', '#008482', '#d97706', '#0891b2', '#7c3aed', '#d42b2b'];

export const centreColour = (code: string): string => {
  let hash = 0;
  for (let i = 0; i < (code || '').length; i += 1) hash = (hash + code.charCodeAt(i)) % CENTRE_PALETTE.length;
  return CENTRE_PALETTE[hash];
};
