import { createAsyncThunk } from "@reduxjs/toolkit";
import endpoints from "../../constants/endpoints";
import api from "../../services";
import { handleApiError } from "../../utils/errorUtils";

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
        handleApiError(error, "Login failed"),
      );
    }
  },
);
