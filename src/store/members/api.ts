import { createAsyncThunk } from "@reduxjs/toolkit";
import endpoints from "../../constants/endpoints";
import api from "../../services";
import { MemberRequest } from "./types";
import { handleApiError } from "../../utils/errorUtils";

export const getMembers = createAsyncThunk(
  "members/getMembers",
  async ({ skip, limit, facilityCode }: MemberRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.members.list, {
        skip,
        limit,
        facilityCode,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        handleApiError(error, "Failed to fetch members list")
      );
    }
  }
);

export const getSingleMemberDetails = createAsyncThunk(
  "members/getSingleMemberDetails",
  async ({ userId }: { userId: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(`${endpoints.members.membersDetails}`, {
        userId,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        handleApiError(error, "Failed to fetch single member details")
      );
    }
  }
);
