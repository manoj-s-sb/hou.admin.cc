import { createSlice } from '@reduxjs/toolkit';

import { fetchCalendarEvents } from './api';
import { initialState } from './types';

const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchCalendarEvents.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchCalendarEvents.fulfilled, (state, action) => {
      state.isLoading = false;
      state.events = action.payload;
      state.error = null;
    });
    builder.addCase(fetchCalendarEvents.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) ?? null;
      state.events = [];
    });
  },
});

export default calendarSlice.reducer;
