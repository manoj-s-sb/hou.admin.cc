import { createSlice } from '@reduxjs/toolkit';
import { initialState } from './types';
import { login } from './api';

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.loginResponse = null;
      state.error = null;
      localStorage.removeItem('loginResponse');
      localStorage.removeItem('isAuthenticated');
    },
  },
  extraReducers: (builder) => {
    builder.addCase(login.pending, (state) => {
      state.isLoading = true;
      state.isAuthenticated = false;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      localStorage.setItem('tokens', JSON.stringify(action.payload?.data?.tokens));
      localStorage.setItem('isAuthenticated', JSON.stringify(true));
      console.log(action.payload);
      state.isLoading = false;
      state.loginResponse = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    });
    builder.addCase(login.rejected, (state, action) => {
      console.log(action);
      state.isLoading = false;
      state.isAuthenticated = false;
      state.loginResponse = null;
      state.error = action.payload || 'Login failed. Please try again.';
    });
  }
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;