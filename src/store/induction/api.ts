import { createAsyncThunk } from "@reduxjs/toolkit";
import endpoints from "../../const/endpoints";
import api from "../../services";
import { InductionListRequest, InductionStepsDetailsRequest } from "./types";

export const inductionList = createAsyncThunk(
  "induction/inductionList",
  async (
    { date, page, type, listLimit }: InductionListRequest,
    { rejectWithValue },
  ) => {
    try {
      const response = await api.post(`${endpoints.induction.list}`, {
        date: date,
        type: type,
        page: page,
        limit: listLimit,
      });
      return response?.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Login failed",
      );
    }
  },
);

export const getInductionStepsDetails = createAsyncThunk(
  "induction/getInductionStepsDetails",
  async ({ userId }: InductionStepsDetailsRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(`${endpoints.induction.search}`, {
        userId: userId,
      });
      console.log(response?.data);
      return response?.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch induction steps details",
      );
    }
  },
);

export const updateInductionSteps = createAsyncThunk(
  "induction/updateInductionSteps",
  async (
    {
      userId,
      subSteps,
    }: { userId: string; subSteps: { id: string; status: string }[] },
    { rejectWithValue },
  ) => {
    try {
      const response = await api.post(`${endpoints.induction.update}`, {
        userId: userId,
        subSteps: subSteps,
      });
      return response?.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to update induction steps",
      );
    }
  },
);
