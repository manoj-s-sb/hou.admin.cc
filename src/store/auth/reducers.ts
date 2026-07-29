import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { fetchMe, login } from './api';
import { AuthTokens, initialState, Permissions, Scope, User } from './types';

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
    setScope: (state, action: PayloadAction<Scope | null>) => {
      state.scope = action.payload;
    },
    logout: state => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.loginResponse = null;
      state.tokens = null;
      state.user = null;
      state.permissions = null;
      state.scope = null;
      state.sidebar = null;
      state.assignedCentres = null;
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
      state.scope = data?.scope ?? null;
      state.sidebar = data?.sidebar ?? null;
      state.assignedCentres = data?.assignedCentres ?? null;
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
      state.error = (action.payload as string) || 'Login failed. Please try again.';
    });
    // /me is the source of truth — refresh role/permissions/scope in place without
    // touching tokens or auth status (a failed /me leaves persisted auth intact).
    builder.addCase(fetchMe.fulfilled, (state, action) => {
      const data = action.payload?.data;
      if (!data) return;
      if (data.user) state.user = data.user;
      state.permissions = data.permissions ?? null;
      state.scope = data.scope ?? null;
      // Only overwrite sidebar/centres when /me actually returns them, so a lean
      // /me response never wipes what login stored.
      if (data.sidebar !== undefined) state.sidebar = data.sidebar ?? null;
      if (data.assignedCentres !== undefined) state.assignedCentres = data.assignedCentres ?? null;
    });
  },
});

export const { logout, setTokens, setUser, setPermissions, setScope } = authSlice.actions;
export default authSlice.reducer;
