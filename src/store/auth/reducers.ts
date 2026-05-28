import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { login } from './api';
import { AuthTokens, initialState, Permissions, User } from './types';

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setTokens: (state, action: PayloadAction<AuthTokens | null>) => {
      state.tokens = action.payload;
      state.tokenExpirationTime = action.payload?.expires_in ? Date.now() + action.payload.expires_in * 1000 : null;
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
    },
    setPermissions: (state, action: PayloadAction<Permissions | null>) => {
      state.permissions = action.payload;
    },
    logout: state => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.loginResponse = null;
      state.tokens = null;
      state.user = null;
      state.permissions = null;
      state.tokenExpirationTime = null;
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder.addCase(login.pending, state => {
      state.isLoading = true;
      state.isAuthenticated = false;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      const data = action.payload?.data;
      state.tokens = data?.tokens ?? null;
      state.user = data?.user ?? null;
      state.permissions = data?.permissions ?? null;
      state.tokenExpirationTime = data?.tokens?.expires_in ? Date.now() + data.tokens.expires_in * 1000 : null;
      state.loginResponse = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.loginResponse = null;
      state.error = action.payload || 'Login failed. Please try again.';
    });
  },
});

export const { logout, setTokens, setUser, setPermissions } = authSlice.actions;
export default authSlice.reducer;
