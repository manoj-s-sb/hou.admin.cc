import store from '../store/store';

export const isTokenExpired = (): boolean => {
  const { tokens, tokenExpirationTime } = store.getState().auth;
  if (!tokenExpirationTime) {
    return !tokens;
  }
  const buffer = 60 * 1000;
  return Date.now() >= tokenExpirationTime - buffer;
};

export const getTokenRemainingTime = (): number => {
  const { tokenExpirationTime } = store.getState().auth;
  if (!tokenExpirationTime) return 0;
  return Math.max(0, Math.floor((tokenExpirationTime - Date.now()) / 1000));
};
