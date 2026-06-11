import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import type { RootState } from '../store';
import type {
  CreateStaffRequest,
  StaffConfig,
  StaffDocumentEntry,
  StaffListRequest,
  UpdateStaffRequest,
} from './types';

export const getStaffList = createAsyncThunk('staff/getList', async (params: StaffListRequest, { rejectWithValue }) => {
  try {
    const response = await api.post(endpoints.staff.list, params);
    return response.data;
  } catch (error: unknown) {
    return rejectWithValue(handleApiError(error, 'Failed to fetch staff list'));
  }
});

// Config rarely changes during a session — skip refetch when already loaded.
export const getStaffConfig = createAsyncThunk(
  'staff/getConfig',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<{ data: StaffConfig }>(endpoints.staff.config);
      return response.data;
    } catch (error: unknown) {
      return rejectWithValue(handleApiError(error, 'Failed to load staff config'));
    }
  },
  {
    condition: (_, { getState }) => {
      const state = (getState() as RootState).staff;
      return !state.staffConfig && !state.isConfigLoading;
    },
  }
);

export const getStaffDetails = createAsyncThunk(
  'staff/getDetails',
  async ({ staffId }: { staffId: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.staff.details, { staffId });
      return response.data;
    } catch (error: unknown) {
      return rejectWithValue(handleApiError(error, 'Failed to load staff details'));
    }
  }
);

export const createStaff = createAsyncThunk(
  'staff/create',
  async (payload: CreateStaffRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.staff.create, payload);
      return response.data;
    } catch (error: unknown) {
      return rejectWithValue(handleApiError(error, 'Failed to create staff member'));
    }
  }
);

export const updateStaff = createAsyncThunk(
  'staff/update',
  async (payload: UpdateStaffRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.staff.update, payload);
      return response.data;
    } catch (error: unknown) {
      return rejectWithValue(handleApiError(error, 'Failed to update staff member'));
    }
  }
);

// Suspend ('suspended') / reactivate ('active') a staff member.
// 'suspended' is the backend's deactivated status value (the UI labels it "Inactive").
// The update endpoint expects the full record, so we load details first and
// preserve every field — only `status` changes. Shared by the list + detail view.
export const setStaffStatus = createAsyncThunk(
  'staff/setStatus',
  async ({ staffId, status }: { staffId: string; status: 'active' | 'suspended' }, { rejectWithValue }) => {
    try {
      const detailsRes = await api.post(endpoints.staff.details, { staffId });
      const s = detailsRes.data?.data;
      if (!s) return rejectWithValue('Staff member not found');

      const sp = s.staffProfile ?? {};
      const documents = (sp.documents ?? [])
        .filter((d: StaffDocumentEntry) => d.type && d.fileName && d.blobName)
        .map((d: StaffDocumentEntry) => ({ type: d.type, fileName: d.fileName, blobName: d.blobName }));

      const payload: UpdateStaffRequest = {
        staffId,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        loginEmail: s.loginEmail ?? s.email,
        phone: s.phone ?? '',
        dateOfBirth: s.dateOfBirth ?? null,
        gender: s.gender ?? null,
        userType: s.userType,
        facilityCode: s.facilityCode,
        status,
        staffProfile: {
          employmentType: sp.employmentType ?? '',
          startDate: sp.startDate ?? null,
          highestQualification: sp.highestQualification ?? null,
          certifications: sp.certifications ?? [],
          additionalNotes: sp.additionalNotes ?? '',
          roles: sp.roles ?? s.userType,
          accessLevel: sp.accessLevel ?? null,
          assignedCentres: sp.assignedCentres ?? [],
          documents,
          twoFactorAuth: sp.twoFactorAuth ?? true,
          twoFactorMethod: sp.twoFactorMethod ?? 'email',
        },
      };

      const response = await api.post(endpoints.staff.update, payload);
      return response.data;
    } catch (error: unknown) {
      return rejectWithValue(handleApiError(error, 'Failed to update staff status'));
    }
  }
);
