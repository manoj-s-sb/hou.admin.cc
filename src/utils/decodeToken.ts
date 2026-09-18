import { jwtDecode } from 'jwt-decode';

import store from '../store/store';

import { logger } from './logger';

export interface DecodedToken {
  facilityCode?: string;
  [key: string]: unknown;
}

export const decodeToken = (): DecodedToken => {
  const accessToken = store.getState().auth.tokens?.access_token;
  if (!accessToken) return {};
  try {
    return jwtDecode<DecodedToken>(accessToken);
  } catch (error) {
    logger.error('Error decoding token', error);
    return {};
  }
};
