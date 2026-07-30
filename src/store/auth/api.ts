import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

// Redux async thunk for state management
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(`${endpoints.login}`, {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Login failed'));
    }
  }
);

/**
 * GET /admin/auth/me — source of truth for the current user's role, permissions
 * and scope. Called on app boot so a changed role/scope takes effect without a
 * full re-login. A 401 is handled globally (session-expired); other failures are
 * swallowed so the persisted auth still drives the UI.
 */
export const fetchMe = createAsyncThunk('auth/fetchMe', async (_: void, { rejectWithValue }) => {
  try {
    const response = await api.get(`${endpoints.me}`);
    return response.data;
  } catch (error) {
    return rejectWithValue(handleApiError(error, 'Could not refresh session'));
  }
});
