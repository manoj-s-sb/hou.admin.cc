import { createAsyncThunk } from "@reduxjs/toolkit";
import endpoints from "../../constants/endpoints";
import api from "../../services";
import {
  InductionListRequest,
  InductionStepsDetailsRequest,
  UpdateInductionStepsRequest,
} from "./types";
import { handleApiError } from "../../utils/errorUtils";

export const inductionList = createAsyncThunk(
  "induction/inductionList",
  async (
    { date, page, type, listLimit }: InductionListRequest,
    { rejectWithValue },
  ) => {
    try {
      const response = await api.post(`${endpoints.induction.list}`, {
        date,
        type,
        page,
        limit: listLimit,
      });
      return response?.data;
    } catch (error: any) {
      return rejectWithValue(
        handleApiError(error, "Failed to fetch induction list"),
      );
    }
  },
);

export const getInductionStepsDetails = createAsyncThunk(
  "induction/getInductionStepsDetails",
  async ({ userId }: InductionStepsDetailsRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(`${endpoints.induction.search}`, {
        userId,
      });
      return response?.data;
    } catch (error: any) {
      return rejectWithValue(
        handleApiError(error, "Failed to fetch induction steps details"),
      );
    }
  },
);

export const updateInductionSteps = createAsyncThunk(
  "induction/updateInductionSteps",
  async (
    { userId, subSteps }: UpdateInductionStepsRequest,
    { rejectWithValue },
  ) => {
    try {
      const response = await api.post(`${endpoints.induction.update}`, {
        userId,
        subSteps,
      });
      return response?.data;
    } catch (error: any) {
      return rejectWithValue(
        handleApiError(error, "Failed to update induction steps"),
      );
    }
  },
);
