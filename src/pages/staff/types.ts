// Re-export domain & config types from the store so consumers
// here can import everything they need from a single place.
export type {
  AccessLevelConfig,
  ConfigOption,
  RequiredDocumentConfig,
  RoleConfig,
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

export const initialProfile: ProfileFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
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
