/**
 * Maintenance & Tasks — async thunks over the single action-dispatched endpoint
 * (POST /admin/maintenance with `{ action, payload }`). Each thunk unwraps the
 * standard `{ data }` envelope. Attachments are uploaded directly to blob storage
 * via a write SAS minted by the `upload_url` action, then the returned blobName is
 * sent in complete/flag payloads.
 */
import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import type {
  CompleteTaskPayload,
  CreateTemplatePayload,
  FlagIssuePayload,
  FlagIssueResponse,
  ListSchedulesPayload,
  ListSchedulesResponse,
  ListTemplatesPayload,
  ListTemplatesResponse,
  ScheduleTaskPayload,
  TaskSchedule,
  TaskTemplate,
  UnscheduleTaskPayload,
  UpdateTemplatePayload,
} from './types';

/**
 * Upload raw file bytes to a blob write-SAS URL. Kept as a standalone export —
 * the Tickets module imports this helper too. Do NOT remove.
 */
export const uploadFileToBlob = async (uploadUrl: string, file: File): Promise<void> => {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'x-ms-blob-type': 'BlockBlob' },
    body: file,
  });
  // fetch() only rejects on a network-level failure (DNS, CORS block, connection
  // reset) — an HTTP error status (e.g. an expired/invalid SAS, a transient 5xx)
  // resolves normally and would otherwise be silently treated as a successful
  // upload, leaving the caller pointing an attachment record at a blob that was
  // never actually written.
  if (!res.ok) {
    throw new Error(`Blob upload failed (${res.status})`);
  }
};

// Drop undefined keys so the action body only carries what the caller set.
const clean = <T extends Record<string, unknown>>(obj: T): Record<string, unknown> =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

const post = async <T>(action: string, payload: Record<string, unknown> = {}): Promise<T> => {
  const res = await api.post<{ data: T }>(endpoints.maintenance, { action, payload: clean(payload) });
  return res.data?.data ?? (res.data as unknown as T);
};

/** Upload a file for a facility and return its raw blobName (for complete/flag payloads). */
export const uploadMaintenanceFile = async (facilityCode: string, file: File): Promise<string> => {
  const { uploadUrl, blobName } = await post<{ uploadUrl: string; blobName: string }>('upload_url', {
    facilityCode,
    fileName: file.name,
    contentType: file.type || undefined,
  });
  await uploadFileToBlob(uploadUrl, file);
  return blobName;
};

/* ── Templates ── */

export const listTemplates = createAsyncThunk<ListTemplatesResponse, ListTemplatesPayload, { rejectValue: string }>(
  'maintenance/listTemplates',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await post<ListTemplatesResponse>('list_templates', { ...payload });
      return { items: Array.isArray(data?.items) ? data.items : [], total: data?.total ?? 0 };
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to load the task library'));
    }
  }
);

export const getTemplate = createAsyncThunk<TaskTemplate, string, { rejectValue: string }>(
  'maintenance/getTemplate',
  async (id, { rejectWithValue }) => {
    try {
      return await post<TaskTemplate>('get_template', { id });
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to load the template'));
    }
  }
);

export const createTemplate = createAsyncThunk<TaskTemplate, CreateTemplatePayload, { rejectValue: string }>(
  'maintenance/createTemplate',
  async (payload, { rejectWithValue }) => {
    try {
      return await post<TaskTemplate>('create_template', { ...payload });
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Could not create the task'));
    }
  }
);

export const updateTemplate = createAsyncThunk<TaskTemplate, UpdateTemplatePayload, { rejectValue: string }>(
  'maintenance/updateTemplate',
  async (payload, { rejectWithValue }) => {
    try {
      return await post<TaskTemplate>('update_template', { ...payload });
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Could not update the task'));
    }
  }
);

export const archiveTemplate = createAsyncThunk<TaskTemplate, string, { rejectValue: string }>(
  'maintenance/archiveTemplate',
  async (id, { rejectWithValue }) => {
    try {
      return await post<TaskTemplate>('archive_template', { id });
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Could not archive the task'));
    }
  }
);

export const restoreTemplate = createAsyncThunk<TaskTemplate, string, { rejectValue: string }>(
  'maintenance/restoreTemplate',
  async (id, { rejectWithValue }) => {
    try {
      return await post<TaskTemplate>('restore_template', { id });
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Could not restore the task'));
    }
  }
);

/* ── Schedules ── */

export const listSchedules = createAsyncThunk<ListSchedulesResponse, ListSchedulesPayload, { rejectValue: string }>(
  'maintenance/listSchedules',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await post<ListSchedulesResponse>('list_schedules', { ...payload });
      return {
        items: Array.isArray(data?.items) ? data.items : [],
        total: data?.total ?? 0,
        facilityCode: data?.facilityCode ?? payload.facilityCode,
      };
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to load the schedule'));
    }
  }
);

export const scheduleTask = createAsyncThunk<TaskSchedule, ScheduleTaskPayload, { rejectValue: string }>(
  'maintenance/scheduleTask',
  async (payload, { rejectWithValue }) => {
    try {
      return await post<TaskSchedule>('schedule_task', { ...payload });
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Could not schedule the task'));
    }
  }
);

export const completeTask = createAsyncThunk<TaskSchedule, CompleteTaskPayload, { rejectValue: string }>(
  'maintenance/completeTask',
  async (payload, { rejectWithValue }) => {
    try {
      return await post<TaskSchedule>('complete_task', { ...payload });
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Could not complete the task'));
    }
  }
);

export const flagIssue = createAsyncThunk<FlagIssueResponse, FlagIssuePayload, { rejectValue: string }>(
  'maintenance/flagIssue',
  async (payload, { rejectWithValue }) => {
    try {
      return await post<FlagIssueResponse>('flag_issue', { ...payload });
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Could not flag the issue'));
    }
  }
);

export const unscheduleTask = createAsyncThunk<
  { id: string; deleted: boolean },
  UnscheduleTaskPayload,
  { rejectValue: string }
>('maintenance/unscheduleTask', async (payload, { rejectWithValue }) => {
  try {
    return await post<{ id: string; deleted: boolean }>('unschedule_task', { ...payload });
  } catch (error) {
    return rejectWithValue(handleApiError(error, 'Could not remove the schedule'));
  }
});
