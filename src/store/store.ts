import { configureStore } from '@reduxjs/toolkit';

import authReducer from './auth/reducers';
import inductionReducer from './induction/reducers';
import membersReducer from './members/reducers';
import slotsReducer from './slots/reducers';

const store = configureStore({
  reducer: {
    auth: authReducer,
    induction: inductionReducer,
    members: membersReducer,
    slots: slotsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
