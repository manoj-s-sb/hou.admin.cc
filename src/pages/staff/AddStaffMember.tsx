import React, { useEffect, useRef, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';

import endpoints from '../../constants/endpoints';
import { buildRoute, ROUTES } from '../../constants/routes';
import { getLocalUser } from '../../constants/user';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import { StaffDetails, StaffDocument } from './types';

type StepKey = 'profile' | 'roleAccess' | 'documents' | 'account';

const STEPS: { key: StepKey; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'roleAccess', label: 'Role & Access' },
  { key: 'documents', label: 'Documents' },
  { key: 'account', label: 'Account' },
];

interface ConfigOption {
  id: string;
  label: string;
  order: number;
  isActive: boolean;
  description: string | null;
}

interface RoleConfig {
  id: string;
  label: string;
  description: string;
  order: number;
  isActive: boolean;
  iconBg: string;
  iconColor: string;
}

interface AccessLevelConfig {
  id: string;
  label: string;
  description: string;
  scope: string;
  scopeType: string;
  color: string;
  order: number;
  isActive: boolean;
}

interface RequiredDocumentConfig {
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

interface StaffConfig {
  qualifications: ConfigOption[];
  certifications: ConfigOption[];
  roles: RoleConfig[];
  accessLevels: AccessLevelConfig[];
  requiredDocuments: RequiredDocumentConfig[];
}

const FORMAT_TO_ACCEPT: Record<string, string> = {
  PDF: '.pdf',
  JPG: '.jpg,.jpeg',
  JPEG: '.jpg,.jpeg',
  PNG: '.png',
  DOC: '.doc',
  DOCX: '.docx',
};

const buildAcceptString = (formats: string[] = []): string =>
  formats
    .map(f => FORMAT_TO_ACCEPT[f.toUpperCase()] ?? `.${f.toLowerCase()}`)
    .join(',');

const DOC_ICON_MAP: Record<string, React.ReactNode> = {
  govid: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8m-6-6l6 6m-6-6v6h6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  ),
  wwcc: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  ),
  policecheck: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  ),
  firstaid: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M3 12h3l3-8 4 16 3-8h5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  ),
  coachingcert: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M12 2l3 7h7l-5.5 4.5L18 22l-6-4-6 4 1.5-8.5L2 9h7l3-7z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  ),
};

const GENERIC_DOC_ICON = (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
    />
    <path d="M14 2v6h6M9 13h6M9 17h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
  </svg>
);

const sortActiveUnique = <T extends { id: string; isActive: boolean; order: number }>(
  items: T[] = []
): T[] => {
  const seen = new Set<string>();
  return items
    .filter(i => {
      if (!i.isActive) return false;
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    })
    .sort((a, b) => a.order - b.order);
};

const ROLE_ICON_MAP: Record<string, React.ReactNode> = {
  coach: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  ),
  facilitymgmt: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  ),
  operations: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M3 12h3l3-8 4 16 3-8h5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  ),
};

const GENERIC_ROLE_ICON = (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx={12} cy={8} r={4} strokeWidth={1.8} />
    <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" strokeLinecap="round" strokeWidth={1.8} />
  </svg>
);

interface ProfileFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  employmentType: string;
  startDate: string;
  highestQualification: string;
  certifications: Record<string, boolean>;
  notes: string;
}

const initialProfile: ProfileFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dob: '',
  gender: '',
  employmentType: 'Full-time',
  startDate: '',
  highestQualification: '',
  certifications: {},
  notes: '',
};

