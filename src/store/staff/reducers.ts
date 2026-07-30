import { createSlice } from '@reduxjs/toolkit';

import {
  createStaff,
  createStaffAccessLevel,
  createStaffRole,
  getRoleDefaults,
  getStaffConfig,
  getStaffDetails,
  getStaffList,
  updateStaff,
} from './api';
import { initialState } from './types';

const staffSlice = createSlice({
  name: 'staff',
  initialState,
  reducers: {
    clearStaffDetails: state => {
      state.staffDetails = null;
      state.detailsError = null;
    },
    clearStaffSubmitError: state => {
      state.submitError = null;
    },
    clearRoleDefaults: state => {
      state.roleDefaults = null;
      state.roleDefaultsError = null;
    },
  },
  extraReducers: builder => {
    // ── List ─────────────────────────────────────────────────
    builder.addCase(getStaffList.pending, state => {
      state.isListLoading = true;
      state.listError = null;
    });
    builder.addCase(getStaffList.fulfilled, (state, action) => {
      state.isListLoading = false;
      state.staffList = action.payload?.data?.staff ?? [];
    });
    builder.addCase(getStaffList.rejected, (state, action) => {
      state.isListLoading = false;
      state.listError = (action.payload as string) ?? 'Failed to fetch staff list';
    });

    // ── Config ───────────────────────────────────────────────
    builder.addCase(getStaffConfig.pending, state => {
      state.isConfigLoading = true;
      state.configError = null;
    });
    builder.addCase(getStaffConfig.fulfilled, (state, action) => {
      state.isConfigLoading = false;
      state.staffConfig = action.payload?.data ?? null;
    });
    builder.addCase(getStaffConfig.rejected, (state, action) => {
      state.isConfigLoading = false;
      state.configError = (action.payload as string) ?? 'Failed to load staff config';
    });

    // ── Details ──────────────────────────────────────────────
    builder.addCase(getStaffDetails.pending, state => {
      state.isDetailsLoading = true;
      state.detailsError = null;
    });
    builder.addCase(getStaffDetails.fulfilled, (state, action) => {
      state.isDetailsLoading = false;
      state.staffDetails = action.payload?.data ?? null;
    });
    builder.addCase(getStaffDetails.rejected, (state, action) => {
      state.isDetailsLoading = false;
      state.detailsError = (action.payload as string) ?? 'Failed to load staff details';
    });

    // ── Create / Update share one isSubmitting flag ──────────
    builder.addCase(createStaff.pending, state => {
      state.isSubmitting = true;
      state.submitError = null;
    });
    builder.addCase(createStaff.fulfilled, state => {
      state.isSubmitting = false;
    });
    builder.addCase(createStaff.rejected, (state, action) => {
      state.isSubmitting = false;
      state.submitError = (action.payload as string) ?? 'Failed to create staff member';
    });

    builder.addCase(updateStaff.pending, state => {
      state.isSubmitting = true;
      state.submitError = null;
    });
    builder.addCase(updateStaff.fulfilled, state => {
      state.isSubmitting = false;
    });
    builder.addCase(updateStaff.rejected, (state, action) => {
      state.isSubmitting = false;
      state.submitError = (action.payload as string) ?? 'Failed to update staff member';
    });

    // ── Role defaults ────────────────────────────────────────
    builder.addCase(getRoleDefaults.pending, state => {
      state.isRoleDefaultsLoading = true;
      state.roleDefaultsError = null;
    });
    builder.addCase(getRoleDefaults.fulfilled, (state, action) => {
      state.isRoleDefaultsLoading = false;
      state.roleDefaults = action.payload ?? {};
    });
    builder.addCase(getRoleDefaults.rejected, (state, action) => {
      state.isRoleDefaultsLoading = false;
      state.roleDefaultsError = (action.payload as string) ?? 'Failed to load role default permissions';
    });

    // ── Create role: append to the in-memory config so it shows immediately ──
    builder.addCase(createStaffRole.fulfilled, (state, action) => {
      if (state.staffConfig && action.payload) {
        const exists = state.staffConfig.roles.some(r => r.id === action.payload.id);
        if (!exists) state.staffConfig.roles.push(action.payload);
      }
    });

    // ── Create access level: append so it shows immediately ──
    builder.addCase(createStaffAccessLevel.fulfilled, (state, action) => {
      if (state.staffConfig && action.payload) {
        const exists = state.staffConfig.accessLevels.some(l => l.id === action.payload.id);
        if (!exists) state.staffConfig.accessLevels.push(action.payload);
      }
    });
  },
});

export const { clearStaffDetails, clearStaffSubmitError, clearRoleDefaults } = staffSlice.actions;
export default staffSlice.reducer;
