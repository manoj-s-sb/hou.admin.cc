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
  staffProfile?: StaffProfile;
}
