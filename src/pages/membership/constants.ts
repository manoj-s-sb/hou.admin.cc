/** Currency options for the network reference prices (display-only conversion). */
export interface CurrencyOption {
  code: string;
  symbol: string;
  /** Conversion rate from the USD base price. */
  rate: number;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', rate: 1 },
  { code: 'AUD', symbol: 'A$', rate: 1.52 },
  { code: 'INR', symbol: '₹', rate: 83.2 },
  { code: 'EUR', symbol: '€', rate: 0.92 },
  { code: 'GBP', symbol: '£', rate: 0.79 },
];

/** Centre/region filters shown above the plan tables. */
export const PLAN_REGION_FILTERS = [
  { key: 'all', label: 'All centres' },
  { key: 'USA', label: '🇺🇸 USA' },
  { key: 'AUS', label: '🇦🇺 Australia' },
  { key: 'IND', label: '🇮🇳 India' },
];

export const SLOT_DURATION_MINUTES = 45;

/**
 * Facility whose memberships the page loads from
 * `GET /admin/memberships?facilityCode=…`. Until a facility picker is wired up,
 * the page defaults to this code.
 */
export const DEFAULT_FACILITY_CODE = 'BLR01';
