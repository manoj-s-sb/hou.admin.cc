type AuthSnapshot = {
  tokens?: { access_token?: string } | null;
  tokenExpirationTime?: number | null;
};

export const isTokenExpired = (auth: AuthSnapshot): boolean => {
  if (!auth.tokenExpirationTime) {
    return !auth.tokens;
  }
  const buffer = 60 * 1000;
  return Date.now() >= auth.tokenExpirationTime - buffer;
};

export const getTokenRemainingTime = (auth: AuthSnapshot): number => {
  if (!auth.tokenExpirationTime) return 0;
  return Math.max(0, Math.floor((auth.tokenExpirationTime - Date.now()) / 1000));
};
