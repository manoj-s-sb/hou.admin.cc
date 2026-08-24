export interface TypeBucket {
  key: string;
  label: string;
  className: string;
}

// Friendly city labels for known facility codes. This branch has no centre
// catalog API to source this from, so it's a maintained list — add new
// centres here as they come online.
export const FACILITY_CITY_LABEL: Record<string, string> = {
  HOU01: 'Houston',
  NYC01: 'New York',
  BLR01: 'Bangalore',
};

export const ALL_CENTRES_VALUE = '';

export const FACILITY_FILTER_OPTIONS = [
  { value: ALL_CENTRES_VALUE, label: 'All Centres' },
  ...Object.entries(FACILITY_CITY_LABEL).map(([code, city]) => ({
    value: code,
    label: `${city} (${code})`,
  })),
];

export function facilityLabel(code?: string | null): string {
  if (!code) return '—';
  const city = FACILITY_CITY_LABEL[code];
  return city ? `${city} (${code})` : code;
}

// Raw `subscriptionSrc` values (any casing/spacing) map onto one of these
// canonical buckets so legacy naming stays consistent in the UI.
export const LEGACY_TYPE_BUCKET: Record<string, string> = {
  foundation: 'foundation',
  launchwaitlist: 'prelaunch',
  prelaunchwaitlist: 'prelaunch',
  postlaunchwaitlist: 'postlaunch',
  eventwaitlist: 'event',
};

export const TYPE_BUCKET_META: Record<string, { label: string; className: string }> = {
  foundation: { label: 'Foundation', className: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  prelaunch: { label: 'Pre-Launch', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  postlaunch: { label: 'Post-Launch', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  event: { label: 'Event', className: 'bg-purple-50 text-purple-700 border border-purple-200' },
};

// Values sent to the backend when importing/manually assigning a waitlist
// type — chosen so they normalize into the buckets above.
export const WAITLIST_TYPE_OPTIONS = [
  { value: 'foundation', label: 'Foundation' },
  { value: 'launchWaitlist', label: 'Pre-Launch' },
  { value: 'postLaunchWaitlist', label: 'Post-Launch' },
  { value: 'eventWaitlist', label: 'Event' },
];

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function resolveTypeBucket(subscriptionSrc?: string): TypeBucket {
  const raw = (subscriptionSrc || '').trim();
  if (!raw) {
    return { key: 'unknown', label: 'Unknown', className: 'bg-gray-100 text-gray-600 border border-gray-200' };
  }

  const normalized = raw.toLowerCase().replace(/[\s_-]+/g, '');
  const bucketKey = LEGACY_TYPE_BUCKET[normalized];
  if (bucketKey && TYPE_BUCKET_META[bucketKey]) {
    return { key: bucketKey, ...TYPE_BUCKET_META[bucketKey] };
  }

  return { key: normalized, label: titleCase(raw), className: 'bg-sky-50 text-sky-700 border border-sky-200' };
}
