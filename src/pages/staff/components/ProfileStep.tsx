import React from 'react';

import { COUNTRIES, COUNTRY_DIAL_CODES } from '../../centres/constants';
import { ConfigOption, OTHER_QUALIFICATION, ProfileFormState } from '../types';
import { dialCodeOf, getConfigOtherQualificationId, INPUT_CLASS, LABEL_CLASS, stripDialCode } from '../utils';

import ProfilePhotoUploader from './ProfilePhotoUploader';

interface ProfileStepProps {
  profile: ProfileFormState;
  onChange: <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => void;
  profileImage: string;
  existingPhotoUrl: string;
  onPhotoSelect: (file: File | null) => void;
  onPhotoRemove: () => void;
  qualifications: ConfigOption[];
  certifications: ConfigOption[];
  isConfigLoading: boolean;
  configError: string | null;
  onToggleCertification: (id: string) => void;
  /** True once the admin has tried to leave this step with a required field
   * still blank — turns on the red borders/inline messages below. */
  showErrors?: boolean;
}

const ERROR_INPUT_CLASS = `${INPUT_CLASS} border-red-400 focus:border-red-400 focus:ring-red-100`;
const ERROR_TEXT_CLASS = 'mt-1 text-[11px] font-medium text-red-500';

const ProfileStep: React.FC<ProfileStepProps> = ({
  profile,
  onChange,
  profileImage,
  existingPhotoUrl,
  onPhotoSelect,
  onPhotoRemove,
  qualifications,
  certifications,
  isConfigLoading,
  configError,
  onToggleCertification,
  showErrors,
}) => {
  // Use the backend's "Other" option if it exists; otherwise fall back to a
  // synthetic one. Either way, only one "Other" entry is shown.
  const configOtherId = getConfigOtherQualificationId(qualifications);
  const otherId = configOtherId ?? OTHER_QUALIFICATION;
  const isOtherSelected = profile.highestQualification === otherId;

  const firstNameInvalid = !!showErrors && !profile.firstName.trim();
  const lastNameInvalid = !!showErrors && !profile.lastName.trim();
  const emailInvalid = !!showErrors && !profile.email.trim();
  const dobInvalid = !!showErrors && !profile.dob.trim();

  return (
    <div className="space-y-6">
      <ProfilePhotoUploader
        existingUrl={existingPhotoUrl}
        imageDataUrl={profileImage}
        onRemove={onPhotoRemove}
        onSelect={onPhotoSelect}
      />

      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">Personal Details</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={LABEL_CLASS} htmlFor="first-name">
              First Name *
            </label>
            <input
              className={firstNameInvalid ? ERROR_INPUT_CLASS : INPUT_CLASS}
              id="first-name"
              placeholder="e.g. James"
              type="text"
              value={profile.firstName}
              onChange={e => onChange('firstName', e.target.value)}
            />
            {firstNameInvalid && <p className={ERROR_TEXT_CLASS}>First name is required</p>}
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="last-name">
              Last Name *
            </label>
            <input
              className={lastNameInvalid ? ERROR_INPUT_CLASS : INPUT_CLASS}
              id="last-name"
              placeholder="e.g. Thornton"
              type="text"
              value={profile.lastName}
              onChange={e => onChange('lastName', e.target.value)}
            />
            {lastNameInvalid && <p className={ERROR_TEXT_CLASS}>Last name is required</p>}
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="email">
              Email Address *
            </label>
            <input
              className={emailInvalid ? ERROR_INPUT_CLASS : INPUT_CLASS}
              id="email"
              placeholder="james@example.com"
              type="email"
              value={profile.email}
              onChange={e => onChange('email', e.target.value)}
            />
            {emailInvalid && <p className={ERROR_TEXT_CLASS}>Email is required</p>}
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="phone">
              Phone Number
            </label>
            <div className="flex gap-2">
              <select
                aria-label="Country code"
                className={INPUT_CLASS}
                style={{ flex: '0 0 92px', paddingLeft: 8, paddingRight: 4 }}
                value={dialCodeOf(profile.phone)}
                onChange={e => onChange('phone', `${e.target.value} ${stripDialCode(profile.phone)}`.trim())}
              >
                <option value="">Code</option>
                {COUNTRIES.map(c => (
                  <option key={c.code} value={COUNTRY_DIAL_CODES[c.code]}>
                    {COUNTRY_DIAL_CODES[c.code]} {c.code}
                  </option>
                ))}
              </select>
              <input
                className={INPUT_CLASS}
                id="phone"
                inputMode="tel"
                placeholder="555 000 0000"
                style={{ flex: '1 1 auto' }}
                type="tel"
                value={stripDialCode(profile.phone)}
                onChange={e => {
                  // Digits + spaces/hyphens/parens for formatting — no letters.
                  const cleaned = e.target.value.replace(/[^\d\s\-()]/g, '');
                  onChange('phone', `${dialCodeOf(profile.phone)} ${cleaned}`.trim());
                }}
              />
            </div>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="dob">
              Date of Birth *
            </label>
            <input
              className={dobInvalid ? ERROR_INPUT_CLASS : INPUT_CLASS}
              id="dob"
              type="date"
              value={profile.dob}
              onChange={e => onChange('dob', e.target.value)}
            />
            {dobInvalid && <p className={ERROR_TEXT_CLASS}>Date of birth is required</p>}
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="gender">
              Gender
            </label>
            <select
              className={INPUT_CLASS}
              id="gender"
              value={profile.gender}
              onChange={e => onChange('gender', e.target.value)}
            >
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="employment-type">
              Employment Type
            </label>
            <select
              className={INPUT_CLASS}
              id="employment-type"
              value={profile.employmentType}
              onChange={e => onChange('employmentType', e.target.value)}
            >
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Casual">Casual</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="start-date">
              Start Date
            </label>
            <input
              className={INPUT_CLASS}
              id="start-date"
              type="date"
              value={profile.startDate}
              onChange={e => onChange('startDate', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          Qualifications & Experience
        </p>
        <div className="space-y-4">
          <div>
            <label className={LABEL_CLASS} htmlFor="highest-qualification">
              Highest Qualification
            </label>
            <select
              className={INPUT_CLASS}
              disabled={isConfigLoading}
              id="highest-qualification"
              value={profile.highestQualification}
              onChange={e => onChange('highestQualification', e.target.value)}
            >
              <option value="">{isConfigLoading ? 'Loading…' : 'Select…'}</option>
              {qualifications.map(q => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
              {!configOtherId && <option value={OTHER_QUALIFICATION}>Other (specify below)</option>}
            </select>
            {isOtherSelected && (
              <input
                className={`${INPUT_CLASS} mt-2`}
                id="highest-qualification-other"
                placeholder="Enter qualification name"
                type="text"
                value={profile.highestQualificationOther}
                onChange={e => onChange('highestQualificationOther', e.target.value)}
              />
            )}
          </div>

          <div>
            <p className={LABEL_CLASS}>Cricket / Coaching Certifications</p>
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
                      onChange={() => onToggleCertification(cert.id)}
                    />
                    <span>{cert.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="notes">
              Additional Notes / Specialisations
            </label>
            <textarea
              className={`${INPUT_CLASS} min-h-[88px] resize-y`}
              id="notes"
              placeholder="e.g. Specialises in batting technique, youth coaching experience…"
              value={profile.notes}
              onChange={e => onChange('notes', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileStep;
