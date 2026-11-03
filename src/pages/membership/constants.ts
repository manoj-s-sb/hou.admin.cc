/** Currency options for the network reference prices (display-only conversion). */
export interface CurrencyOption {
  code: string;
  symbol: string;
  /** Conversion rate from the USD base price. */
  rate: number;
}

// Covers every country PLAN_COUNTRY_CHIPS (src/pages/centres/constants.ts)
// can dynamically surface — a centre's country is what drives which of these
// shows up on the Membership Plans filter bar (see dynamicPlanCountryChips),
// so every one of those countries needs a currency here too, not just
// whichever ones happened to exist when this list was first written. Rates
// are the static OFFLINE fallback only — getFxRates() supplies live rates
// whenever that succeeds (see MembershipPlans' `fx` state).
export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', rate: 1 },
  { code: 'AUD', symbol: 'A$', rate: 1.52 },
  { code: 'INR', symbol: '₹', rate: 83.2 },
  { code: 'GBP', symbol: '£', rate: 0.79 },
  { code: 'NZD', symbol: 'NZ$', rate: 1.64 },
  { code: 'ZAR', symbol: 'R', rate: 18.5 },
];

export const SLOT_DURATION_MINUTES = 45;
