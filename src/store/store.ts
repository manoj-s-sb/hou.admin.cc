import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';

import authReducer from './auth/reducers';
import centresReducer from './centres/reducers';
import inductionReducer from './induction/reducers';
import maintenanceReducer from './maintenance/reducers';
import membersReducer from './members/reducers';
import membershipsReducer from './memberships/reducers';
import { authPersistConfig } from './persistConfig';
import reportsReducer from './reports/reducers';
import slotsReducer from './slots/reducers';
import staffReducer from './staff/reducers';
import tailgateReducer from './tailgate/reducers';
import ticketsReducer from './tickets/reducers';

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  centres: centresReducer,
  induction: inductionReducer,
  maintenance: maintenanceReducer,
  members: membersReducer,
  memberships: membershipsReducer,
  reports: reportsReducer,
  slots: slotsReducer,
  staff: staffReducer,
  tailgate: tailgateReducer,
  tickets: ticketsReducer,
});

const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
