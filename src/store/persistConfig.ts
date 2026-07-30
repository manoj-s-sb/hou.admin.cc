import storage from 'redux-persist/lib/storage';

export const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: [
    'isAuthenticated',
    'loginResponse',
    'tokens',
    'user',
    'permissions',
    'scope',
    'sidebar',
    'assignedCentres',
    'tokenExpirationTime',
  ],
};
