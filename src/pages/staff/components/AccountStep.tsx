import React from 'react';

import { AccessLevelConfig, ProfileFormState, RoleConfig } from '../types';
import { INPUT_CLASS, LABEL_CLASS, validatePassword } from '../utils';

import PasswordField from './PasswordField';

interface AccountStepProps {
  isEditMode: boolean;
  loginEmail: string;
  onLoginEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  sendWelcomeEmail: boolean;
  onToggleWelcomeEmail: (value: boolean) => void;
  editStatus: string;
  onEditStatusChange: (value: string) => void;
  profile: ProfileFormState;
  selectedRoles: Record<string, boolean>;
  rolesConfig: RoleConfig[];
  accessLevel: string | null;
  accessLevelsConfig: AccessLevelConfig[];
}

const AccountStep: React.FC<AccountStepProps> = ({
  isEditMode,
  loginEmail,
  onLoginEmailChange,
  password,
  onPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  sendWelcomeEmail,
  onToggleWelcomeEmail,
  editStatus,
  onEditStatusChange,
  profile,
  selectedRoles,
  rolesConfig,
  accessLevel,
  accessLevelsConfig,
}) => {
  const passwordError = password ? validatePassword(password) : null;
  const passwordMismatch = Boolean(confirmPassword && password && confirmPassword !== password);

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">Login Credentials</p>
        <div className="space-y-4">
          <div>
            <label className={LABEL_CLASS} htmlFor="login-email">
              Login Email *
            </label>
            <input
              className={INPUT_CLASS}
              id="login-email"
              placeholder="Auto-filled from profile email — editable"
              type="email"
              value={loginEmail}
              onChange={e => onLoginEmailChange(e.target.value)}
            />
          </div>
          {!isEditMode && (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <PasswordField
                  id="default-password"
                  label="Default Password *"
                  value={password}
                  onChange={onPasswordChange}
                />
                <PasswordField
                  id="confirm-password"
                  label="Confirm Password *"
                  value={confirmPassword}
                  onChange={onConfirmPasswordChange}
                />
              </div>
              <p className="text-[11px] leading-relaxed text-gray-500">
                Staff member will be prompted to change this password on first login. Password must be min 8 characters
                with at least one uppercase, one number, and one special character.
              </p>
              {passwordError && <p className="text-[11px] font-medium text-red-500">{passwordError}</p>}
              {passwordMismatch && <p className="text-[11px] font-medium text-red-500">Passwords do not match.</p>}
            </>
          )}
        </div>
      </div>

      {!isEditMode && (
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">Invite Email</p>
          <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-3">
            <input
              checked={sendWelcomeEmail}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              id="send-welcome-email"
              type="checkbox"
              onChange={e => onToggleWelcomeEmail(e.target.checked)}
            />
            <label className="flex-1 cursor-pointer" htmlFor="send-welcome-email">
              <span className="block text-[13px] font-bold text-[#21295A]">
                Send welcome email with login instructions
              </span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-gray-500">
                Staff member will receive an email with their login credentials, a link to download the Century Cricket
                Staff App, and a prompt to set up 2FA.
              </span>
            </label>
          </div>
        </div>
      )}

      {isEditMode && (
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">Account Status</p>
          <select className={INPUT_CLASS} value={editStatus} onChange={e => onEditStatusChange(e.target.value)}>
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
                ? rolesConfig
                    .filter(r => selectedRoles[r.id])
                    .map(r => r.label)
                    .join(', ')
                : 'None selected'}
            </span>
          </p>
          <p className="text-gray-600">
            Access:{' '}
            <span className="font-semibold text-[#21295A]">
              {accessLevel ? accessLevelsConfig.find(a => a.id === accessLevel)?.label : 'None selected'}
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
            <span className="font-bold">Save as Draft</span> — Saves all entered details now. No account is created and
            no email is sent. You can return and complete the profile at any time. Profile will show as <em>Draft</em>{' '}
            in the staff list.
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-amber-900">
            <span className="font-bold">Save &amp; Share</span> — Creates the staff account, generates login
            credentials, and sends the welcome email with OTP 2FA setup instructions. Profile status becomes{' '}
            <em>Invited</em>.
          </p>
        </div>
      )}
    </div>
  );
};

export default AccountStep;
