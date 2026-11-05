// ─────────────────────────────────────────────────────────────
// Domain entities — the canonical shape of a staff member and
// the related config returned by the backend.
// ─────────────────────────────────────────────────────────────

export interface StaffDocument {
  type: string;
  fileName: string;
  blobName?: string;
  uploadedAt?: string;
  sasUrl?: string;
  dataUrl?: string;
  mimeType?: string;
}

export interface StaffProfile {
  employmentType?: string;
  startDate?: string;
  highestQualification?: string;
  certifications?: string[];
  additionalNotes?: string;
  photoBlobName?: string;
  photoSasUrl?: string;
  roles?: string[];
  accessLevel?: string;
  assignedCentres?: string[];
  documents?: StaffDocument[];
  twoFactorAuth?: boolean;
  twoFactorMethod?: string;
  statusHistory?: unknown[];
}

export interface StaffDetails {
  staffId: string;
  userId: string;
  email: string;
  loginEmail?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string | null;
  gender?: string;
  userType: string[];
  facilityCode: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt: string | null;
  countryCode?: string | null;
  staffProfile?: StaffProfile;
  // Coach code + descriptive profile — present only when this person has
  // been set up as a bookable coach.
  code?: string | null;
  coachProfile?: CoachProfilePayload | null;
  // Saved per-module permissions, used to pre-fill the edit grid. The backend may
  // return either a custompermission map or a resolved permissions.modules map.
  custompermission?: Record<string, string[]>;
  permissions?: { modules?: Record<string, string[]> };
}

export interface StaffListRow {
  staffId: string;
  userId: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  userType: string[];
  facilityCode: string;
  status: string;
  accessLevel: string | null;
  assignedCentres: string[];
  twoFactorAuth: boolean;
  documentCount: number;
  createdAt: string;
  lastLoginAt: string | null;
  photoSasUrl?: string;
  photoUrl?: string;
  profileImageUrl?: string;
}

// ─────────────────────────────────────────────────────────────
// Config entities — dropdown/option metadata loaded once per
// session from /admin/staff/config.
// ─────────────────────────────────────────────────────────────

export interface ConfigOption {
  id: string;
  label: string;
  order: number;
  isActive: boolean;
  description: string | null;
}

export interface RoleConfig {
  id: string;
  label: string;
  description: string;
  order: number;
  isActive: boolean;
  iconBg: string;
  iconColor: string;
}

export interface AccessLevelConfig {
  id: string;
  label: string;
  description: string;
  scope: string;
  scopeType: string;
  color: string;
  order: number;
  isActive: boolean;
}

export interface RequiredDocumentConfig {
  id: string;
  label: string;
  description: string;
  acceptedFormats: string[];
  maxSizeMB: number;
  isRequired: boolean;
  order: number;
  isActive: boolean;
  iconBg: string;
  iconColor: string;
}

/** One module in the master permission list (from the extended staff config). */
export interface MenuMasterItem {
  id: string;
  label: string;
  order: number;
}

/** Per-role default permission template: role id → module id → verbs (["read"] | ["read","write"] | []). */
export type RolePermissionsTemplate = Record<string, Record<string, string[]>>;

/**
 * GET /admin/staff/role-defaults?roles=<comma-separated> response — module id → verbs,
 * already unioned across every requested role by the backend (a module is granted if
 * ANY of the selected roles grants it). Refetched whenever the selected roles change.
 */
export type RoleDefaults = Record<string, string[]>;

export interface StaffConfig {
  qualifications: ConfigOption[];
  certifications: ConfigOption[];
  roles: RoleConfig[];
  accessLevels: AccessLevelConfig[];
  requiredDocuments: RequiredDocumentConfig[];
  // Extended (additive) — present only once the backend returns them; the Module
  // Permissions grid renders only when both are available.
  menus?: MenuMasterItem[];
  rolePermissions?: RolePermissionsTemplate;
}

// ─────────────────────────────────────────────────────────────
// Request payloads — shapes sent to each backend endpoint.
// ─────────────────────────────────────────────────────────────

export interface StaffListRequest {
  // Omit both to list every staff member network-wide (global/superadmin viewers).
  facilityCode?: string;
  countryCode?: string;
  // Name/email/phone substring match (case-insensitive), filter by userType[0]
  // (role) and by accessLevel — all supported server-side.
  search?: string;
  role?: string;
  accessLevel?: string;
  limit: number;
  offset: number;
}

export interface StaffDocumentEntry {
  type: string;
  fileName: string;
  blobName?: string;
  dataUrl?: string;
}

