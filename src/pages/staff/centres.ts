const CENTRE_PREFIX_TO_CITY: Record<string, string> = {
  BLR: 'Bangalore',
  HYD: 'Hyderabad',
  MUM: 'Mumbai',
  DEL: 'Delhi',
  CHE: 'Chennai',
  KOL: 'Kolkata',
  PUN: 'Pune',
};

const CENTRE_CODE_OVERRIDES: Record<string, string> = {};

export const formatCentreName = (code: string | null | undefined): string => {
  if (!code) return '—';
  const upper = code.toUpperCase();
  if (CENTRE_CODE_OVERRIDES[upper]) return CENTRE_CODE_OVERRIDES[upper];
  const prefix = upper.replace(/\d+$/, '');
  return CENTRE_PREFIX_TO_CITY[prefix] ?? code;
};

export const formatCentres = (codes: string[] | null | undefined, fallback?: string | null): string => {
  if (codes && codes.length > 0) {
    return codes.map(formatCentreName).join(', ');
  }
  return formatCentreName(fallback ?? '');
};
