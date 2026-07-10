/**
 * Tickets / Incidents — TypeScript models mirroring the backend contract
 * (POST /admin/tickets, action-dispatched). The list/get/mutation actions all
 * return the full ticket document (allow-listed fields); list adds pagination
 * metadata; counts returns a status breakdown.
 */

export type TicketStatus = 'open' | 'noc' | 'inprogress' | 'verify' | 'closed';
export type TicketCategory = 'customer_support' | 'maintenance' | 'general' | 'suggestion';
export type TicketPriority = 'high' | 'medium' | 'low';
export type TicketRole = 'noc' | 'centre_staff' | 'admin' | 'others';
export type TicketActionType =
  | 'raised'
  | 'assigned'
  | 'comment'
  | 'acknowledged'
  | 'inprogress'
  | 'reassigned'
  | 'verify'
  | 'closed'
  | 'reopened';

/** On read, `blobName` is replaced with a temporary SAS URL by the backend. */
export interface TicketAttachment {
  blobName: string;
  addedAt: string;
  addedBy: string;
  addedByName: string;
}

export interface TicketActivity {
  action: TicketActionType;
  label: string;
  byId: string | null;
  byName: string | null;
  toId?: string | null;
  toName?: string | null;
  at: string;
  /** Present on `comment` activities; a SAS URL on read when set. */
  attachmentUrl?: string | null;
}

export interface Ticket {
  id: string;
  facilityCode: string;
  /** Human-readable centre name, resolved server-side from facilityCode. */
  facilityName: string | null;
  type: 'ticket';
  ticketNo: string;
  title: string;
  description: string;
  category: TicketCategory;
  task: string | null;
  laneNo: number[] | null;
  equipment: string[] | null;
  priority: TicketPriority;
  status: TicketStatus;
  raisedBy: TicketRole | string | null;
  raisedById: string | null;
  raisedByName: string | null;
  assignedTo: TicketRole | string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  acknowledgedBy: string | null;
  acknowledgedByName: string | null;
  acknowledgedAt: string | null;
  linkedMemberId: string | null;
  linkedMemberName: string | null;
  linkedIssueId: string | null;
  slaDeadline: string | null;
  closedAt: string | null;
  closedBy: string | null;
  closedByName: string | null;
  attachments: TicketAttachment[];
  activities: TicketActivity[];
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
}

export interface TicketCounts {
  total: number;
  open: number;
  noc: number;
  inprogress: number;
  verify: number;
  closed: number;
  mine: number;
  overdue: number;
}

/* ── Request payloads ── */

export interface CreateTicketRequest {
  facilityCode: string;
  title: string;
  description: string;
  category: TicketCategory;
  task?: string | null;
  laneNo?: number[] | null;
  equipment?: string[] | null;
  priority: TicketPriority;
  assignedTo: TicketRole;
  assignedToId?: string | null;
  assignedToName?: string;
  raisedBy?: TicketRole | null;
  raisedById?: string | null;
  raisedByName?: string | null;
  linkedMemberId?: string | null;
  linkedMemberName?: string | null;
  linkedIssueId?: string | null;
  /** Pre-uploaded blob names (uploaded via the work upload util first). */
  attachments?: string[];
}

export interface ListTicketsRequest {
  facilityCode?: string;
  status?: TicketStatus;
  view?: 'active' | 'closed';
  assignedTo?: TicketRole;
  assignedToId?: string;
  mine?: boolean;
  category?: TicketCategory;
  priority?: TicketPriority;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ListTicketsResponse {
  items: Ticket[];
  total: number;
  page: number;
  limit: number;
  facilityCode: string | null;
}

export interface UpdateTicketStatusRequest {
  ticketId: string;
  newStatus: TicketStatus;
  comment?: string;
  assignedTo?: TicketRole;
  assignedToId?: string | null;
  assignedToName?: string;
}

export interface AcknowledgeTicketRequest {
  ticketId: string;
  repName?: string;
  repId?: string;
}

export interface AddCommentRequest {
  ticketId: string;
  text: string;
  attachmentUrl?: string | null;
}

export interface ReassignTicketRequest {
  ticketId: string;
  assignedTo: TicketRole;
  assignedToId?: string | null;
  assignedToName?: string;
  comment?: string;
}

export interface TicketCountsRequest {
  facilityCode?: string;
}

export interface TicketsState {
  items: Ticket[];
  total: number;
  page: number;
  limit: number;
  listLoading: boolean;
  listError: string | null;
  counts: TicketCounts | null;
  current: Ticket | null;
  detailLoading: boolean;
  detailError: string | null;
  saving: boolean;
}

export const initialTicketsState: TicketsState = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
  listLoading: false,
  listError: null,
  counts: null,
  current: null,
  detailLoading: false,
  detailError: null,
  saving: false,
};
