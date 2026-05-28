import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';

import authReducer from './auth/reducers';
import inductionReducer from './induction/reducers';
import maintenanceReducer from './maintenance/reducers';
import membersReducer from './members/reducers';
import { authPersistConfig } from './persistConfig';
import slotsReducer from './slots/reducers';
import staffReducer from './staff/reducers';
import tailgateReducer from './tailgate/reducers';

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  induction: inductionReducer,
  maintenance: maintenanceReducer,
  members: membersReducer,
  slots: slotsReducer,
  staff: staffReducer,
  tailgate: tailgateReducer,
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
