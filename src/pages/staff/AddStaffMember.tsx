import React, { useEffect, useMemo, useRef, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

import { buildRoute, ROUTES } from '../../constants/routes';
import { getLocalUser } from '../../constants/user';
import { getCentres } from '../../store/centres/api';
import {
  createStaff,
  createStaffAccessLevel,
  createStaffRole,
  getStaffConfig,
  getStaffDetails,
  getStaffList,
  updateStaff,
} from '../../store/staff/api';
import { clearStaffDetails } from '../../store/staff/reducers';

import AccountStep from './components/AccountStep';
import DocumentsStep from './components/DocumentsStep';
import ProfileStep from './components/ProfileStep';
import RoleAccessStep from './components/RoleAccessStep';
import StepFooter from './components/StepFooter';
import StepIndicator from './components/StepIndicator';
import { STEPS } from './constants';
import { OTHER_QUALIFICATION, ProfileFormState, StaffDocument, StepKey, initialProfile } from './types';
import {
  blankToNull,
  fileToDataUrl,
  getConfigOtherQualificationId,
  isCentreScopedLevel,
  sortActiveUnique,
  validatePassword,
} from './utils';

import type { FacilitySummary } from '../../store/centres/types';
import type { AppDispatch, RootState } from '../../store/store';

const AddStaffMember: React.FC = () => {
  const navigate = useNavigate();
  const { staffId } = useParams<{ staffId?: string }>();
  const isEditMode = Boolean(staffId);

  const goBack = () => {
    if (isEditMode && staffId) navigate(buildRoute.viewStaffMember(staffId));
    else navigate(ROUTES.STAFF_MANAGEMENT.path);
  };

  const dispatch = useDispatch<AppDispatch>();
  const { staffConfig, staffDetails, isConfigLoading, isDetailsLoading, isSubmitting, configError, detailsError } =
    useSelector((state: RootState) => state.staff);

  // Wizard state
  const [activeStep, setActiveStep] = useState<StepKey>('profile');

  // Form state
  const [profile, setProfile] = useState<ProfileFormState>(initialProfile);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, boolean>>({});
  const [accessLevel, setAccessLevel] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, File>>({});
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});
  const [profileImage, setProfileImage] = useState<string>('');
  const [loginEmail, setLoginEmail] = useState('');
  const [defaultPassword, setDefaultPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  // Tracks whether the login email has been initialised/edited so the
  // auto-fill effect doesn't refill it after the user clears it.
  const loginEmailInitedRef = useRef(false);

  // Edit-mode prefill state (derived from staffDetails in store)
  const [existingDocs, setExistingDocs] = useState<StaffDocument[]>([]);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string>('');
  const [editFacilityCode, setEditFacilityCode] = useState<string>('');
  // Centres a centre-scoped staff member is assigned to (codes). Used for both create & edit.
  const [assignedCentres, setAssignedCentres] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<string>('active');
  const [twoFAEnabled, setTwoFAEnabled] = useState(true);
  // True while a new role is being persisted (drives the create-role button state).
  const [creatingRole, setCreatingRole] = useState(false);
  // True while a new access level is being persisted.
  const [creatingAccessLevel, setCreatingAccessLevel] = useState(false);

  // Real centre catalogue for the Assigned Centres picker (centre-scoped levels).
  // Sourced live from the same list as Centre Management — NO seed fallback, so the
  // codes saved here always match real centres in the DB.
  const [centres, setCentres] = useState<FacilitySummary[]>([]);
  const [centresLoading, setCentresLoading] = useState(false);

  // Sorted/filtered config slices for the wizard steps
  const qualifications = useMemo(() => sortActiveUnique(staffConfig?.qualifications), [staffConfig]);
  const certifications = useMemo(() => sortActiveUnique(staffConfig?.certifications), [staffConfig]);
  const roles = useMemo(() => sortActiveUnique(staffConfig?.roles), [staffConfig]);
  const accessLevels = useMemo(() => sortActiveUnique(staffConfig?.accessLevels), [staffConfig]);
  const requiredDocuments = useMemo(() => sortActiveUnique(staffConfig?.requiredDocuments), [staffConfig]);
  // The id that represents "Other" — the backend's option if present, else the synthetic sentinel.
  const otherQualificationId = useMemo(
    () => getConfigOtherQualificationId(qualifications) ?? OTHER_QUALIFICATION,
    [qualifications]
  );

  // Load config once on mount (cached in store after first fetch)
  useEffect(() => {
    dispatch(getStaffConfig());
  }, [dispatch]);

  // Load the real centre catalogue. On error/empty the picker shows an empty state
  // (plus the "Other" manual option) — we never substitute seed centres here.
  useEffect(() => {
    let cancelled = false;
    setCentresLoading(true);
    dispatch(getCentres({ skip: 0, limit: 200 }))
      .unwrap()
      .then(res => {
        if (!cancelled) setCentres(res.facilities ?? []);
      })
      .catch(() => {
        if (!cancelled) setCentres([]);
      })
      .finally(() => {
        if (!cancelled) setCentresLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  // Load existing staff details in edit mode
  useEffect(() => {
    if (isEditMode && staffId) dispatch(getStaffDetails({ staffId }));
    return () => {
      if (isEditMode) dispatch(clearStaffDetails());
    };
  }, [isEditMode, staffId, dispatch]);

  // Prefill the form when staffDetails arrive
  useEffect(() => {
    if (!isEditMode || !staffDetails) return;
    const data = staffDetails;
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
      highestQualificationOther: '',
      certifications: (sp.certifications ?? []).reduce<Record<string, boolean>>((acc, id) => {
        acc[id] = true;
        return acc;
      }, {}),
      notes: sp.additionalNotes ?? '',
    });
    const rolesSource = sp.roles && sp.roles.length > 0 ? sp.roles : (data.userType ?? []);
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
    setAssignedCentres(sp.assignedCentres ?? []);
    setEditStatus(data.status ?? 'active');
    setLoginEmail(data.loginEmail ?? data.email ?? '');
    loginEmailInitedRef.current = true;
    setTwoFAEnabled(sp.twoFactorAuth ?? true);
  }, [isEditMode, staffDetails]);

  // Normalise a custom (non-config) qualification into the "Other" option
  // once both the staff details and the config are available (edit mode).
  useEffect(() => {
    if (!isEditMode || qualifications.length === 0) return;
    setProfile(prev => {
      const q = prev.highestQualification;
      if (!q || q === otherQualificationId) return prev;
      const isKnown = qualifications.some(opt => opt.id === q);
      if (isKnown) return prev;
      return { ...prev, highestQualification: otherQualificationId, highestQualificationOther: q };
    });
  }, [isEditMode, qualifications, otherQualificationId]);

  // Auto-fill login email once when entering the Account step. Uses a ref so
  // clearing the field (backspace) does not trigger an immediate refill.
  useEffect(() => {
    if (activeStep === 'account' && !loginEmailInitedRef.current && profile.email) {
      setLoginEmail(profile.email);
      loginEmailInitedRef.current = true;
    }
  }, [activeStep, profile.email]);

  const handleLoginEmailChange = (value: string) => {
    loginEmailInitedRef.current = true;
    setLoginEmail(value);
    // Keep the contact email in sync so the profile view reflects the change.
    setProfile(prev => ({ ...prev, email: value }));
  };

  const activeIndex = STEPS.findIndex(s => s.key === activeStep);

  const updateProfile = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
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

  // The currently-selected access level, and whether it scopes to specific centres.
  const selectedAccessLevel = useMemo(
    () => accessLevels.find(l => l.id === accessLevel) ?? null,
    [accessLevels, accessLevel]
  );
  const requiresAssignedCentres = isCentreScopedLevel(selectedAccessLevel);

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

  const handleDocRemoveNew = (key: string) => {
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
  };

  const handleDocRemoveExisting = (type: string) => {
    setExistingDocs(prev => prev.filter(d => d.type?.toLowerCase() !== type.toLowerCase()));
  };

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

  // Create a new role (persisted via the backend), then auto-select it for this staff member.
  const handleCreateRole = async (label: string, description: string): Promise<boolean> => {
    setCreatingRole(true);
    try {
      const role = await dispatch(createStaffRole({ label, description })).unwrap();
      setSelectedRoles(prev => ({ ...prev, [role.id]: true }));
      toast.success(`Role “${role.label}” created`);
      return true;
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Could not create the role. Please try again.');
      return false;
    } finally {
      setCreatingRole(false);
    }
  };

  // Create a new access level (persisted via the backend), then auto-select it.
  const handleCreateAccessLevel = async (
    label: string,
    description: string,
    scopeType: 'facility' | 'global'
  ): Promise<boolean> => {
    setCreatingAccessLevel(true);
    try {
      const level = await dispatch(createStaffAccessLevel({ label, description, scopeType })).unwrap();
      setAccessLevel(level.id);
      toast.success(`Access level “${level.label}” created`);
      return true;
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Could not create the access level. Please try again.');
      return false;
    } finally {
      setCreatingAccessLevel(false);
    }
  };

  const buildSelectedRoleIds = (): string[] => roles.filter(r => selectedRoles[r.id]).map(r => r.id);
  const buildSelectedCertificationIds = (): string[] =>
    certifications.filter(c => profile.certifications[c.id]).map(c => c.id);

  const validateForSubmit = (draft: boolean): string | null => {
    if (!profile.firstName.trim()) return 'First name is required';
    if (!profile.lastName.trim()) return 'Last name is required';
    if (!profile.email.trim()) return 'Email is required';
    if (draft) return null;
    if (buildSelectedRoleIds().length === 0) return 'Select at least one role';
    if (!accessLevel) return 'Select an access level';
    if (requiresAssignedCentres && assignedCentres.length === 0)
      return 'Assign at least one centre for centre-scoped access';
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

    const newDocEntries = await Promise.all(
      Object.entries(documents).map(async ([type, file]) => ({
        type,
        fileName: file.name,
        dataUrl: await fileToDataUrl(file),
      }))
    );

    const resolvedQualification =
      profile.highestQualification === otherQualificationId
        ? profile.highestQualificationOther.trim()
        : profile.highestQualification;

    if (isEditMode && staffId) {
      const existingEntries = existingDocs
        .filter(d => d.type && d.fileName && d.blobName)
        .map(d => ({ type: d.type, fileName: d.fileName, blobName: d.blobName }));

      const action = await dispatch(
        updateStaff({
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
            highestQualification: blankToNull(resolvedQualification),
            certifications: buildSelectedCertificationIds(),
            additionalNotes: profile.notes,
            roles: buildSelectedRoleIds(),
            accessLevel,
            assignedCentres: requiresAssignedCentres ? assignedCentres : [],
            documents: [...existingEntries, ...newDocEntries],
            twoFactorAuth: twoFAEnabled,
            twoFactorMethod: twoFAEnabled ? 'email' : '',
          },
          ...(profileImage ? { profileImageUrl: profileImage } : {}),
        })
      );

      if (updateStaff.fulfilled.match(action)) {
        // Refresh the cached list so the edit shows immediately on return.
        dispatch(getStaffList({ facilityCode: getLocalUser().facilityCode, limit: 50, offset: 0 }));
        toast.success('Staff member updated');
        navigate(buildRoute.viewStaffMember(staffId), { replace: true });
      } else {
        toast.error((action.payload as string) ?? 'Failed to update staff member');
      }
      return;
    }

    const { facilityCode } = getLocalUser();

    const action = await dispatch(
      createStaff({
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
          highestQualification: resolvedQualification,
          certifications: buildSelectedCertificationIds(),
          additionalNotes: profile.notes,
          roles: buildSelectedRoleIds(),
          accessLevel,
          assignedCentres: requiresAssignedCentres ? assignedCentres : [],
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
      })
    );

    if (createStaff.fulfilled.match(action)) {
      // Refresh the cached list so the new member shows immediately.
      await dispatch(getStaffList({ facilityCode, limit: 50, offset: 0 }));
      toast.success(draft ? 'Saved as draft' : 'Staff member created');
      navigate(ROUTES.STAFF_MANAGEMENT.path);
    } else {
      toast.error((action.payload as string) ?? 'Failed to create staff member');
    }
  };

  const handleNext = () => {
    const next = STEPS[activeIndex + 1];
    if (next) setActiveStep(next.key);
  };

  const handleBack = () => {
    const prev = STEPS[activeIndex - 1];
    if (prev) setActiveStep(prev.key);
  };

  const nextStepLabel = STEPS[activeIndex + 1]?.key === 'account' ? 'Account Setup' : STEPS[activeIndex + 1]?.label;

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
        <StepIndicator activeKey={activeStep} steps={STEPS} onSelect={setActiveStep} />

        <div className="px-6 py-5">
          {activeStep === 'profile' && (
            <ProfileStep
              certifications={certifications}
              configError={configError}
              existingPhotoUrl={existingPhotoUrl}
              isConfigLoading={isConfigLoading}
              profile={profile}
              profileImage={profileImage}
              qualifications={qualifications}
              onChange={updateProfile}
              onPhotoRemove={() => setProfileImage('')}
              onPhotoSelect={handleProfileImageSelect}
              onToggleCertification={toggleCertification}
            />
          )}

          {activeStep === 'roleAccess' && (
            <RoleAccessStep
              accessLevel={accessLevel}
              accessLevels={accessLevels}
              assignedCentres={assignedCentres}
              centres={centres}
              centresLoading={centresLoading}
              configError={configError}
              creatingAccessLevel={creatingAccessLevel}
              creatingRole={creatingRole}
              isConfigLoading={isConfigLoading}
              roles={roles}
              selectedRoles={selectedRoles}
              showAssignedCentres={requiresAssignedCentres}
              onChangeCentres={setAssignedCentres}
              onCreateAccessLevel={handleCreateAccessLevel}
              onCreateRole={handleCreateRole}
              onSelectAccessLevel={setAccessLevel}
              onToggleRole={toggleRole}
            />
          )}

          {activeStep === 'documents' && (
            <DocumentsStep
              configError={configError}
              docErrors={docErrors}
              documents={documents}
              existingDocs={existingDocs}
              isConfigLoading={isConfigLoading}
              requiredDocuments={requiredDocuments}
              onRemoveExisting={handleDocRemoveExisting}
              onRemoveNew={handleDocRemoveNew}
              onRemoveOrphan={d => setExistingDocs(prev => prev.filter(x => x !== d))}
              onSelect={handleDocSelect}
            />
          )}

          {activeStep === 'account' && (
            <AccountStep
              accessLevel={accessLevel}
              accessLevelsConfig={accessLevels}
              confirmPassword={confirmPassword}
              editStatus={editStatus}
              isEditMode={isEditMode}
              loginEmail={loginEmail}
              password={defaultPassword}
              profile={profile}
              rolesConfig={roles}
              selectedRoles={selectedRoles}
              sendWelcomeEmail={sendWelcomeEmail}
              onConfirmPasswordChange={setConfirmPassword}
              onEditStatusChange={setEditStatus}
              onLoginEmailChange={handleLoginEmailChange}
              onPasswordChange={setDefaultPassword}
              onToggleWelcomeEmail={setSendWelcomeEmail}
            />
          )}
        </div>

        <StepFooter
          canGoBack={activeIndex > 0}
          isEditMode={isEditMode}
          isLastStep={activeIndex === STEPS.length - 1}
          isSubmitting={isSubmitting}
          nextStepLabel={nextStepLabel}
          onBack={handleBack}
          onCancel={goBack}
          onNext={handleNext}
          onSave={() => handleSubmit(false)}
          onSaveDraft={() => handleSubmit(true)}
        />
      </div>
    </div>
  );
};

export default AddStaffMember;
