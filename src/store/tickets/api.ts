/**
 * Tickets / Incidents — async thunks over the single action-dispatched endpoint
 * (POST /admin/tickets with `{ action, ...payload }`). Each thunk unwraps the
 * standard `{ data }` envelope. Attachment files are uploaded directly to the
 * dedicated tickets blob account via a write SAS minted by the `uploadUrl` action
 * (the SAME account the read SAS is generated from), then their blobName is linked
 * to the ticket — uploading via the shared work util would land the blob in a
 * different account and the ticket's read URL would 404 (BlobNotFound).
 */
import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import { getLocalUser } from '../../constants/user';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';
import { uploadFileToBlob } from '../maintenance/api';

import type {
  AcknowledgeTicketRequest,
  AddCommentRequest,
  CreateTicketRequest,
  ListTicketsRequest,
  ListTicketsResponse,
  ReassignTicketRequest,
  Ticket,
  TicketCounts,
  TicketCountsRequest,
  UpdateTicketStatusRequest,
} from './types';

// Drop undefined keys so the action body only carries what the caller set
// (the backend ignores unknown fields, but this keeps payloads tidy).
const clean = <T extends Record<string, unknown>>(obj: T): Record<string, unknown> =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

// The audit trail's actor name. The backend records `request.updatedByName or
// <token identity>`; the token only carries an email, so we send the logged-in
// user's display name to make activities read "… by Uday Reddy" rather than the
// raw email. Empty → undefined so `clean()` drops it and the token wins.
const actorName = (): string | undefined => getLocalUser().name || undefined;

const post = async <T>(action: string, payload: Record<string, unknown>): Promise<T> => {
  const res = await api.post<{ data: T }>(endpoints.tickets, { action, ...clean(payload) });
  return res.data?.data ?? (res.data as unknown as T);
};

/**
 * Upload a file to the dedicated tickets blob account and return its blobName
 * (for create/addAttachment). Mints the write SAS via the tickets `uploadUrl`
 * action so the blob lands in the same account the read SAS reads from.
 */
export const uploadTicketFile = async (facilityCode: string, file: File): Promise<string> => {
  const { uploadUrl, blobName } = await post<{ uploadUrl: string; blobName: string }>('uploadUrl', {
    fileName: file.name,
    facilityCode,
  });
  await uploadFileToBlob(uploadUrl, file);
  return blobName;
};

export const getTickets = createAsyncThunk<ListTicketsResponse, ListTicketsRequest, { rejectValue: string }>(
  'tickets/list',
  async (params, { rejectWithValue }) => {
    try {
      const data = await post<ListTicketsResponse>('list', { ...params });
      return {
        items: Array.isArray(data?.items) ? data.items : [],
        total: data?.total ?? 0,
        page: data?.page ?? params.page ?? 1,
        limit: data?.limit ?? params.limit ?? 20,
        facilityCode: data?.facilityCode ?? params.facilityCode ?? null,
      };
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch tickets'));
    }
  }
);

export const getTicketCounts = createAsyncThunk<TicketCounts, TicketCountsRequest, { rejectValue: string }>(
  'tickets/counts',
  async (params, { rejectWithValue }) => {
    try {
      return await post<TicketCounts>('counts', { ...params });
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch ticket counts'));
    }
  }
);

export const getTicket = createAsyncThunk<Ticket, string, { rejectValue: string }>(
  'tickets/get',
  async (ticketId, { rejectWithValue }) => {
    try {
      return await post<Ticket>('get', { ticketId });
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to load the ticket'));
    }
  }
);

export const createTicket = createAsyncThunk<Ticket, CreateTicketRequest, { rejectValue: string }>(
  'tickets/create',
  async (payload, { rejectWithValue }) => {
    try {
      const name = actorName();
      return await post<Ticket>('create', { raisedByName: name, createdByName: name, ...payload });
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Could not create the ticket. Please try again.'));
    }
  }
);

export const updateTicketStatus = createAsyncThunk<Ticket, UpdateTicketStatusRequest, { rejectValue: string }>(
  'tickets/updateStatus',
  async (payload, { rejectWithValue }) => {
    try {
      return await post<Ticket>('updateStatus', { updatedByName: actorName(), ...payload });
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Could not update the ticket status.'));
    }
  }
);

export const acknowledgeTicket = createAsyncThunk<Ticket, AcknowledgeTicketRequest, { rejectValue: string }>(
  'tickets/acknowledge',
  async (payload, { rejectWithValue }) => {
    try {
      return await post<Ticket>('acknowledge', { updatedByName: actorName(), ...payload });
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Could not acknowledge the ticket.'));
    }
  }
);

export const addTicketComment = createAsyncThunk<Ticket, AddCommentRequest, { rejectValue: string }>(
  'tickets/comment',
  async (payload, { rejectWithValue }) => {
    try {
      return await post<Ticket>('comment', { updatedByName: actorName(), ...payload });
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Could not add the comment.'));
    }
  }
);

export const addTicketAttachment = createAsyncThunk<
  Ticket,
  { ticketId: string; blobName: string },
  { rejectValue: string }
>('tickets/addAttachment', async (payload, { rejectWithValue }) => {
  try {
    return await post<Ticket>('addAttachment', { updatedByName: actorName(), ...payload });
  } catch (error) {
    return rejectWithValue(handleApiError(error, 'Could not attach the file.'));
  }
});

export const reassignTicket = createAsyncThunk<Ticket, ReassignTicketRequest, { rejectValue: string }>(
  'tickets/reassign',
  async (payload, { rejectWithValue }) => {
    try {
      return await post<Ticket>('reassign', { updatedByName: actorName(), ...payload });
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Could not reassign the ticket.'));
    }
  }
);
