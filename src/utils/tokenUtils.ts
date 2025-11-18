/**
 * Token expiration utility functions
 */

/**
 * Save token expiration time to localStorage
 * @param expiresIn - Time in seconds until token expires
 */
export const saveTokenExpirationTime = (expiresIn: number): void => {
  const expirationTime = Date.now() + expiresIn * 1000; // Convert to milliseconds
  localStorage.setItem("tokenExpirationTime", expirationTime.toString());
};

/**
 * Check if the token has expired
 * @returns true if token is expired, false otherwise
 */
export const isTokenExpired = (): boolean => {
  const expirationTimeStr = localStorage.getItem("tokenExpirationTime");

  if (!expirationTimeStr) {
    // If no expiration time is stored, check if tokens exist
    const tokens = localStorage.getItem("tokens");
    return !tokens; // Token is expired if no tokens exist
  }

  const expirationTime = parseInt(expirationTimeStr, 10);
  const currentTime = Date.now();

  // Add a 1-minute buffer to expire tokens slightly before actual expiration
  const buffer = 60 * 1000; // 1 minute in milliseconds

  return currentTime >= expirationTime - buffer;
};

/**
 * Clear token expiration time from localStorage
 */
export const clearTokenExpirationTime = (): void => {
  localStorage.removeItem("tokenExpirationTime");
};

/**
 * Get remaining time until token expires (in seconds)
 * @returns remaining time in seconds, or 0 if expired
 */
export const getTokenRemainingTime = (): number => {
  const expirationTimeStr = localStorage.getItem("tokenExpirationTime");

  if (!expirationTimeStr) {
    return 0;
  }

  const expirationTime = parseInt(expirationTimeStr, 10);
  const currentTime = Date.now();
  const remainingTime = Math.max(0, expirationTime - currentTime);

  return Math.floor(remainingTime / 1000); // Convert to seconds
};
