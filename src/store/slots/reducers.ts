import { createSlice } from "@reduxjs/toolkit";
import { getSlots } from "./api";
import { initialState } from "./types";

const slotsSlice = createSlice({
  name: 'slots',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getSlots.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(getSlots.fulfilled, (state, action) => {
      state.isLoading = false;
      state.slots = action.payload;
      state.error = null;
    });
    builder.addCase(getSlots.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
      state.slots = null;
    });
  },
});

export default slotsSlice.reducer;