import React, { useEffect, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

import LoaderComponent from '../../components/Loader';
import { buildRoute, ROUTES } from '../../constants/routes';
import { getStaffDetails, setStaffStatus } from '../../store/staff/api';
import { clearStaffDetails } from '../../store/staff/reducers';

import { StaffDocument } from './types';
import { useCentreLookup } from './useCentreLookup';

import type { AppDispatch, RootState } from '../../store/store';

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  coach: 'Coach',
  staff: 'Staff',
  manager: 'Manager',
};

const formatRoleLabel = (role: string): string =>
  ROLE_LABEL[role.toLowerCase()] ?? role.charAt(0).toUpperCase() + role.slice(1);

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildInitials = (firstName: string, lastName: string, email: string): string => {
  const source = `${firstName ?? ''} ${lastName ?? ''}`.trim() || email || '?';
  return (
    source
      .split(/\s+|@|\./)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || '?'
  );
};

const statusToneClass: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  invited: { label: 'Invited', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  draft: { label: 'Draft', className: 'bg-red-50 text-red-600 border-red-200' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700 border-gray-200' },
};

const normalizeStatus = (status: string): keyof typeof statusToneClass => {
  const v = status?.toLowerCase();
  if (v === 'invited') return 'invited';
  if (v === 'draft') return 'draft';
  // Treat legacy 'suspended' the same as 'inactive'.
  if (v === 'inactive' || v === 'suspended') return 'inactive';
  return 'active';
};

const DOC_TYPE_LABELS: Record<string, string> = {
  govid: 'Government ID',
  wwcc: 'Working with Children Check',
  policecheck: 'Police Check',
  firstaid: 'First Aid Certification',
  coachingcert: 'Coaching Certification',
};

const formatDocumentLabel = (doc: StaffDocument): string =>
  doc.type ? (DOC_TYPE_LABELS[doc.type.toLowerCase()] ?? doc.type) : (doc.fileName ?? 'Document');

const getDocumentSource = (doc: StaffDocument): string => doc.sasUrl || doc.dataUrl || '';

const guessMimeType = (doc: StaffDocument): string => {
  if (doc.mimeType) return doc.mimeType;
  const src = getDocumentSource(doc) || doc.fileName || '';
  const dataMatch = /^data:([^;]+);/i.exec(src);
  if (dataMatch) return dataMatch[1];
  const ext = (doc.fileName || src).split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  if (ext === 'pdf') return 'application/pdf';
  return '';
};

const ViewStaffMember: React.FC = () => {
  const navigate = useNavigate();
  const { staffId } = useParams<{ staffId: string }>();

  const dispatch = useDispatch<AppDispatch>();
  const {
    staffDetails: staff,
    isDetailsLoading: isLoading,
    detailsError,
  } = useSelector((state: RootState) => state.staff);
  const [previewDoc, setPreviewDoc] = useState<StaffDocument | null>(null);
  const [isSuspending, setIsSuspending] = useState<boolean>(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
  const centreLookup = useCentreLookup();

  const error = !staffId ? 'Missing staff id' : detailsError;

  useEffect(() => {
    if (staffId) dispatch(getStaffDetails({ staffId }));
    return () => {
      dispatch(clearStaffDetails());
    };
  }, [staffId, dispatch]);

  const goBack = () => navigate(ROUTES.STAFF_MANAGEMENT.path);
  const goEdit = () => {
    if (staffId) navigate(buildRoute.editStaffMember(staffId));
  };

  const handleSuspend = async () => {
    if (!staff || !staffId) return;
    const v = staff.status?.toLowerCase();
    const isCurrentlyInactive = v === 'inactive' || v === 'suspended';
    // Backend's deactivated value is 'suspended' (shown as "Inactive" in the UI).
    const nextStatus: 'active' | 'suspended' = isCurrentlyInactive ? 'active' : 'suspended';
    const verb = isCurrentlyInactive ? 'reactivate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${verb} ${staff.firstName} ${staff.lastName}?`)) return;

    setIsSuspending(true);
    const action = await dispatch(setStaffStatus({ staffId, status: nextStatus }));

    if (setStaffStatus.fulfilled.match(action)) {
      await dispatch(getStaffDetails({ staffId }));
      toast.success(isCurrentlyInactive ? 'Staff member reactivated' : 'Staff member suspended');
    } else {
      toast.error((action.payload as string) ?? `Failed to ${verb} staff member`);
    }
    setIsSuspending(false);
  };

  if (isLoading) {
    return <LoaderComponent size="lg" variant="page" />;
  }

  if (error || !staff) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-[14px] font-semibold text-gray-600">{error ?? 'Staff member not found'}</p>
          <button
            className="mt-3 text-[13px] font-semibold text-[#21295A] hover:underline"
            type="button"
            onClick={goBack}
          >
            Back to Staff Management
          </button>
        </div>
      </div>
    );
  }

  const profile = staff.staffProfile ?? {};
  const fullName = `${staff.firstName ?? ''} ${staff.lastName ?? ''}`.trim() || staff.email;
  const initials = buildInitials(staff.firstName, staff.lastName, staff.email);
  const statusKey = normalizeStatus(staff.status);
  const status = statusToneClass[statusKey];
  const rolesSource = profile.roles && profile.roles.length > 0 ? profile.roles : (staff.userType ?? []);
  const roles = rolesSource.map(formatRoleLabel);
  const centres = centreLookup.text(profile.assignedCentres, staff.facilityCode);
  const facilityName = centreLookup.text(null, staff.facilityCode);
  const documents = profile.documents ?? [];
  const photoUrl = profile.photoSasUrl;

  const InfoCard: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-[13px] font-semibold text-[#21295A]">{value}</p>
    </div>
  );

  return (
    <div className="w-full">
      {/* Page header */}
      <div className="mb-4">
        <button
          className="mb-2 inline-flex items-center gap-1 text-[12px] font-semibold text-gray-500 transition hover:text-[#21295A]"
          type="button"
          onClick={goBack}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
          Back to Staff Management
        </button>
        <h1 className="text-[20px] font-bold tracking-tight text-[#21295A]">Staff Profile</h1>
        <p className="mt-1 text-[12px] font-medium text-gray-500">
          View staff member details, roles, access, and account status.
        </p>
      </div>

      <div className="space-y-4">
        {/* Profile Header */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-4 px-6 py-5">
            {photoUrl ? (
              <button
                aria-label="View profile photo"
                className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-indigo-100 p-0 transition hover:opacity-90"
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
              >
                <img alt={fullName} className="h-full w-full object-cover" src={photoUrl} />
              </button>
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-[18px] font-bold text-indigo-700">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[18px] font-bold text-[#21295A]">{fullName}</h2>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
                  {status.label}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-gray-500">{staff.email}</p>
              {roles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {roles.map(role => (
                    <span
                      key={role}
                      className="rounded-md bg-[#21295A]/10 px-2 py-0.5 text-[11px] font-semibold text-[#21295A]"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-700 transition hover:border-[#21295A]/30 hover:text-[#21295A]"
                type="button"
                onClick={goEdit}
              >
                Edit
              </button>
              <button
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                disabled={isSuspending}
                type="button"
                onClick={handleSuspend}
              >
                {isSuspending
                  ? 'Updating…'
                  : ['inactive', 'suspended'].includes(staff.status?.toLowerCase())
                    ? 'Reactivate'
                    : 'Suspend'}
              </button>
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Personal Details</p>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <InfoCard label="First Name" value={staff.firstName || '—'} />
              <InfoCard label="Last Name" value={staff.lastName || '—'} />
              <InfoCard label="Email" value={staff.email || '—'} />
              <InfoCard label="Phone" value={staff.phone || '—'} />
              <InfoCard label="Date of Birth" value={formatDate(staff.dateOfBirth)} />
              <InfoCard label="Gender" value={staff.gender || '—'} />
            </div>
          </div>
        </div>

        {/* Employment */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Employment &amp; Qualifications
            </p>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <InfoCard label="Employment Type" value={profile.employmentType || '—'} />
              <InfoCard label="Start Date" value={formatDate(profile.startDate)} />
              <InfoCard label="Highest Qualification" value={profile.highestQualification || '—'} />
              <InfoCard
                label="Certifications"
                value={
                  profile.certifications && profile.certifications.length > 0 ? profile.certifications.join(', ') : '—'
                }
              />
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 md:col-span-2 lg:col-span-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Additional Notes</p>
                <p className="text-[13px] text-[#21295A]">{profile.additionalNotes || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Role & Access */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Role &amp; Access</p>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <InfoCard
                label="Roles"
                value={
                  roles.length > 0 ? (
                    <span className="flex flex-wrap gap-1.5">
                      {roles.map(role => (
                        <span
                          key={role}
                          className="rounded-md bg-[#21295A]/10 px-2 py-0.5 text-[11px] font-semibold text-[#21295A]"
                        >
                          {role}
                        </span>
                      ))}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
              <InfoCard label="Access Level" value={profile.accessLevel || '—'} />
              <InfoCard label="Facility" value={facilityName} />
              <InfoCard label="Assigned Centres" value={centres} />
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Documents</p>
            <span className="text-[11px] font-semibold text-gray-500">{documents.length} uploaded</span>
          </div>
          <div className="px-6 py-4">
            {documents.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {documents.map((doc, idx) => {
                  const label = formatDocumentLabel(doc);
                  const hasSource = Boolean(getDocumentSource(doc));
                  return (
                    <button
                      key={`${doc.type ?? doc.fileName ?? 'doc'}-${idx}`}
                      className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-left transition hover:border-[#21295A]/30 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!hasSource}
                      type="button"
                      onClick={() => hasSource && setPreviewDoc(doc)}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#21295A]/10 text-[#21295A]">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                          />
                          <path
                            d="M14 2v6h6M9 13h6M9 17h6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                          />
                        </svg>
                      </span>
                      <span className="flex-1">
                        <span className="block text-[13px] font-semibold text-[#21295A]">{label}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-gray-500">
                          {doc.fileName || (hasSource ? 'Click to preview' : 'No file available')}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/40 px-4 py-6 text-center">
                <p className="text-[13px] font-semibold text-gray-600">No documents uploaded yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Account & Activity */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Account &amp; Activity</p>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <InfoCard label="Status" value={status.label} />
              <InfoCard label="Login Email" value={staff.loginEmail || staff.email} />
              <InfoCard label="Two-Factor Auth" value={profile.twoFactorAuth ? 'Enabled' : 'Disabled'} />
              <InfoCard label="Created" value={formatDate(staff.createdAt)} />
              <InfoCard label="Last Login" value={formatDateTime(staff.lastLoginAt)} />
              <InfoCard label="Staff ID" value={staff.staffId || '—'} />
            </div>
          </div>
        </div>
      </div>

      {previewDoc && <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}

      {isPhotoModalOpen && photoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          role="button"
          tabIndex={0}
          onClick={() => setIsPhotoModalOpen(false)}
          onKeyDown={e => {
            if (e.key === 'Escape') setIsPhotoModalOpen(false);
          }}
        >
          <div className="relative">
            <button
              aria-label="Close preview"
              className="absolute -right-2 -top-2 z-10 rounded-full bg-white p-2 shadow-lg transition-colors hover:bg-gray-100"
              type="button"
              onClick={() => setIsPhotoModalOpen(false)}
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
            </button>
            <div role="presentation" onClick={e => e.stopPropagation()}>
              <img
                alt={fullName}
                className="h-64 w-64 rounded-full border-4 border-white object-cover shadow-2xl sm:h-80 sm:w-80"
                src={photoUrl}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DocumentPreviewModal: React.FC<{ doc: StaffDocument; onClose: () => void }> = ({ doc, onClose }) => {
  const src = getDocumentSource(doc);
  const mime = guessMimeType(doc);
  const isImage = mime.startsWith('image/');
  const isPdf = mime === 'application/pdf';
  const label = formatDocumentLabel(doc);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="button"
      tabIndex={0}
      onClick={onClose}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        role="presentation"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold text-[#21295A]">{label}</p>
            {doc.fileName && <p className="truncate text-[11px] text-gray-500">{doc.fileName}</p>}
          </div>
          <div className="flex items-center gap-2">
            {src && (
              <a
                className="rounded-md border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-gray-700 transition hover:border-[#21295A]/30 hover:text-[#21295A]"
                download={doc.fileName ?? 'document'}
                href={src}
                rel="noreferrer"
                target="_blank"
              >
                Download
              </a>
            )}
            <button
              aria-label="Close preview"
              className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
              type="button"
              onClick={onClose}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-50 p-3">
          {!src ? (
            <p className="py-10 text-center text-[13px] text-gray-500">No file available to preview.</p>
          ) : isImage ? (
            <img alt={label} className="mx-auto max-h-[75vh] rounded-lg object-contain" src={src} />
          ) : isPdf ? (
            <iframe className="h-[75vh] w-full rounded-lg border border-gray-200" src={src} title={label} />
          ) : (
            <div className="py-10 text-center">
              <p className="text-[13px] font-semibold text-gray-700">Preview not available for this file type.</p>
              <a
                className="mt-3 inline-block rounded-md bg-[#21295A] px-3 py-1.5 text-[12px] font-semibold text-white"
                download={doc.fileName ?? 'document'}
                href={src}
                rel="noreferrer"
                target="_blank"
              >
                Download to view
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewStaffMember;