export interface StaffProfilePayload {
  employmentType: string;
  startDate: string | null;
  highestQualification: string | null;
  certifications: string[];
  additionalNotes: string;
  roles: string[];
  accessLevel: string | null;
  assignedCentres: string[];
  documents: StaffDocumentEntry[];
  twoFactorAuth: boolean;
  twoFactorMethod: string;
}

// Descriptive coach-profile fields — only sent when 'coach' is one of the
// selected roles. Weekly availability/non-availability is deliberately not
// part of this shape; that's set separately via the coach calendar editor.
export interface CoachProfilePayload {
  specialization: string[];
  coachDescription?: string;
  experienceYears?: number | null;
  certifications: string[];
  hourlyRate?: number | null;
  profileImageUrl?: string;
}

export interface CreateStaffRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  profileImageUrl: string;
  staffProfile: StaffProfilePayload;
  loginEmail: string;
  defaultPassword: string;
  userType: string[];
  // Country-scoped roles send facilityCode: null + a countryCode (with empty
  // assignedCentres); centre/facility roles send facilityCode + assignedCentres.
  facilityCode: string | null;
  countryCode?: string | null;
  // Per-module override map: moduleId → verbs (["read"] | ["read","write"]).
  // A partial map is allowed; the backend backfills from the role default.
  custompermission?: Record<string, string[]>;
  draftMode: boolean;
  sendWelcomeEmail: boolean;
  // Coach code + descriptive profile — only meaningful when 'coach' is one of
  // the selected userType roles. `code` auto-generates server-side if omitted.
  code?: string;
  coachProfile?: CoachProfilePayload;
  // Inline base64 coach photo — same shape as `profileImageUrl` above, but
  // uploaded into coachProfile.photoBlobName instead of staffProfile's.
  coachProfileImageUrl?: string;
  coachProfileImageContentType?: string;
}

export type WelcomeEmailStatus = 'sent' | 'failed' | 'skipped_no_email';

/** POST /admin/staff/resend-welcome-email — generates a new temp password and emails it. */
export interface ResendWelcomeEmailRequest {
  staffId: string;
}

export interface ResendWelcomeEmailResponse {
  success: boolean;
  welcomeEmailStatus: WelcomeEmailStatus;
}

export interface UpdateStaffRequest {
  staffId: string;
  firstName: string;
  lastName: string;
  email: string;
  loginEmail: string;
  phone: string;
  dateOfBirth: string | null;
  gender: string | null;
  userType: string[];
  facilityCode: string | null;
  countryCode?: string | null;
  // Per-module override map (same as create): moduleId → verbs.
  custompermission?: Record<string, string[]>;
  status: string;
  staffProfile: StaffProfilePayload;
  profileImageUrl?: string;
  // Coach code + descriptive profile — only meaningful when 'coach' is one of
  // the selected userType roles. Omitted entirely if 'coach' isn't selected,
  // so an existing coachProfile is left untouched server-side.
  code?: string;
  coachProfile?: CoachProfilePayload;
  // Inline base64 coach photo — see CreateStaffRequest. Omitted ⇒ an existing
  // photo is left untouched server-side.
  coachProfileImageUrl?: string;
  coachProfileImageContentType?: string;
}

// ─────────────────────────────────────────────────────────────
// Slice state — one loading + error flag per operation so the
// UI can show precise indicators without overlapping spinners.
// ─────────────────────────────────────────────────────────────

export interface StaffState {
  staffList: StaffListRow[];
  staffDetails: StaffDetails | null;
  staffConfig: StaffConfig | null;
  // Last-fetched role-defaults response (module id → verbs), unioned across the
  // currently-selected roles. Null before the first fetch / when no role is selected.
  roleDefaults: RoleDefaults | null;
  isListLoading: boolean;
  isDetailsLoading: boolean;
  isConfigLoading: boolean;
  isRoleDefaultsLoading: boolean;
  isSubmitting: boolean;
  isResendingWelcomeEmail: boolean;
  listError: string | null;
  detailsError: string | null;
  configError: string | null;
  roleDefaultsError: string | null;
  submitError: string | null;
  resendWelcomeEmailError: string | null;
}

export const initialState: StaffState = {
  staffList: [],
  staffDetails: null,
  staffConfig: null,
  roleDefaults: null,
  isListLoading: false,
  isDetailsLoading: false,
  isConfigLoading: false,
  isRoleDefaultsLoading: false,
  isSubmitting: false,
  isResendingWelcomeEmail: false,
  listError: null,
  detailsError: null,
  configError: null,
  roleDefaultsError: null,
  submitError: null,
  resendWelcomeEmailError: null,
};
