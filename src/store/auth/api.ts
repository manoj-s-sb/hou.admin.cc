import { createAsyncThunk } from "@reduxjs/toolkit";
import endpoints from "../../const/endpoints";
import api from "../../services";

// Redux async thunk for state management
export const login = createAsyncThunk(
  "auth/login",
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await api.post(`${endpoints.login}`, {
        email,
        password,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Login failed",
      );
    }
  },
);
