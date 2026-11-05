// Re-export domain & config types from the store so consumers
// here can import everything they need from a single place.
export type {
  AccessLevelConfig,
  CoachProfilePayload,
  ConfigOption,
  MenuMasterItem,
  RequiredDocumentConfig,
  RoleConfig,
  RolePermissionsTemplate,
  StaffConfig,
  StaffDetails,
  StaffDocument,
  StaffListRow,
  StaffProfile,
} from '../../store/staff/types';

// ─── Form state — local to this page, not part of redux ──────
export type StepKey = 'profile' | 'roleAccess' | 'documents' | 'account';

export interface ProfileFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  employmentType: string;
  startDate: string;
  highestQualification: string;
  highestQualificationOther: string;
  certifications: Record<string, boolean>;
  notes: string;
}

// Phone defaults to +1 (US) — most staff/centres are US-based — rather than
// leaving the dial code blank, which previously left the picker showing no
// selection at all (looked like it started at "Afghanistan").
export const DEFAULT_DIAL_CODE = '+1';

export const initialProfile: ProfileFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: `${DEFAULT_DIAL_CODE} `,
  dob: '',
  gender: '',
  employmentType: 'Full-time',
  startDate: '',
  highestQualification: '',
  highestQualificationOther: '',
  certifications: {},
  notes: '',
};

// Sentinel value for the "Other (specify below)" qualification option.
export const OTHER_QUALIFICATION = 'other';

// Coach Profile — shown only while 'coach' is one of the selected roles.
// Numeric fields stay as strings while editing (easier to clear/type) and
// are parsed on submit. Weekly availability/non-availability is deliberately
// NOT part of this form — that's set later via the coach calendar editor.
export interface CoachProfileFormState {
  specialization: string[];
  coachDescription: string;
  experienceYears: string;
  certifications: string[];
  hourlyRate: string;
}

export const initialCoachProfile: CoachProfileFormState = {
  specialization: [],
  coachDescription: '',
  experienceYears: '',
  certifications: [],
  hourlyRate: '',
};
