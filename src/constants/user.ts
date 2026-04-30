export const getLocalUser = (): { userId: string; name: string; facilityCode: string } => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return { userId: u.userId || '', name, facilityCode: u.facilityCode || '' };
  } catch {
    return { userId: '', name: '', facilityCode: '' };
  }
};

export const FACILITY_CODE = getLocalUser().facilityCode;
