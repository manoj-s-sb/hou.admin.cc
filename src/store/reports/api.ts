import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import { ReportsRequest } from './types';

// Single GET endpoint; the `tab` param selects the response shape.
export const getReport = createAsyncThunk('reports/getReport', async (params: ReportsRequest, { rejectWithValue }) => {
  try {
    const response = await api.get(endpoints.reports, {
      params: {
        tab: params.tab,
        view: params.view,
        centreId: params.centreId || undefined,
        country: params.country || undefined,
        period: params.period,
        startDate: params.startDate || undefined,
        endDate: params.endDate || undefined,
      },
    });
    return response.data;
  } catch (error) {
    return rejectWithValue(handleApiError(error, 'Failed to load report'));
  }
});
