import { jwtDecode } from 'jwt-decode';

export const decodeToken = (): any => {
  const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
  try {
    return jwtDecode(tokens?.access_token || '{}');
  } catch (error) {
    console.error('Error decoding token:', error);
    return {};
  }
};
