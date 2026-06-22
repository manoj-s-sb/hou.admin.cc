import { jwtDecode } from 'jwt-decode';

import store from '../store/store';

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
    console.error('Error decoding token:', error);
    return {};
  }
};
