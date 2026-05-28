import store from '../store/store';

export const getLocalUser = (): { userId: string; name: string; facilityCode: string } => {
  const u = store.getState().auth.user;
  if (!u) return { userId: '', name: '', facilityCode: '' };
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return { userId: u.userId || '', name, facilityCode: u.facilityCode || '' };
};
