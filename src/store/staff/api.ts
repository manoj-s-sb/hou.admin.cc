import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import type { RootState } from '../store';
import type {
  AccessLevelConfig,
  CreateStaffRequest,
  ResendWelcomeEmailRequest,
  ResendWelcomeEmailResponse,
  RoleConfig,
  RoleDefaults,
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

/**
 * Create a new staff role and persist it to the DB.
 * BACKEND TODO: implement POST `/admin/staff/roles/create` accepting
 * `{ label, description }` and returning the created `RoleConfig`
 * (with a server-generated `id`, `order`, `isActive: true` and icon colours).
 * The new role must then be included in `GET /admin/staff/config`.
 */
export const createStaffRole = createAsyncThunk<
  RoleConfig,
  { label: string; description: string },
  { rejectValue: string }
>('staff/createRole', async (payload, { rejectWithValue }) => {
  try {
    const response = await api.post<{ data: RoleConfig }>(endpoints.staff.roleCreate, payload);
    return response.data?.data ?? (response.data as unknown as RoleConfig);
  } catch (error: unknown) {
    return rejectWithValue(handleApiError(error, 'Could not create the role. Please try again.'));
  }
});

/**
 * Create a new access level and persist it to the DB.
 * BACKEND TODO: implement POST `/admin/staff/access-levels/create` accepting
 * `{ label, description, scopeType }` and returning the created `AccessLevelConfig`
 * (with a server-generated `id`, `scope` label, `color`, `order` and `isActive: true`).
 * `scopeType` is `'facility'` (centre-scoped) or `'global'` (all centres).
 * The new level must then be included in `GET /admin/staff/config`.
 */
export const createStaffAccessLevel = createAsyncThunk<
  AccessLevelConfig,
  { label: string; description: string; scopeType: 'facility' | 'global' },
  { rejectValue: string }
>('staff/createAccessLevel', async (payload, { rejectWithValue }) => {
  try {
    const response = await api.post<{ data: AccessLevelConfig }>(endpoints.staff.accessLevelCreate, payload);
    return response.data?.data ?? (response.data as unknown as AccessLevelConfig);
  } catch (error: unknown) {
    return rejectWithValue(handleApiError(error, 'Could not create the access level. Please try again.'));
  }
});

/**
 * Role-derived default module permissions, unioned across every given role by the
 * backend. Refetched whenever the admin changes the selected role(s) in Role & Access
 * (step 2), and once up front in edit mode after the member's saved roles load.
 */
export const getRoleDefaults = createAsyncThunk<RoleDefaults, string[], { rejectValue: string }>(
  'staff/getRoleDefaults',
  async (roleIds, { rejectWithValue }) => {
    try {
      const response = await api.get<{ data: RoleDefaults }>(endpoints.staff.roleDefaults, {
        params: { roles: roleIds.join(',') },
      });
      return response.data?.data ?? {};
    } catch (error: unknown) {
      return rejectWithValue(handleApiError(error, 'Failed to load role default permissions'));
    }
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

/**
 * Resend a staff member's welcome email — the backend mints a NEW temporary
 * password and emails it, so this is a destructive action (confirmed in the UI
 * before dispatch).
 */
export const resendWelcomeEmail = createAsyncThunk<
  ResendWelcomeEmailResponse,
  ResendWelcomeEmailRequest,
  { rejectValue: string }
>('staff/resendWelcomeEmail', async ({ staffId }, { rejectWithValue }) => {
  try {
    const response = await api.post<{ data: ResendWelcomeEmailResponse }>(endpoints.staff.resendWelcomeEmail, {
      staffId,
    });
    return response.data?.data ?? (response.data as unknown as ResendWelcomeEmailResponse);
  } catch (error: unknown) {
    return rejectWithValue(handleApiError(error, 'Failed to resend the welcome email'));
  }
});

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
