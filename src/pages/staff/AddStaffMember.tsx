import React, { useEffect, useMemo, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

import { buildRoute, ROUTES } from '../../constants/routes';
import { getLocalUser } from '../../constants/user';
import { createStaff, getStaffConfig, getStaffDetails, updateStaff } from '../../store/staff/api';
import { clearStaffDetails } from '../../store/staff/reducers';

import AccountStep from './components/AccountStep';
import DocumentsStep from './components/DocumentsStep';
import ProfileStep from './components/ProfileStep';
import RoleAccessStep from './components/RoleAccessStep';
import StepFooter from './components/StepFooter';
import StepIndicator from './components/StepIndicator';
import { STEPS } from './constants';
import { ProfileFormState, StaffDocument, StepKey, initialProfile } from './types';
import { blankToNull, fileToDataUrl, sortActiveUnique, validatePassword } from './utils';

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

  // Edit-mode prefill state (derived from staffDetails in store)
  const [existingDocs, setExistingDocs] = useState<StaffDocument[]>([]);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string>('');
  const [editFacilityCode, setEditFacilityCode] = useState<string>('');
  const [editAssignedCentres, setEditAssignedCentres] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<string>('active');
  const [twoFAEnabled, setTwoFAEnabled] = useState(true);

  // Sorted/filtered config slices for the wizard steps
  const qualifications = useMemo(() => sortActiveUnique(staffConfig?.qualifications), [staffConfig]);
  const certifications = useMemo(() => sortActiveUnique(staffConfig?.certifications), [staffConfig]);
  const roles = useMemo(() => sortActiveUnique(staffConfig?.roles), [staffConfig]);
  const accessLevels = useMemo(() => sortActiveUnique(staffConfig?.accessLevels), [staffConfig]);
  const requiredDocuments = useMemo(() => sortActiveUnique(staffConfig?.requiredDocuments), [staffConfig]);

  // Load config once on mount (cached in store after first fetch)
  useEffect(() => {
    dispatch(getStaffConfig());
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
    setEditAssignedCentres(sp.assignedCentres ?? []);
    setEditStatus(data.status ?? 'active');
    setLoginEmail(data.loginEmail ?? data.email ?? '');
    setTwoFAEnabled(sp.twoFactorAuth ?? true);
  }, [isEditMode, staffDetails]);

  // Auto-fill login email when entering Account step
  useEffect(() => {
    if (activeStep === 'account' && !loginEmail && profile.email) {
      setLoginEmail(profile.email);
    }
  }, [activeStep, profile.email, loginEmail]);

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
          ...(profileImage ? { profileImageUrl: profileImage } : {}),
        })
      );

      if (updateStaff.fulfilled.match(action)) {
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
          highestQualification: profile.highestQualification,
          certifications: buildSelectedCertificationIds(),
          additionalNotes: profile.notes,
          roles: buildSelectedRoleIds(),
          accessLevel,
          assignedCentres: [],
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
              configError={configError}
              isConfigLoading={isConfigLoading}
              roles={roles}
              selectedRoles={selectedRoles}
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
              onLoginEmailChange={setLoginEmail}
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
