/**
 * Tickets / Incidents — UI constants. Enum lists mirror the backend
 * (tickets/domain/constants.py) verbatim; display meta (labels, colours,
 * stripes) is frontend-only. Keep the enum arrays in sync with the backend.
 */
import type { TicketStatus, TicketCategory, TicketPriority, TicketRole } from '../../store/tickets/types';

export const TICKET_STATUSES: TicketStatus[] = ['open', 'noc', 'inprogress', 'verify', 'closed'];
// Simplified status set surfaced in the filter dropdown and the in-ticket status
// selector: Open → In Progress → Closed. Legacy 'noc'/'verify' tickets still
// render via STATUS_META but are no longer offered as manual choices.
export const SELECTABLE_STATUSES: TicketStatus[] = ['open', 'inprogress', 'closed'];
export const TICKET_CATEGORIES: TicketCategory[] = ['customer_support', 'maintenance', 'general', 'suggestion'];
export const TICKET_PRIORITIES: TicketPriority[] = ['high', 'medium', 'low'];
export const TICKET_ROLES: TicketRole[] = ['noc', 'centre_staff', 'admin', 'others'];

export const MAINTENANCE_CATEGORY: TicketCategory = 'maintenance';
export const LANE_MIN = 1;
export const LANE_MAX = 7;
export const ALL_LANES: number[] = [1, 2, 3, 4, 5, 6, 7];

export const EQUIPMENT_LIST: string[] = [
  'Bowling Machine',
  'UPS',
  'LED',
  'Tablet',
  'Mini PC',
  'Camera',
  'Power Wire',
  'Video Wire',
  'Net',
  'Polycarbonate Sheet',
];

// Allowed next states per current status — must match backend STATUS_TRANSITIONS.
// noc → inprogress happens ONLY through acknowledge, so it is not listed here.
export const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['noc', 'closed'],
  noc: ['verify', 'closed'],
  inprogress: ['verify', 'closed'],
  verify: ['noc', 'closed'],
  closed: [],
};

export const STATUS_META: Record<TicketStatus, { label: string; pill: string; stripe: string }> = {
  open: { label: 'Open', pill: 'bg-gray-100 text-gray-600', stripe: '#9ca3af' },
  noc: { label: 'With NOC', pill: 'bg-blue-100 text-blue-700', stripe: '#2563eb' },
  inprogress: { label: 'In Progress', pill: 'bg-amber-100 text-amber-700', stripe: '#d97706' },
  verify: { label: 'Needs Verification', pill: 'bg-violet-100 text-violet-700', stripe: '#7c3aed' },
  closed: { label: 'Closed', pill: 'bg-emerald-100 text-emerald-700', stripe: '#16a34a' },
};

export const PRIORITY_META: Record<TicketPriority, { label: string; dot: string; text: string; accent: string }> = {
  high: { label: 'High', dot: 'bg-red-500', text: 'text-red-600', accent: '#ef4444' },
  medium: { label: 'Medium', dot: 'bg-amber-500', text: 'text-amber-600', accent: '#f59e0b' },
  low: { label: 'Low', dot: 'bg-emerald-500', text: 'text-emerald-600', accent: '#10b981' },
};

// Target response/resolution window per priority. Displayed in the ticket detail
// so operations can see the expected turnaround at a glance.
export const PRIORITY_SLA: Record<TicketPriority, { label: string; hours: number }> = {
  high: { label: '4 hours', hours: 4 },
  medium: { label: '24 hours', hours: 24 },
  low: { label: '72 hours', hours: 72 },
};

export const CATEGORY_META: Record<TicketCategory, { label: string; className: string }> = {
  customer_support: { label: 'Customer Support', className: 'bg-[#ecedf4] text-[#21295a]' },
  maintenance: { label: 'Maintenance', className: 'bg-amber-50 text-amber-700' },
  general: { label: 'General', className: 'bg-gray-100 text-gray-600' },
  suggestion: { label: 'Suggestion', className: 'bg-teal-50 text-teal-700' },
};

export const ROLE_LABELS: Record<TicketRole, string> = {
  noc: 'NOC Team',
  centre_staff: 'Centre Staff',
  admin: 'Admin',
  others: 'Others',
};

// Linear flow used for the detail-view stepper (inprogress sits between noc and verify).
export const STATUS_FLOW: TicketStatus[] = ['open', 'noc', 'inprogress', 'verify', 'closed'];

// Activity action → human label fragment for the timeline.
export const ACTION_LABELS: Record<string, string> = {
  raised: 'Raised',
  assigned: 'Assigned',
  comment: 'Comment',
  acknowledged: 'Acknowledged',
  inprogress: 'In Progress',
  reassigned: 'Reassigned',
  verify: 'Sent for Verification',
  closed: 'Closed',
  reopened: 'Reopened',
};

export const PAGE_LIMIT = 20;
