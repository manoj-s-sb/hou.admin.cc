import { createSlice } from "@reduxjs/toolkit";
import { getMembers, getSingleMemberDetails } from "./api";
import { initialState } from "./types";

const membersSlice = createSlice({
  name: "members",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getMembers.pending, (state) => {
      state.isLoading = true;
      state.error = "";
    });
    builder.addCase(getMembers.fulfilled, (state, action) => {
      state.isLoading = false;
      state.membersList = action.payload?.data || [];
    });
    builder.addCase(getMembers.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || "Failed to fetch members list";
    });
    builder.addCase(getSingleMemberDetails.pending, (state) => {
      state.isLoading = true;
      state.error = "";
    });
    builder.addCase(getSingleMemberDetails.fulfilled, (state, action) => {
      state.isLoading = false;
      state.memberDetails = action.payload?.data || [];
    });
    builder.addCase(getSingleMemberDetails.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || "Failed to fetch single member details";
    });
  },
});

export default membersSlice.reducer;