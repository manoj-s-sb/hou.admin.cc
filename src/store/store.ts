import { configureStore } from '@reduxjs/toolkit';

import authReducer from './auth/reducers';
import inductionReducer from './induction/reducers';
import maintenanceReducer from './maintenance/reducers';
import membersReducer from './members/reducers';
import slotsReducer from './slots/reducers';
import tailgateReducer from './tailgate/reducers';

const store = configureStore({
  // store
  reducer: {
    auth: authReducer,
    induction: inductionReducer,
    maintenance: maintenanceReducer,
    members: membersReducer,
    slots: slotsReducer,
    tailgate: tailgateReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
