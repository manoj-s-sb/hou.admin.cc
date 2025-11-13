import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./auth/reducers";
import inductionReducer from "./induction/reducers";

const store = configureStore({
  reducer: {
    auth: authReducer,
    induction: inductionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
