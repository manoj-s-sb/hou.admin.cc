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

/**
 * Upload a file to the dedicated tickets blob account and return its blobName
 * (for create/addAttachment). Mints the write SAS via the tickets `uploadUrl`
 * action so the blob lands in the same account the read SAS reads from.
 */
export const uploadTicketFile = async (facilityCode: string, file: File): Promise<string> => {
  const res = await api.post<{ data: { uploadUrl: string; blobName: string } }>(endpoints.tickets, {
    action: 'uploadUrl',
    fileName: file.name,
    facilityCode,
  });
  const { uploadUrl, blobName } = res.data?.data ?? res.data;
  await uploadFileToBlob(uploadUrl, file);
  return blobName;
};

export const getTickets = createAsyncThunk<ListTicketsResponse, ListTicketsRequest, { rejectValue: string }>(
  'tickets/list',
  async (params, { rejectWithValue }) => {
    try {
      const res = await api.post<{ data: ListTicketsResponse }>(endpoints.tickets, { action: 'list', ...params });
      const data = res.data?.data ?? (res.data as unknown as ListTicketsResponse);
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
      const res = await api.post<{ data: TicketCounts }>(endpoints.tickets, { action: 'counts', ...params });
      return res.data?.data ?? (res.data as unknown as TicketCounts);
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch ticket counts'));
    }
  }
);

export const getTicket = createAsyncThunk<Ticket, string, { rejectValue: string }>(
  'tickets/get',
  async (ticketId, { rejectWithValue }) => {
    try {
      const res = await api.post<{ data: Ticket }>(endpoints.tickets, { action: 'get', ticketId });
      return res.data?.data ?? (res.data as unknown as Ticket);
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to load the ticket'));
    }
  }
);

export const createTicket = createAsyncThunk<Ticket, CreateTicketRequest, { rejectValue: string }>(
  'tickets/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post<{ data: Ticket }>(endpoints.tickets, { action: 'create', ...payload });
      return res.data?.data ?? (res.data as unknown as Ticket);
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Could not create the ticket. Please try again.'));
    }
  }
);

export const updateTicketStatus = createAsyncThunk<Ticket, UpdateTicketStatusRequest, { rejectValue: string }>(
  'tickets/updateStatus',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post<{ data: Ticket }>(endpoints.tickets, { action: 'updateStatus', ...payload });
      return res.data?.data ?? (res.data as unknown as Ticket);
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Could not update the ticket status.'));
    }
  }
);

export const acknowledgeTicket = createAsyncThunk<Ticket, AcknowledgeTicketRequest, { rejectValue: string }>(
  'tickets/acknowledge',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post<{ data: Ticket }>(endpoints.tickets, { action: 'acknowledge', ...payload });
      return res.data?.data ?? (res.data as unknown as Ticket);
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Could not acknowledge the ticket.'));
    }
  }
);

export const addTicketComment = createAsyncThunk<Ticket, AddCommentRequest, { rejectValue: string }>(
  'tickets/comment',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post<{ data: Ticket }>(endpoints.tickets, { action: 'comment', ...payload });
      return res.data?.data ?? (res.data as unknown as Ticket);
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
    const res = await api.post<{ data: Ticket }>(endpoints.tickets, { action: 'addAttachment', ...payload });
    return res.data?.data ?? (res.data as unknown as Ticket);
  } catch (error) {
    return rejectWithValue(handleApiError(error, 'Could not attach the file.'));
  }
});

export const reassignTicket = createAsyncThunk<Ticket, ReassignTicketRequest, { rejectValue: string }>(
  'tickets/reassign',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post<{ data: Ticket }>(endpoints.tickets, { action: 'reassign', ...payload });
      return res.data?.data ?? (res.data as unknown as Ticket);
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Could not reassign the ticket.'));
    }
  }
);