const AddStaffMember: React.FC = () => {
  const navigate = useNavigate();
  const { staffId } = useParams<{ staffId?: string }>();
  const isEditMode = Boolean(staffId);
  const goBack = () => {
    if (isEditMode && staffId) navigate(buildRoute.viewStaffMember(staffId));
    else navigate(ROUTES.STAFF_MANAGEMENT.path);
  };

  const [activeStep, setActiveStep] = useState<StepKey>('profile');
  const [profile, setProfile] = useState<ProfileFormState>(initialProfile);
  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [accessLevels, setAccessLevels] = useState<AccessLevelConfig[]>([]);
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocumentConfig[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, boolean>>({});
  const [accessLevel, setAccessLevel] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, File>>({});
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});
  const docInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [existingDocs, setExistingDocs] = useState<StaffDocument[]>([]);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string>('');
  const [editFacilityCode, setEditFacilityCode] = useState<string>('');
  const [editAssignedCentres, setEditAssignedCentres] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<string>('active');
  const [loginEmail, setLoginEmail] = useState('');
  const [defaultPassword, setDefaultPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(true);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [qualifications, setQualifications] = useState<ConfigOption[]>([]);
  const [certifications, setCertifications] = useState<ConfigOption[]>([]);
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState<boolean>(isEditMode);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string>('');
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);

  // Load existing staff details in edit mode and prefill the form.
  useEffect(() => {
    if (!isEditMode || !staffId) return;
    let cancelled = false;
    setIsDetailsLoading(true);
    setDetailsError(null);
    api
      .post(endpoints.staff.details, { staffId })
      .then(res => {
        if (cancelled) return;
        const data: StaffDetails | undefined = res?.data?.data;
        if (!data) {
          setDetailsError('Staff member not found');
          return;
        }
        const sp = data.staffProfile ?? {};
        setProfile({
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          dob: (data.dateOfBirth ?? '').toString().slice(0, 10),
          gender: data.gender ?? '',
          employmentType: sp.employmentType ?? 'Full-time',
          startDate: (sp.startDate ?? '').toString().slice(0, 10),
          highestQualification: sp.highestQualification ?? '',
          certifications: (sp.certifications ?? []).reduce<Record<string, boolean>>((acc, id) => {
            acc[id] = true;
            return acc;
          }, {}),
          notes: sp.additionalNotes ?? '',
        });
        const rolesSource = sp.roles && sp.roles.length > 0 ? sp.roles : data.userType ?? [];
        setSelectedRoles(
          rolesSource.reduce<Record<string, boolean>>((acc, id) => {
            acc[id] = true;
            return acc;
          }, {})
        );
        setAccessLevel(sp.accessLevel ?? null);
        setExistingDocs(sp.documents ?? []);
        setExistingPhotoUrl(sp.photoSasUrl ?? '');
        setEditFacilityCode(data.facilityCode ?? '');
        setEditAssignedCentres(sp.assignedCentres ?? []);
        setEditStatus(data.status ?? 'active');
        setLoginEmail(data.loginEmail ?? data.email ?? '');
        setTwoFAEnabled(sp.twoFactorAuth ?? true);
      })
      .catch(err => {
        if (cancelled) return;
        setDetailsError(handleApiError(err, 'Failed to load staff details'));
      })
      .finally(() => {
        if (!cancelled) setIsDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEditMode, staffId]);

  useEffect(() => {
    if (activeStep === 'account' && !loginEmail && profile.email) {
      setLoginEmail(profile.email);
    }
  }, [activeStep, profile.email, loginEmail]);

  useEffect(() => {
    let cancelled = false;
    setIsConfigLoading(true);
    setConfigError(null);
    api
      .get<{ data: StaffConfig }>(endpoints.staff.config)
      .then(res => {
        if (cancelled) return;
        const data = res.data?.data;
        setQualifications(sortActiveUnique(data?.qualifications));
        setCertifications(sortActiveUnique(data?.certifications));
        setRoles(sortActiveUnique(data?.roles));
        setAccessLevels(sortActiveUnique(data?.accessLevels));
        setRequiredDocuments(sortActiveUnique(data?.requiredDocuments));
      })
      .catch(() => {
        if (cancelled) return;
        setConfigError('Failed to load staff config');
      })
      .finally(() => {
        if (!cancelled) setIsConfigLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeIndex = STEPS.findIndex(s => s.key === activeStep);

  const update = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const toggleCertification = (key: string) => {
    setProfile(prev => ({
      ...prev,
      certifications: { ...prev.certifications, [key]: !prev.certifications[key] },
    }));
  };

  const toggleRole = (key: string) => {
    setSelectedRoles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDocSelect = (key: string, file: File | null, maxSizeMB: number) => {
    if (!file) return;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setDocErrors(prev => ({ ...prev, [key]: `File exceeds ${maxSizeMB}MB limit` }));
      return;
    }
    setDocErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setDocuments(prev => ({ ...prev, [key]: file }));
    setExistingDocs(prev => prev.filter(d => d.type?.toLowerCase() !== key.toLowerCase()));
  };

  const handleExistingDocRemove = (type: string) => {
    setExistingDocs(prev => prev.filter(d => d.type?.toLowerCase() !== type.toLowerCase()));
  };

  const handleDocRemove = (key: string) => {
    setDocuments(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setDocErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    const input = docInputRefs.current[key];
    if (input) input.value = '';
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleNext = () => {
    const next = STEPS[activeIndex + 1];
    if (next) setActiveStep(next.key);
  };

  const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500';
  const inputClass =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none transition focus:border-[#21295A] focus:ring-2 focus:ring-[#21295A]/10';

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const handleProfileImageSelect = async (file: File | null) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|jpg)$/i.test(file.type)) {
      toast.error('Profile photo must be a JPG or PNG');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Profile photo must be 2MB or smaller');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setProfileImage(dataUrl);
    } catch {
      toast.error('Failed to read image');
    }
  };

  const handleProfileImageRemove = () => {
    setProfileImage('');
    if (profileImageInputRef.current) profileImageInputRef.current.value = '';
  };

  const buildSelectedRoleIds = (): string[] =>
    roles.filter(r => selectedRoles[r.id]).map(r => r.id);

  const buildSelectedCertificationIds = (): string[] =>
    certifications.filter(c => profile.certifications[c.id]).map(c => c.id);

  const validatePassword = (pw: string): string | null => {
    if (!pw) return 'Default password is required';
    if (pw.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pw)) return 'Password must include at least one uppercase letter';
    if (!/[0-9]/.test(pw)) return 'Password must include at least one number';
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must include at least one special character';
    return null;
  };

  const validateForSubmit = (draft: boolean): string | null => {
    if (!profile.firstName.trim()) return 'First name is required';
    if (!profile.lastName.trim()) return 'Last name is required';
    if (!profile.email.trim()) return 'Email is required';
    if (draft) return null;
    if (buildSelectedRoleIds().length === 0) return 'Select at least one role';
    if (!accessLevel) return 'Select an access level';
    if (!loginEmail.trim()) return 'Login email is required';
    if (isEditMode) return null;
    const pwError = validatePassword(defaultPassword);
    if (pwError) return pwError;
    if (defaultPassword !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (draft: boolean) => {
    const validationError = validateForSubmit(draft);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const newDocEntries = await Promise.all(
        Object.entries(documents).map(async ([type, file]) => ({
          type,
          fileName: file.name,
          dataUrl: await fileToDataUrl(file),
        }))
      );

      if (isEditMode) {
        const existingEntries = existingDocs
          .filter(d => d.type && d.fileName && d.blobName)
          .map(d => ({ type: d.type, fileName: d.fileName, blobName: d.blobName }));

        const blankToNull = (v: string | null | undefined) => {
          const trimmed = (v ?? '').toString().trim();
          return trimmed === '' ? null : trimmed;
        };

        const updatePayload: Record<string, unknown> = {
          staffId,
          firstName: profile.firstName.trim(),
          lastName: profile.lastName.trim(),
          email: profile.email.trim(),
          loginEmail: (loginEmail || profile.email).trim(),
          phone: profile.phone.trim(),
          dateOfBirth: blankToNull(profile.dob),
          gender: blankToNull(profile.gender),
          userType: buildSelectedRoleIds(),
          facilityCode: editFacilityCode || getLocalUser().facilityCode,
          status: editStatus,
          staffProfile: {
            employmentType: profile.employmentType,
            startDate: blankToNull(profile.startDate),
            highestQualification: blankToNull(profile.highestQualification),
            certifications: buildSelectedCertificationIds(),
            additionalNotes: profile.notes,
            roles: buildSelectedRoleIds(),
            accessLevel,
            assignedCentres: editAssignedCentres,
            documents: [...existingEntries, ...newDocEntries],
            twoFactorAuth: twoFAEnabled,
            twoFactorMethod: twoFAEnabled ? 'email' : '',
          },
        };

        if (profileImage) {
          updatePayload.profileImageUrl = profileImage;
        }

        // Visible in DevTools Network tab; also logged for support
        // eslint-disable-next-line no-console
        console.debug('[staff/update] payload', updatePayload);
        const updateRes = await api.post(endpoints.staff.update, updatePayload);
        // eslint-disable-next-line no-console
        console.debug('[staff/update] response', updateRes?.status, updateRes?.data);

        if (updateRes?.data?.status && updateRes.data.status !== 'success') {
          toast.error(updateRes.data?.message ?? 'Update failed');
          return;
        }

        toast.success('Staff member updated');
        if (staffId) navigate(buildRoute.viewStaffMember(staffId), { replace: true });
        else navigate(ROUTES.STAFF_MANAGEMENT.path, { replace: true });
        return;
      }

      const { facilityCode } = getLocalUser();

      const payload = {
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
        dateOfBirth: profile.dob,
        gender: profile.gender,
        profileImageUrl: profileImage,
        staffProfile: {
          employmentType: profile.employmentType,
          startDate: profile.startDate,
          highestQualification: profile.highestQualification,
          certifications: buildSelectedCertificationIds(),
          additionalNotes: profile.notes,
          roles: buildSelectedRoleIds(),
          accessLevel,
          assignedCentres: [] as string[],
          documents: newDocEntries,
          twoFactorAuth: twoFAEnabled,
          twoFactorMethod: twoFAEnabled ? 'email' : '',
        },
        loginEmail: (loginEmail || profile.email).trim(),
        defaultPassword,
        userType: buildSelectedRoleIds(),
        facilityCode,
        draftMode: draft,
        sendWelcomeEmail: draft ? false : sendWelcomeEmail,
      };

      await api.post(endpoints.staff.create, payload);
      toast.success(draft ? 'Saved as draft' : 'Staff member created');
      navigate(ROUTES.STAFF_MANAGEMENT.path);
    } catch (err) {
      toast.error(handleApiError(err, isEditMode ? 'Failed to update staff member' : 'Failed to create staff member'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* Page header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            className="mb-2 inline-flex items-center gap-1 text-[12px] font-semibold text-gray-500 transition hover:text-[#21295A]"
            type="button"
            onClick={goBack}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
            {isEditMode ? 'Back to Profile' : 'Back to Staff Management'}
          </button>
          <h1 className="text-[20px] font-bold tracking-tight text-[#21295A]">
            {isEditMode ? 'Edit Staff Member' : 'Add Staff Member'}
          </h1>
          <p className="mt-1 text-[12px] font-medium text-gray-500">
            {isEditMode
              ? 'Update details across the sections then save changes.'
              : 'Fill in details across all sections then save.'}
          </p>
        </div>
      </div>

      {isEditMode && isDetailsLoading && (
        <div className="mb-4 rounded-xl border border-gray-100 bg-white px-6 py-4 text-[12px] font-semibold text-gray-500 shadow-sm">
          Loading staff details…
        </div>
      )}
      {isEditMode && detailsError && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-6 py-4 text-[12px] font-semibold text-red-600 shadow-sm">
          {detailsError}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {/* Step indicator */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          {STEPS.map((step, idx) => {
            const isActive = step.key === activeStep;
            const isDone = idx < activeIndex;
            return (
              <React.Fragment key={step.key}>
                <button
                  aria-current={isActive ? 'step' : undefined}
                  className="flex items-center gap-2 rounded-md p-1 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#21295A]/30"
                  type="button"
                  onClick={() => setActiveStep(step.key)}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition ${
                      isActive
                        ? 'bg-[#21295A] text-white'
                        : isDone
                          ? 'bg-[#21295A]/20 text-[#21295A]'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={`text-[12px] font-semibold ${
                      isActive ? 'text-[#21295A]' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
                {idx < STEPS.length - 1 && <div className="h-px flex-1 bg-gray-200" />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {activeStep === 'profile' && (
            <div className="space-y-6">
              {/* Profile Photo */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-gray-400 shadow-sm">
                    {profileImage || existingPhotoUrl ? (
                      <img
                        alt="Profile preview"
                        className="h-full w-full object-cover"
                        src={profileImage || existingPhotoUrl}
                      />
                    ) : (
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-[#21295A]">Profile Photo</p>
                    <p className="text-[11px] text-gray-500">
                      JPG or PNG, max 2MB. Displayed on staff profiles and member-facing interfaces.
                    </p>
                    <input
                      ref={profileImageInputRef}
                      accept="image/png,image/jpeg"
                      className="hidden"
                      type="file"
                      onChange={e => handleProfileImageSelect(e.target.files?.[0] ?? null)}
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition hover:border-[#21295A]/30 hover:text-[#21295A]"
                        type="button"
                        onClick={() => profileImageInputRef.current?.click()}
                      >
                        {profileImage || existingPhotoUrl ? 'Replace Photo' : 'Upload Photo'}
                      </button>
                      {profileImage && (
                        <button
                          className="rounded-md border border-transparent px-2 py-1.5 text-[11px] font-semibold text-red-500 transition hover:text-red-700"
                          type="button"
                          onClick={handleProfileImageRemove}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Details */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Personal Details
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className={labelClass} htmlFor="first-name">
                      First Name *
                    </label>
                    <input
                      className={inputClass}
                      id="first-name"
                      placeholder="e.g. James"
                      type="text"
                      value={profile.firstName}
                      onChange={e => update('firstName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="last-name">
                      Last Name *
                    </label>
                    <input
                      className={inputClass}
                      id="last-name"
                      placeholder="e.g. Thornton"
                      type="text"
                      value={profile.lastName}
                      onChange={e => update('lastName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="email">
                      Email Address *
                    </label>
                    <input
                      className={inputClass}
                      id="email"
                      placeholder="james@example.com"
                      type="email"
                      value={profile.email}
                      onChange={e => update('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="phone">
                      Phone Number
                    </label>
                    <input
                      className={inputClass}
                      id="phone"
                      placeholder="+1 555 000 0000"
                      type="tel"
                      value={profile.phone}
                      onChange={e => update('phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="dob">
                      Date of Birth *
                    </label>
                    <input
                      className={inputClass}
                      id="dob"
                      type="date"
                      value={profile.dob}
                      onChange={e => update('dob', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="gender">
                      Gender
                    </label>
                    <select
                      className={inputClass}
                      id="gender"
                      value={profile.gender}
                      onChange={e => update('gender', e.target.value)}
                    >
                      <option value="">Select…</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non-binary">Non-binary</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="employment-type">
                      Employment Type
                    </label>
                    <select
                      className={inputClass}
                      id="employment-type"
                      value={profile.employmentType}
                      onChange={e => update('employmentType', e.target.value)}
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Casual">Casual</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="start-date">
                      Start Date
                    </label>
                    <input
                      className={inputClass}
                      id="start-date"
                      type="date"
                      value={profile.startDate}
                      onChange={e => update('startDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Qualifications & Experience */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Qualifications & Experience
                </p>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass} htmlFor="highest-qualification">
                      Highest Qualification
                    </label>
                    <select
                      className={inputClass}
                      disabled={isConfigLoading}
                      id="highest-qualification"
                      value={profile.highestQualification}
                      onChange={e => update('highestQualification', e.target.value)}
                    >
                      <option value="">{isConfigLoading ? 'Loading…' : 'Select…'}</option>
                      {qualifications.map(q => (
                        <option key={q.id} value={q.id}>
                          {q.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className={labelClass}>Cricket / Coaching Certifications</p>
                    {isConfigLoading ? (
                      <p className="text-[12px] text-gray-400">Loading certifications…</p>
                    ) : configError ? (
                      <p className="text-[12px] text-red-500">{configError}</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                        {certifications.map(cert => (
                          <label
                            key={cert.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-100 bg-white px-3 py-2 text-[12px] text-gray-700 transition hover:border-[#21295A]/20"
                            title={cert.description ?? undefined}
                          >
                            <input
                              checked={!!profile.certifications[cert.id]}
                              className="h-4 w-4 rounded border-gray-300 text-[#21295A] focus:ring-[#21295A]"
                              type="checkbox"
                              onChange={() => toggleCertification(cert.id)}
                            />
                            <span>{cert.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="notes">
                      Additional Notes / Specialisations
                    </label>
                    <textarea
                      className={`${inputClass} min-h-[88px] resize-y`}
                      id="notes"
                      placeholder="e.g. Specialises in batting technique, youth coaching experience…"
                      value={profile.notes}
                      onChange={e => update('notes', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 'roleAccess' && (
            <div className="space-y-6">
              {/* Primary Roles */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Primary Roles
                </p>
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                  <p className="mb-2 px-2 text-[12px] text-gray-600">
                    A staff member can hold <span className="font-semibold text-gray-800">multiple roles</span>. Select all that apply.
                  </p>
                  {isConfigLoading ? (
                    <p className="px-2 text-[12px] text-gray-400">Loading roles…</p>
                  ) : configError ? (
                    <p className="px-2 text-[12px] text-red-500">{configError}</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {roles.map(role => {
                        const isSelected = !!selectedRoles[role.id];
                        return (
                          <button
                            key={role.id}
                            aria-pressed={isSelected}
                            className={`flex w-full items-start gap-3 rounded-lg border bg-white p-3 text-left transition ${
                              isSelected
                                ? 'border-[#21295A] ring-2 ring-[#21295A]/15'
                                : 'border-gray-100 hover:border-gray-300'
                            }`}
                            type="button"
                            onClick={() => toggleRole(role.id)}
                          >
                            <span
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                              style={{ backgroundColor: role.iconBg, color: role.iconColor }}
                            >
                              {ROLE_ICON_MAP[role.id] ?? GENERIC_ROLE_ICON}
                            </span>
                            <span className="flex-1">
                              <span className="block text-[13px] font-bold text-[#21295A]">{role.label}</span>
                              <span className="mt-0.5 block text-[12px] leading-relaxed text-gray-500">
                                {role.description}
                              </span>
                            </span>
                            <span
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                                isSelected
                                  ? 'border-[#21295A] bg-[#21295A]'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {isSelected && (
                                <svg
                                  className="h-2.5 w-2.5 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    d="M5 13l4 4L19 7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                  />
                                </svg>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Access Level */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Access Level
                </p>
                {isConfigLoading ? (
                  <p className="text-[12px] text-gray-400">Loading access levels…</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {accessLevels.map(level => {
                      const isSelected = accessLevel === level.id;
                      return (
                        <button
                          key={level.id}
                          aria-pressed={isSelected}
                          className={`flex w-full items-start gap-3 rounded-lg border bg-white p-3 text-left transition ${
                            isSelected
                              ? 'border-[#21295A] ring-2 ring-[#21295A]/15'
                              : 'border-gray-100 hover:border-gray-300'
                          }`}
                          type="button"
                          onClick={() => setAccessLevel(level.id)}
                        >
                          <span className="flex-1">
                            <span className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: level.color }}
                              />
                              <span className="text-[13px] font-bold text-[#21295A]">{level.label}</span>
                              <span
                                className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                                style={{ backgroundColor: `${level.color}1A`, color: level.color }}
                              >
                                {level.scope}
                              </span>
                            </span>
                            <span className="mt-1 block text-[12px] leading-relaxed text-gray-500">
                              {level.description}
                            </span>
                          </span>
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
                              isSelected ? 'border-[#21295A]' : 'border-gray-300'
                            }`}
                          >
                            {isSelected && <span className="h-2 w-2 rounded-full bg-[#21295A]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeStep === 'documents' && (
            <div className="space-y-5">
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Required Documents
                </p>
                {isConfigLoading ? (
                  <p className="text-[12px] text-gray-400">Loading documents…</p>
                ) : configError ? (
                  <p className="text-[12px] text-red-500">{configError}</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {requiredDocuments.map(doc => {
                      const file = documents[doc.id];
                      const existing = existingDocs.find(
                        d => d.type?.toLowerCase() === doc.id.toLowerCase()
                      );
                      const error = docErrors[doc.id];
                      const accept = buildAcceptString(doc.acceptedFormats);
                      const formatsText = doc.acceptedFormats.join(', ');
                      const hasContent = Boolean(file || existing);
                      return (
                        <div
                          key={doc.id}
                          className={`rounded-lg border bg-white p-3 transition ${
                            hasContent ? 'border-[#21295A]/40' : 'border-gray-100'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                              style={{ backgroundColor: doc.iconBg, color: doc.iconColor }}
                            >
                              {DOC_ICON_MAP[doc.id] ?? GENERIC_DOC_ICON}
                            </span>
                            <div className="flex-1">
                              <p className="text-[13px] font-bold text-[#21295A]">
                                {doc.label}
                              </p>
                              <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500">
                                {doc.description} {formatsText} — max {doc.maxSizeMB}MB.
                              </p>
                            </div>
                            <input
                              ref={el => {
                                docInputRefs.current[doc.id] = el;
                              }}
                              accept={accept}
                              className="hidden"
                              type="file"
                              onChange={e =>
                                handleDocSelect(doc.id, e.target.files?.[0] ?? null, doc.maxSizeMB)
                              }
                            />
                            <button
                              className="shrink-0 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition hover:border-[#21295A]/30 hover:text-[#21295A]"
                              type="button"
                              onClick={() => docInputRefs.current[doc.id]?.click()}
                            >
                              {hasContent ? 'Replace' : 'Upload'}
                            </button>
                          </div>
                          {existing && !file && (
                            <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <svg
                                  className="h-4 w-4 shrink-0 text-blue-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.8}
                                  />
                                </svg>
                                <p className="truncate text-[12px] font-medium text-blue-800">
                                  {existing.fileName}
                                </p>
                                {existing.sasUrl && (
                                  <a
                                    className="shrink-0 text-[11px] font-semibold text-blue-700 underline-offset-2 hover:underline"
                                    href={existing.sasUrl}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    Preview
                                  </a>
                                )}
                              </div>
                              <button
                                className="shrink-0 text-[11px] font-semibold text-red-500 transition hover:text-red-700"
                                type="button"
                                onClick={() => handleExistingDocRemove(doc.id)}
                              >
                                Remove
                              </button>
                            </div>
                          )}
                          {file && (
                            <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <svg
                                  className="h-4 w-4 shrink-0 text-emerald-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                  />
                                </svg>
                                <p className="truncate text-[12px] font-medium text-emerald-800">
                                  {file.name}
                                </p>
                                <span className="shrink-0 text-[11px] text-emerald-600">
                                  · {formatBytes(file.size)}
                                </span>
                              </div>
                              <button
                                className="shrink-0 text-[11px] font-semibold text-red-500 transition hover:text-red-700"
                                type="button"
                                onClick={() => handleDocRemove(doc.id)}
                              >
                                Remove
                              </button>
                            </div>
                          )}
                          {error && (
                            <p className="mt-2 text-[11px] font-medium text-red-500">{error}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {(() => {
                const requiredIds = new Set(requiredDocuments.map(d => d.id.toLowerCase()));
                const orphanDocs = existingDocs.filter(
                  d => !d.type || !requiredIds.has(d.type.toLowerCase())
                );
                if (orphanDocs.length === 0) return null;
                return (
                  <div>
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      Other Uploaded Documents
                    </p>
                    <div className="space-y-2">
                      {orphanDocs.map((d, idx) => (
                        <div
                          key={`${d.fileName ?? 'doc'}-${idx}`}
                          className="flex items-center justify-between gap-3 rounded-md border border-gray-100 bg-white px-3 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <svg className="h-4 w-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
                            </svg>
                            <p className="truncate text-[12px] font-medium text-gray-800">{d.fileName}</p>
                            {d.sasUrl && (
                              <a
                                className="shrink-0 text-[11px] font-semibold text-blue-700 underline-offset-2 hover:underline"
                                href={d.sasUrl}
                                rel="noreferrer"
                                target="_blank"
                              >
                                Preview
                              </a>
                            )}
                          </div>
                          <button
                            className="shrink-0 text-[11px] font-semibold text-red-500 transition hover:text-red-700"
                            type="button"
                            onClick={() => setExistingDocs(prev => prev.filter(x => x !== d))}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-[12px] leading-relaxed text-gray-600">
                  <span className="font-semibold text-gray-800">Additional Documents</span> — You can
                  upload any other relevant documents (e.g. contract, NDA, emergency contact form) after
                  the staff member is created, via their profile page.
                </p>
              </div>
            </div>
          )}

          {activeStep === 'account' && (
            <div className="space-y-6">
              {/* Login Credentials */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Login Credentials
                </p>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass} htmlFor="login-email">
                      Login Email *
                    </label>
                    <input
                      className={inputClass}
                      id="login-email"
                      placeholder="Auto-filled from profile email — editable"
                      type="email"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                    />
                  </div>
                  {!isEditMode && (
                  <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="default-password">
                        Default Password *
                      </label>
                      <div className="relative">
                        <input
                          className={`${inputClass} pr-10`}
                          id="default-password"
                          type={showPassword ? 'text' : 'password'}
                          value={defaultPassword}
                          onChange={e => setDefaultPassword(e.target.value)}
                        />
                        <button
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition hover:text-gray-700"
                          type="button"
                          onClick={() => setShowPassword(s => !s)}
                        >
                          {showPassword ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                d="M3 3l18 18M10.5 10.5a3 3 0 004.243 4.243M9.88 4.62A10.6 10.6 0 0112 4.5c5 0 9.27 3.11 11 7.5a11.6 11.6 0 01-4.06 5.06M6.1 6.1A11.6 11.6 0 001 12c1.73 4.39 6 7.5 11 7.5 1.45 0 2.84-.26 4.12-.74"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.8}
                              />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.8}
                              />
                              <circle cx={12} cy={12} r={3} strokeWidth={1.8} />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="confirm-password">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <input
                          className={`${inputClass} pr-10`}
                          id="confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                        />
                        <button
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition hover:text-gray-700"
                          type="button"
                          onClick={() => setShowConfirmPassword(s => !s)}
                        >
                          {showConfirmPassword ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                d="M3 3l18 18M10.5 10.5a3 3 0 004.243 4.243M9.88 4.62A10.6 10.6 0 0112 4.5c5 0 9.27 3.11 11 7.5a11.6 11.6 0 01-4.06 5.06M6.1 6.1A11.6 11.6 0 001 12c1.73 4.39 6 7.5 11 7.5 1.45 0 2.84-.26 4.12-.74"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.8}
                              />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.8}
                              />
                              <circle cx={12} cy={12} r={3} strokeWidth={1.8} />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed text-gray-500">
                    Staff member will be prompted to change this password on first login. Password must be
                    min 8 characters with at least one uppercase, one number, and one special character.
                  </p>
                  {defaultPassword && validatePassword(defaultPassword) && (
                    <p className="text-[11px] font-medium text-red-500">
                      {validatePassword(defaultPassword)}
                    </p>
                  )}
                  {confirmPassword && defaultPassword && confirmPassword !== defaultPassword && (
                    <p className="text-[11px] font-medium text-red-500">Passwords do not match.</p>
                  )}
                  </>
                  )}
                </div>
              </div>

              {/* 2FA — hidden for now, will be re-enabled when required */}
              {false && (
              <div
                className={`rounded-xl border p-4 transition ${
                  twoFAEnabled
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <svg
                        className={`h-4 w-4 ${twoFAEnabled ? 'text-emerald-600' : 'text-gray-500'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M12 11v4m-6-4V8a6 6 0 1112 0v3M5 11h14a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                        />
                      </svg>
                      <p
                        className={`text-[13px] font-bold ${
                          twoFAEnabled ? 'text-emerald-700' : 'text-gray-700'
                        }`}
                      >
                        Two-Factor Authentication (2FA)
                      </p>
                    </div>
                    <p className="mt-1 text-[12px] text-gray-600">
                      Adds an extra layer of security. Recommended for Admin and Global access levels.
                    </p>
                  </div>
                  <button
                    aria-label="Toggle 2FA"
                    aria-pressed={twoFAEnabled}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                      twoFAEnabled ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                    type="button"
                    onClick={() => setTwoFAEnabled(v => !v)}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        twoFAEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                {twoFAEnabled && (
                  <div className="mt-4 border-t border-emerald-100 pt-4">
                    <p className="mb-2 text-[12px] font-semibold text-emerald-700">2FA Method</p>
                    <div className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-white p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                          />
                        </svg>
                      </span>
                      <div className="flex-1">
                        <p className="text-[13px] font-bold text-[#21295A]">OTP via Email</p>
                        <p className="mt-0.5 text-[12px] text-gray-500">
                          A one-time passcode is sent to the staff member&apos;s registered email address each
                          time they log in.
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Active
                      </span>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Invite Email — create flow only */}
              {!isEditMode && (
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Invite Email
                </p>
                <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-3">
                  <input
                    checked={sendWelcomeEmail}
                    className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    id="send-welcome-email"
                    type="checkbox"
                    onChange={e => setSendWelcomeEmail(e.target.checked)}
                  />
                  <label className="flex-1 cursor-pointer" htmlFor="send-welcome-email">
                    <span className="block text-[13px] font-bold text-[#21295A]">
                      Send welcome email with login instructions
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-gray-500">
                      Staff member will receive an email with their login credentials, a link to download
                      the Century Cricket Staff App, and a prompt to set up 2FA.
                    </span>
                  </label>
                </div>
              </div>
              )}

              {/* Status — edit flow only */}
              {isEditMode && (
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Account Status
                </p>
                <select
                  className={inputClass}
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="invited">Invited</option>
                  <option value="draft">Draft</option>
                  <option value="suspended">Suspended</option>
                </select>
                <p className="mt-1 text-[11px] text-gray-500">
                  Changing the status will be reflected in the staff list and access controls.
                </p>
              </div>
              )}

              {/* Review */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx={12} cy={12} r={9} strokeWidth={1.8} />
                    <path d="M12 8v4m0 4h.01" strokeLinecap="round" strokeWidth={1.8} />
                  </svg>
                  <p className="text-[13px] font-bold text-[#21295A]">Review before saving</p>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[12px] md:grid-cols-2">
                  <p className="text-gray-600">
                    Name:{' '}
                    <span className="font-semibold text-[#21295A]">
                      {`${profile.firstName} ${profile.lastName}`.trim() || '—'}
                    </span>
                  </p>
                  <p className="text-gray-600">
                    Email: <span className="font-semibold text-[#21295A]">{loginEmail || profile.email || '—'}</span>
                  </p>
                  <p className="text-gray-600">
                    Roles:{' '}
                    <span className="font-semibold text-[#21295A]">
                      {Object.values(selectedRoles).some(Boolean)
                        ? roles.filter(r => selectedRoles[r.id]).map(r => r.label).join(', ')
                        : 'None selected'}
                    </span>
                  </p>
                  <p className="text-gray-600">
                    Access:{' '}
                    <span className="font-semibold text-[#21295A]">
                      {accessLevel ? accessLevels.find(a => a.id === accessLevel)?.label : 'None selected'}
                    </span>
                  </p>
                  <p className="text-gray-600">
                    Status:{' '}
                    <span className="font-semibold text-amber-600">
                      {isEditMode
                        ? editStatus.charAt(0).toUpperCase() + editStatus.slice(1)
                        : sendWelcomeEmail
                          ? 'Invited (pending login)'
                          : 'Draft'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Save options info */}
              {!isEditMode && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx={12} cy={12} r={9} strokeWidth={1.8} />
                    <path d="M12 8v4m0 4h.01" strokeLinecap="round" strokeWidth={1.8} />
                  </svg>
                  <p className="text-[13px] font-bold text-amber-800">Two save options available</p>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-amber-900">
                  <span className="font-bold">Save as Draft</span> — Saves all entered details now. No
                  account is created and no email is sent. You can return and complete the profile at any
                  time. Profile will show as <em>Draft</em> in the staff list.
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-amber-900">
                  <span className="font-bold">Save &amp; Share</span> — Creates the staff account, generates
                  login credentials, and sends the welcome email with OTP 2FA setup instructions. Profile
                  status becomes <em>Invited</em>.
                </p>
              </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <button
            className="text-[12px] font-semibold text-gray-500 transition hover:text-gray-800 disabled:opacity-40"
            disabled={activeIndex === 0}
            type="button"
            onClick={() => {
              const prev = STEPS[activeIndex - 1];
              if (prev) setActiveStep(prev.key);
            }}
          >
            ← Back
          </button>
          {activeIndex < STEPS.length - 1 ? (
            <button
              className="rounded-lg bg-[#21295A] px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570]"
              type="button"
              onClick={handleNext}
            >
              Next: {STEPS[activeIndex + 1].key === 'account' ? 'Account Setup' : STEPS[activeIndex + 1].label} →
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                disabled={isSubmitting}
                type="button"
                onClick={goBack}
              >
                Cancel
              </button>
              {!isEditMode && (
              <button
                className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-4 py-2 text-[12px] font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
                disabled={isSubmitting}
                type="button"
                onClick={() => handleSubmit(true)}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                  />
                  <path d="M17 21v-8H7v8M7 3v5h8" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
                </svg>
                Save as Draft
              </button>
              )}
              <button
                className="flex items-center gap-1.5 rounded-lg bg-[#21295A] px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570] disabled:opacity-50"
                disabled={isSubmitting}
                type="button"
                onClick={() => handleSubmit(false)}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                  />
                </svg>
                {isSubmitting ? 'Saving…' : isEditMode ? 'Save Changes' : 'Save & Share'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddStaffMember;
