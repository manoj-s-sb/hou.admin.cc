import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./auth/reducers";
import inductionReducer from "./induction/reducers";
import membersReducer from "./members/reducers";

const store = configureStore({
  reducer: {
    auth: authReducer,
    induction: inductionReducer,
    members: membersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
