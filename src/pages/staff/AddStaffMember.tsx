import React, { useEffect, useMemo, useRef, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

import { buildRoute, ROUTES } from '../../constants/routes';
import { getCentres } from '../../store/centres/api';
import {
  createStaff,
  createStaffAccessLevel,
  createStaffRole,
  getRoleDefaults,
  getStaffConfig,
  getStaffDetails,
  getStaffList,
  updateStaff,
} from '../../store/staff/api';
import { clearRoleDefaults, clearStaffDetails } from '../../store/staff/reducers';

import AccountStep from './components/AccountStep';
import DocumentsStep from './components/DocumentsStep';
import { DUAL_SCOPE_IDS, globalKey, mergeDualScope, type PermGrid } from './components/ModulePermissionsSection';
import ProfileStep from './components/ProfileStep';
import RoleAccessStep from './components/RoleAccessStep';
import StepFooter from './components/StepFooter';
import StepIndicator from './components/StepIndicator';
import { STEPS } from './constants';
import { OTHER_QUALIFICATION, ProfileFormState, StaffDocument, StepKey, initialProfile } from './types';
import {
  blankToNull,
  buildStaffListParams,
  fileToDataUrl,
  getConfigOtherQualificationId,
  isCentreScopedLevel,
  isCountryScopedLevel,
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
  const {
    staffConfig,
    staffDetails,
    roleDefaults,
    isConfigLoading,
    isDetailsLoading,
    isRoleDefaultsLoading,
    isSubmitting,
    configError,
    detailsError,
  } = useSelector((state: RootState) => state.staff);

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
  // Country a country-scoped staff member manages (code). Used instead of centres.
  const [countryCode, setCountryCode] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('active');
  const [twoFAEnabled, setTwoFAEnabled] = useState(true);
  // True while a new role is being persisted (drives the create-role button state).
  const [creatingRole, setCreatingRole] = useState(false);
  // True while a new access level is being persisted.
  const [creatingAccessLevel, setCreatingAccessLevel] = useState(false);

  // Module Permissions grid (extended staff config). `touchedModules` records exactly
  // which module ids the admin has manually checked/unchecked, so a role-defaults
  // refresh (on role change) only overwrites modules the admin hasn't customized.
  const [modulePerms, setModulePerms] = useState<PermGrid>({});
  const [touchedModules, setTouchedModules] = useState<Set<string>>(() => new Set());
  const [modulePermError, setModulePermError] = useState<string | null>(null);

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

  // ── Module Permissions (extended staff config) ───────────────────────────
  // Master menu list — present only once the backend returns it; the whole section
  // is hidden otherwise.
  const modulePermMenus = staffConfig?.menus;

  const selectedRoleIds = useMemo(() => Object.keys(selectedRoles).filter(id => selectedRoles[id]), [selectedRoles]);
  // Primitive dep so the fetch effect below only re-runs when the ROLE SET actually
  // changes (selectedRoleIds is a fresh array every render otherwise).
  const selectedRoleIdsKey = selectedRoleIds.join(',');

  // Refetch role-derived defaults from the backend whenever the selected role(s)
  // change — GET /admin/staff/role-defaults, already unioned across roles server-side
  // (a module is granted if ANY selected role grants it). Also fires once on the
  // initial edit-mode load, right after the member's saved roles populate `selectedRoles`.
  useEffect(() => {
    if (!modulePermMenus?.length) return;
    if (selectedRoleIds.length === 0) {
      dispatch(clearRoleDefaults());
      return;
    }
    dispatch(getRoleDefaults(selectedRoleIds));
    // selectedRoleIds is re-derived from selectedRoleIdsKey each render — depending on
    // the key (not the array) avoids refetching on unrelated re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoleIdsKey, modulePermMenus, dispatch]);

  // The last-fetched defaults, expanded into a full grid over every known module
  // (missing entries ⇒ not granted) and mirrored into the dual-scope "all centres"
  // key too, so that row isn't blank the first time it's shown.
  const defaultsGrid = useMemo((): PermGrid => {
    const menusList = modulePermMenus ?? [];
    const template = roleDefaults ?? {};
    const grid: PermGrid = {};
    menusList.forEach(m => {
      const verbs = template[m.id] ?? [];
      const view = verbs.includes('read') || verbs.includes('write');
      const edit = verbs.includes('write');
      grid[m.id] = { view, edit };
      if (DUAL_SCOPE_IDS.has(m.id)) grid[globalKey(m.id)] = { view, edit };
    });
    return grid;
  }, [modulePermMenus, roleDefaults]);

  // Apply the latest defaults to every module the admin HASN'T manually touched.
  // Touched modules keep whatever the admin set, regardless of role changes.
  useEffect(() => {
    if (!modulePermMenus?.length) return;
    setModulePerms(prev => {
      const next: PermGrid = { ...prev };
      Object.entries(defaultsGrid).forEach(([id, row]) => {
        if (!touchedModules.has(id)) next[id] = row;
      });
      return next;
    });
  }, [defaultsGrid, modulePermMenus, touchedModules]);

  const onChangeModulePermissions = (next: PermGrid) => {
    setModulePerms(prev => {
      // Mark exactly the grid keys whose view/edit state actually changed as
      // "touched" — everything else keeps refreshing from role defaults.
      const changedIds = new Set<string>();
      new Set([...Object.keys(prev), ...Object.keys(next)]).forEach(id => {
        const a = prev[id] ?? { view: false, edit: false };
        const b = next[id] ?? { view: false, edit: false };
        if (a.view !== b.view || a.edit !== b.edit) changedIds.add(id);
      });
      if (changedIds.size > 0) {
        setTouchedModules(t => {
          const nt = new Set(t);
          changedIds.forEach(id => nt.add(id));
          return nt;
        });
      }
      return next;
    });
    setModulePermError(null);
  };

  // custompermission = { moduleId: verbs } from the grid's final state. Only sent
  // when the feature is active; modules with neither box checked are omitted.
  const buildCustomPermission = (): Record<string, string[]> | undefined => {
    if (!modulePermMenus?.length) return undefined;
    const out: Record<string, string[]> = {};
    modulePermMenus.forEach(m => {
      // Dual-scope modules (Tickets/Tailgate/Maintenance) carry two UI rows — centre
      // and "all centres" — merged here since the backend has one permission per module.
      const row = mergeDualScope(modulePerms, m.id);
      if (row.edit) out[m.id] = ['read', 'write'];
      else if (row.view) out[m.id] = ['read'];
    });
    return out;
  };

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
    const rawCountry = data.countryCode ?? '';
    setCountryCode(rawCountry.toLowerCase() === 'us' ? 'usa' : rawCountry.toLowerCase());
    setEditStatus(data.status ?? 'active');
    setLoginEmail(data.loginEmail ?? data.email ?? '');
    loginEmailInitedRef.current = true;
    setTwoFAEnabled(sp.twoFactorAuth ?? true);

    // Pre-fill the Module Permissions grid from this member's saved data. Only
    // `custompermission` represents actual admin OVERRIDES — those module ids are
    // marked "touched" so the role-defaults refresh (fired once `selectedRoles` above
    // populates and the fetch effect runs) never clobbers them. `permissions.modules`
    // (the fully-resolved defaults+overrides set) is used only as an immediate-paint
    // fallback when no explicit override exists — left untouched, so it stays in sync
    // with role changes going forward.
    const overrides = data.custompermission ?? (sp as { custompermission?: Record<string, string[]> }).custompermission;
    const seed = overrides ?? data.permissions?.modules;
    if (seed && Object.keys(seed).length > 0) {
      const grid: PermGrid = {};
      Object.entries(seed).forEach(([moduleId, verbs]) => {
        const v = Array.isArray(verbs) ? verbs : [];
        const row = { view: v.includes('read') || v.includes('write'), edit: v.includes('write') };
        grid[moduleId] = row;
        // The backend only stores one grant per module — mirror it into the "all
        // centres" row too so re-opening a dual-scope module shows it already set.
        if (DUAL_SCOPE_IDS.has(moduleId)) grid[globalKey(moduleId)] = row;
      });
      setModulePerms(grid);
      if (overrides) {
        const touched = new Set<string>();
        Object.keys(overrides).forEach(id => {
          touched.add(id);
          if (DUAL_SCOPE_IDS.has(id)) touched.add(globalKey(id));
        });
        setTouchedModules(touched);
      }
    }
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
  // Country-scoped levels (e.g. Country Manager) pick a country instead of centres.
  const requiresCountry = isCountryScopedLevel(selectedAccessLevel);
  // For a country-scoped member, assignedCentres = every centre in the picked country
  // (matched case-insensitively) so the backend scopes them to those facilities.
  const countryCentreCodes = useMemo(
    () =>
      requiresCountry && countryCode
        ? centres.filter(c => (c.countryCode || '').toLowerCase() === countryCode.toLowerCase()).map(c => c.code)
        : [],
    [requiresCountry, countryCode, centres]
  );

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
    if (requiresCountry && !countryCode) return 'Select a country for country-scoped access';
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

    const customPermission = buildCustomPermission();
    setModulePermError(null);

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
          // Fall back to the member's own Assigned Centres selection (never the EDITING
          // admin's facility) on the rare chance the loaded record had no facilityCode.
          facilityCode: requiresCountry ? null : editFacilityCode || assignedCentres[0] || null,
          countryCode: requiresCountry ? countryCode : null,
          // Per-module overrides from the grid (only when the feature is active).
          ...(customPermission ? { custompermission: customPermission } : {}),
          status: editStatus,
          staffProfile: {
            employmentType: profile.employmentType,
            startDate: blankToNull(profile.startDate),
            highestQualification: blankToNull(resolvedQualification),
            certifications: buildSelectedCertificationIds(),
            additionalNotes: profile.notes,
            roles: buildSelectedRoleIds(),
            accessLevel,
            assignedCentres: requiresCountry ? countryCentreCodes : requiresAssignedCentres ? assignedCentres : [],
            documents: [...existingEntries, ...newDocEntries],
            twoFactorAuth: twoFAEnabled,
            twoFactorMethod: twoFAEnabled ? 'email' : '',
          },
          ...(profileImage ? { profileImageUrl: profileImage } : {}),
        })
      );

      if (updateStaff.fulfilled.match(action)) {
        // Refresh the cached list (scope-aware — see buildStaffListParams) so the edit
        // shows immediately on return, regardless of the viewer's own facility/country.
        dispatch(getStaffList(buildStaffListParams()));
        toast.success('Staff member updated');
        navigate(buildRoute.viewStaffMember(staffId), { replace: true });
      } else {
        toast.error((action.payload as string) ?? 'Failed to update staff member');
      }
      return;
    }

    // The new member's own facility is the centre actually assigned to them in this
    // wizard — NEVER the creating admin's own facility. The admin (especially a
    // superadmin) may have an unrelated or even meaningless facilityCode on their own
    // account; reusing it here silently mis-assigned every new facility-scoped staff
    // member to the CREATOR's facility instead of the one picked in Assigned Centres.
    const newMemberFacilityCode = requiresAssignedCentres ? (assignedCentres[0] ?? null) : null;

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
          assignedCentres: requiresCountry ? countryCentreCodes : requiresAssignedCentres ? assignedCentres : [],
          documents: newDocEntries,
          twoFactorAuth: twoFAEnabled,
          twoFactorMethod: twoFAEnabled ? 'email' : '',
        },
        loginEmail: (loginEmail || profile.email).trim(),
        defaultPassword,
        userType: buildSelectedRoleIds(),
        // Country-scoped → no facility, carry the country instead (empty assignedCentres).
        facilityCode: requiresCountry ? null : newMemberFacilityCode,
        countryCode: requiresCountry ? countryCode : null,
        // Per-module overrides from the grid (only when the feature is active).
        ...(customPermission ? { custompermission: customPermission } : {}),
        draftMode: draft,
        sendWelcomeEmail: draft ? false : sendWelcomeEmail,
      })
    );

    if (createStaff.fulfilled.match(action)) {
      // Refresh the cached list (scope-aware — see buildStaffListParams) so the new
      // member shows immediately, even when they're country-/global-scoped and the
      // viewer's own facility/country wouldn't otherwise include them.
      await dispatch(getStaffList(buildStaffListParams()));
      // Response shape isn't strictly typed here (see staff/api.ts) — check both the
      // nested `data` envelope and the top level so an older cached response (with
      // neither) degrades to the plain success toast instead of crashing.
      const payload = action.payload as
        | { data?: { welcomeEmailStatus?: string }; welcomeEmailStatus?: string }
        | undefined;
      const welcomeEmailStatus = payload?.data?.welcomeEmailStatus ?? payload?.welcomeEmailStatus;
      const targetEmail = (loginEmail || profile.email).trim();
      if (draft) {
        toast.success('Saved as draft');
      } else if (welcomeEmailStatus === 'sent') {
        toast.success(`Staff member created. Welcome email with login credentials sent to ${targetEmail}`);
      } else if (welcomeEmailStatus === 'skipped_no_email') {
        toast('Staff member created. Welcome email could not be sent — no email address on file', { icon: '⚠️' });
      } else if (welcomeEmailStatus === 'failed') {
        toast('Staff member created, but welcome email failed to send. You can resend from the staff profile.', {
          icon: '⚠️',
        });
      } else {
        toast.success('Staff member created');
      }
      navigate(ROUTES.STAFF_MANAGEMENT.path);
    } else {
      const msg = (action.payload as string) ?? 'Failed to create staff member';
      toast.error(msg);
      // Surface a module/permission-related 400 next to the grid, and jump to that
      // step so the admin sees the backend's exact message.
      if (modulePermMenus?.length && /module|permission/i.test(msg)) {
        setModulePermError(msg);
        setActiveStep('roleAccess');
      }
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
              countryCode={countryCode}
              creatingAccessLevel={creatingAccessLevel}
              creatingRole={creatingRole}
              isConfigLoading={isConfigLoading}
              modulePermissionDefaults={defaultsGrid}
              modulePermissionError={modulePermError}
              modulePermissionMenus={modulePermMenus}
              modulePermissions={modulePerms}
              modulePermissionsLoading={isRoleDefaultsLoading}
              roles={roles}
              selectedRoles={selectedRoles}
              showAssignedCentres={requiresAssignedCentres}
              showCountry={requiresCountry}
              onChangeCentres={setAssignedCentres}
              onChangeCountry={setCountryCode}
              onChangeModulePermissions={onChangeModulePermissions}
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
