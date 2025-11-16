import { createSlice } from "@reduxjs/toolkit";
import { initialState } from "./types";
import { login } from "./api";
import { saveTokenExpirationTime, clearTokenExpirationTime } from "../../utils/tokenUtils";

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.loginResponse = null;
      state.error = null;
      localStorage.removeItem("loginResponse");
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("tokens");
      localStorage.removeItem("user");
      clearTokenExpirationTime();
    },
  },
  extraReducers: (builder) => {
    builder.addCase(login.pending, (state) => {
      state.isLoading = true;
      state.isAuthenticated = false;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      const tokens = action.payload?.data?.tokens;
      localStorage.setItem("tokens", JSON.stringify(tokens));
      localStorage.setItem("isAuthenticated", JSON.stringify(true));
      localStorage.setItem("user", JSON.stringify(action.payload?.data?.user));
      
      // Save token expiration time
      if (tokens?.expires_in) {
        saveTokenExpirationTime(tokens.expires_in);
      }
      
      state.isLoading = false;
      state.loginResponse = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.loginResponse = null;
      state.error = action.payload || "Login failed. Please try again.";
    });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
