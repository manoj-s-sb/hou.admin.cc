import { configureStore } from '@reduxjs/toolkit';

import authReducer from './auth/reducers';
import inductionReducer from './induction/reducers';
import membersReducer from './members/reducers';
import slotsReducer from './slots/reducers';
import waitlistReducer from './waitlist/reducers';

const store = configureStore({
  reducer: {
    auth: authReducer,
    induction: inductionReducer,
    members: membersReducer,
    slots: slotsReducer,
    waitlist: waitlistReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
