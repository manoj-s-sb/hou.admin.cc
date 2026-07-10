import { createSlice } from '@reduxjs/toolkit';

import {
  archiveTemplate,
  completeTask,
  createTemplate,
  flagIssue,
  listSchedules,
  listTemplates,
  restoreTemplate,
  scheduleTask,
  unscheduleTask,
  updateTemplate,
} from './api';
import { initialMaintenanceState } from './types';

const maintenanceSlice = createSlice({
  name: 'maintenance',
  initialState: initialMaintenanceState,
  reducers: {},
  extraReducers: builder => {
    // Templates list
    builder.addCase(listTemplates.pending, state => {
      state.templatesLoading = true;
      state.error = null;
    });
    builder.addCase(listTemplates.fulfilled, (state, action) => {
      state.templatesLoading = false;
      state.templates = action.payload.items;
    });
    builder.addCase(listTemplates.rejected, (state, action) => {
      state.templatesLoading = false;
      state.error = (action.payload as string) || 'Failed to load the task library.';
      state.templates = [];
    });

    // Schedules list
    builder.addCase(listSchedules.pending, state => {
      state.schedulesLoading = true;
      state.error = null;
    });
    builder.addCase(listSchedules.fulfilled, (state, action) => {
      state.schedulesLoading = false;
      state.schedules = action.payload.items;
    });
    builder.addCase(listSchedules.rejected, (state, action) => {
      state.schedulesLoading = false;
      state.error = (action.payload as string) || 'Failed to load the schedule.';
      state.schedules = [];
    });

    // Mutations — the page re-fetches the relevant list on success, so these only
    // track the shared `saving` flag + surface errors.
    [createTemplate, updateTemplate, archiveTemplate, restoreTemplate, scheduleTask, completeTask, flagIssue, unscheduleTask].forEach(
      thunk => {
        builder.addCase(thunk.pending, state => {
          state.saving = true;
          state.error = null;
        });
        builder.addCase(thunk.fulfilled, state => {
          state.saving = false;
        });
        builder.addCase(thunk.rejected, (state, action) => {
          state.saving = false;
          state.error = (action.payload as string) || 'Something went wrong.';
        });
      }
    );
  },
});

export default maintenanceSlice.reducer;
