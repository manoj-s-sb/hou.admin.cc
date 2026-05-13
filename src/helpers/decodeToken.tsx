import { jwtDecode } from 'jwt-decode';

import store from '../store/store';

export const decodeToken = (): any => {
  const accessToken = store.getState().auth.tokens?.access_token;
  if (!accessToken) return {};
  try {
    return jwtDecode(accessToken);
  } catch (error) {
    console.error('Error decoding token:', error);
    return {};
  }
};
