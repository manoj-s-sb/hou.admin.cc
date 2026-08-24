export interface AdminNote {
  id: string;
  text: string;
  createdByName: string;
  createdById: string | null;
  createdAt: string;
}

export interface WaitlistEntry {
  id?: string;
  facilityCode?: string;
  name?: string;
  email?: string;
  subscriptionSrc?: string;
  registerdVia?: string;
  plan?: string;
  createdAt?: string;
  position?: number;
  notes?: AdminNote[];
  details?: { subscription_code?: string; [key: string]: unknown };
}

export interface WaitlistImportRow {
  name: string;
  email: string;
  phone?: string;
  countryCode?: string;
  registerdVia?: string;
  timestamp?: string;
}

export interface WaitlistImportResult {
  createdCount: number;
  skippedCount: number;
  skipped?: { email: string; reason: string }[];
}

export interface LeadEntry {
  id?: string;
  facilityCode?: string;
  action?: string;
  timestamp?: string;
  createdAt?: string;
  notes?: AdminNote[];
  name?: string;
  phone?: string;
  details?: { email?: string; subscription_code?: string; billing_cycle?: string; [key: string]: unknown };
}

export interface GetWaitlistRequest {
  facilityCode?: string;
  subscriptionSrc?: string;
  registerdVia?: string;
  page?: number;
  limit?: number;
  all?: boolean;
}

export interface AddWaitlistNoteRequest {
  facilityCode: string;
  waitlistId: string;
  text: string;
  createdByName: string;
}

export interface BulkImportWaitlistRequest {
  facilityCode: string;
  subscriptionSrc: string;
  entries: WaitlistImportRow[];
}

export interface GetLeadsRequest {
  facilityCode?: string;
  action?: string;
  subscriptionCode?: string;
  page: number;
  limit: number;
}

export interface AddLeadNoteRequest {
  facilityCode: string;
  leadId: string;
  text: string;
  createdByName: string;
}

export interface CreateLeadRequest {
  facilityCode: string;
  name: string;
  email: string;
  phone?: string;
  planInterest?: string;
}

export interface WaitlistState {
  waitlist: WaitlistEntry[];
  waitlistLoading: boolean;
  waitlistError: string;
  waitlistTotal: number;

  leads: LeadEntry[];
  leadsLoading: boolean;
  leadsError: string;
  leadsTotal: number;
  leadsPage: number;
  leadsLimit: number;

  noteSaving: boolean;

  importLoading: boolean;
  importError: string;
  importResult: WaitlistImportResult | null;

  createLeadLoading: boolean;
  createLeadError: string;
}

export const initialState: WaitlistState = {
  waitlist: [],
  waitlistLoading: false,
  waitlistError: '',
  waitlistTotal: 0,

  leads: [],
  leadsLoading: false,
  leadsError: '',
  leadsTotal: 0,
  leadsPage: 1,
  leadsLimit: 20,

  noteSaving: false,

  importLoading: false,
  importError: '',
  importResult: null,

  createLeadLoading: false,
  createLeadError: '',
};
