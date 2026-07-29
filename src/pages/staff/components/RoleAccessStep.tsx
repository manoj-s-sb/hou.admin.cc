import React, { useMemo, useState } from 'react';

import { countryFlag } from '../../centres/constants';
import { AccessLevelConfig, MenuMasterItem, RoleConfig } from '../types';
import { INPUT_CLASS } from '../utils';

import AccessLevelCard from './AccessLevelCard';
import ModulePermissionsSection, { type PermGrid } from './ModulePermissionsSection';
import RoleCard from './RoleCard';

/** Minimal centre shape needed for the picker (FacilitySummary satisfies this). */
interface AssignableCentre {
  code: string;
  name: string;
  countryCode: string;
  stateCode?: string;
  cityCode?: string;
}

interface RoleAccessStepProps {
  roles: RoleConfig[];
  selectedRoles: Record<string, boolean>;
  onToggleRole: (id: string) => void;
  accessLevels: AccessLevelConfig[];
  accessLevel: string | null;
  onSelectAccessLevel: (id: string) => void;
  isConfigLoading: boolean;
  configError: string | null;
  // Assigned Centres (shown for centre-scoped access levels)
  centres: AssignableCentre[];
  assignedCentres: string[];
  onChangeCentres: (next: string[]) => void;
  centresLoading: boolean;
  showAssignedCentres: boolean;
  // Country picker (shown for country/region-scoped access levels instead of centres).
  showCountry: boolean;
  countryCode: string;
  onChangeCountry: (code: string) => void;
  /** Create a new role (persisted to the DB) and auto-select it. Resolves to true on success. */
  onCreateRole?: (label: string, description: string) => Promise<boolean>;
  /** True while a new role is being persisted. */
  creatingRole?: boolean;
  /** Create a new access level (persisted to the DB) and auto-select it. Resolves to true on success. */
  onCreateAccessLevel?: (label: string, description: string, scopeType: 'facility' | 'global') => Promise<boolean>;
  /** True while a new access level is being persisted. */
  creatingAccessLevel?: boolean;
  // Module Permissions grid — rendered only when the backend supplies the master
  // menu list (extended staff config). Absent → section hidden (non-breaking).
  modulePermissionMenus?: MenuMasterItem[];
  modulePermissions?: PermGrid;
  onChangeModulePermissions?: (next: PermGrid) => void;
  modulePermissionError?: string | null;
  /** Last-fetched role-defaults grid — drives the "customized" row indicator. */
  modulePermissionDefaults?: PermGrid;
  /** True while a role-defaults refetch (role selection just changed) is in flight. */
  modulePermissionsLoading?: boolean;
}

// "🇺🇸 Houston, TX" — flag + name + state/city, mirroring the design.
const centreLabel = (c: AssignableCentre): string => {
  const place = [c.name, c.stateCode || c.cityCode].filter(Boolean).join(', ');
  return `${countryFlag(c.countryCode)} ${place || c.code}`;
};

const RoleAccessStep: React.FC<RoleAccessStepProps> = ({
  roles,
  selectedRoles,
  onToggleRole,
  accessLevels,
  accessLevel,
  onSelectAccessLevel,
  isConfigLoading,
  configError,
  centres,
  assignedCentres,
  onChangeCentres,
  centresLoading,
  showAssignedCentres,
  showCountry,
  countryCode,
  onChangeCountry,
  onCreateRole,
  creatingRole = false,
  onCreateAccessLevel,
  creatingAccessLevel = false,
  modulePermissionMenus,
  modulePermissions,
  onChangeModulePermissions,
  modulePermissionError,
  modulePermissionDefaults,
  modulePermissionsLoading,
}) => {
  const [showOther, setShowOther] = useState(false);
  const [otherInput, setOtherInput] = useState('');
  // New-role inline form state.
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  // New access-level inline form state.
  const [showNewLevel, setShowNewLevel] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelDesc, setNewLevelDesc] = useState('');
  const [newLevelScope, setNewLevelScope] = useState<'facility' | 'global'>('facility');

  const submitNewRole = async () => {
    const name = newRoleName.trim();
    if (!name || !onCreateRole) return;
    const ok = await onCreateRole(name, newRoleDesc.trim());
    if (ok) {
      setNewRoleName('');
      setNewRoleDesc('');
      setShowNewRole(false);
    }
  };

  const submitNewLevel = async () => {
    const name = newLevelName.trim();
    if (!name || !onCreateAccessLevel) return;
    const ok = await onCreateAccessLevel(name, newLevelDesc.trim(), newLevelScope);
    if (ok) {
      setNewLevelName('');
      setNewLevelDesc('');
      setNewLevelScope('facility');
      setShowNewLevel(false);
    }
  };

  const knownCodes = useMemo(() => new Set(centres.map(c => c.code)), [centres]);
  const customEntries = useMemo(() => assignedCentres.filter(c => !knownCodes.has(c)), [assignedCentres, knownCodes]);
  const otherOpen = showOther || customEntries.length > 0;
  // Country options are the distinct country codes across the (scope-filtered) centres,
  // so the value we send always matches the codes facilities/scope use — no hardcoding.
  // Deduped case-insensitively (data has mixed case, e.g. "USA" vs "usa") and emitted
  // lowercase to match the RBAC scope's country codes.
  // Normalise country codes before deduping: "us" → "usa" to avoid duplicate entries
  // when the backend uses mixed codes across centres.
  const normaliseCountry = (code: string) => {
    const c = code.toLowerCase();
    if (c === 'us') return 'usa';
    return c;
  };
  const countryOptions = useMemo(
    () => Array.from(new Set(centres.map(c => normaliseCountry(c.countryCode || '')).filter(Boolean))),
    [centres]
  );

  const toggleOne = (code: string) =>
    onChangeCentres(
      assignedCentres.includes(code) ? assignedCentres.filter(c => c !== code) : [...assignedCentres, code]
    );

  const addOther = () => {
    const v = otherInput.trim();
    if (!v) return;
    if (!assignedCentres.includes(v)) onChangeCentres([...assignedCentres, v]);
    setOtherInput('');
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">Primary Roles</p>
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
          <p className="mb-2 px-2 text-[12px] text-gray-600">
            A staff member can hold <span className="font-semibold text-gray-800">multiple roles</span>. Select all that
            apply.
          </p>
          {isConfigLoading ? (
            <p className="px-2 text-[12px] text-gray-400">Loading roles…</p>
          ) : configError ? (
            <p className="px-2 text-[12px] text-red-500">{configError}</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {roles.map(role => (
                <RoleCard
                  key={role.id}
                  role={role}
                  selected={!!selectedRoles[role.id]}
                  onToggle={() => onToggleRole(role.id)}
                />
              ))}
            </div>
          )}

          {/* Create a brand-new role (persisted to the DB) when none of the above fit. */}
          {onCreateRole && !isConfigLoading && !configError && (
            <div className="mt-2 px-1">
              {!showNewRole ? (
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-[12.5px] font-semibold text-gray-600 transition hover:border-[#21295A] hover:text-[#21295A]"
                  type="button"
                  onClick={() => setShowNewRole(true)}
                >
                  <span className="text-[15px] leading-none">＋</span> Create new role
                </button>
              ) : (
                <div className="rounded-lg border border-[#21295A]/30 bg-white p-3">
                  <p className="mb-2 text-[12px] font-semibold text-gray-700">New role</p>
                  <div className="space-y-2">
                    <input
                      className={INPUT_CLASS}
                      placeholder="Role name (e.g. Physiotherapist)"
                      value={newRoleName}
                      onChange={e => setNewRoleName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void submitNewRole();
                        }
                      }}
                    />
                    <input
                      className={INPUT_CLASS}
                      placeholder="Short description (optional)"
                      value={newRoleDesc}
                      onChange={e => setNewRoleDesc(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void submitNewRole();
                        }
                      }}
                    />
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12.5px] font-semibold text-gray-600 transition hover:bg-gray-50"
                      type="button"
                      onClick={() => {
                        setShowNewRole(false);
                        setNewRoleName('');
                        setNewRoleDesc('');
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="rounded-lg bg-[#21295A] px-4 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-[#2c3670] disabled:opacity-40"
                      disabled={!newRoleName.trim() || creatingRole}
                      type="button"
                      onClick={() => void submitNewRole()}
                    >
                      {creatingRole ? 'Creating…' : 'Create & select'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">Access Level</p>
        {isConfigLoading ? (
          <p className="text-[12px] text-gray-400">Loading access levels…</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {accessLevels.map(level => (
              <AccessLevelCard
                key={level.id}
                level={level}
                selected={accessLevel === level.id}
                onSelect={() => onSelectAccessLevel(level.id)}
              />
            ))}
          </div>
        )}

        {/* Create a brand-new access level (persisted to the DB) when none of the above fit. */}
        {onCreateAccessLevel && !isConfigLoading && (
          <div className="mt-2">
            {!showNewLevel ? (
              <button
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-[12.5px] font-semibold text-gray-600 transition hover:border-[#21295A] hover:text-[#21295A]"
                type="button"
                onClick={() => setShowNewLevel(true)}
              >
                <span className="text-[15px] leading-none">＋</span> Create new access level
              </button>
            ) : (
              <div className="rounded-lg border border-[#21295A]/30 bg-white p-3">
                <p className="mb-2 text-[12px] font-semibold text-gray-700">New access level</p>
                <div className="space-y-2">
                  <input
                    className={INPUT_CLASS}
                    placeholder="Access level name (e.g. Regional Manager)"
                    value={newLevelName}
                    onChange={e => setNewLevelName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void submitNewLevel();
                      }
                    }}
                  />
                  <input
                    className={INPUT_CLASS}
                    placeholder="Short description (optional)"
                    value={newLevelDesc}
                    onChange={e => setNewLevelDesc(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void submitNewLevel();
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      className={`flex-1 rounded-lg border px-3 py-2 text-[12.5px] font-semibold transition ${
                        newLevelScope === 'facility'
                          ? 'border-[#21295A] bg-[#21295A]/5 text-[#21295A]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                      type="button"
                      onClick={() => setNewLevelScope('facility')}
                    >
                      Centre-scoped
                    </button>
                    <button
                      className={`flex-1 rounded-lg border px-3 py-2 text-[12.5px] font-semibold transition ${
                        newLevelScope === 'global'
                          ? 'border-[#21295A] bg-[#21295A]/5 text-[#21295A]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                      type="button"
                      onClick={() => setNewLevelScope('global')}
                    >
                      All centres
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12.5px] font-semibold text-gray-600 transition hover:bg-gray-50"
                    type="button"
                    onClick={() => {
                      setShowNewLevel(false);
                      setNewLevelName('');
                      setNewLevelDesc('');
                      setNewLevelScope('facility');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-lg bg-[#21295A] px-4 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-[#2c3670] disabled:opacity-40"
                    disabled={!newLevelName.trim() || creatingAccessLevel}
                    type="button"
                    onClick={() => void submitNewLevel()}
                  >
                    {creatingAccessLevel ? 'Creating…' : 'Create & select'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Country — only for country/region-scoped access levels (e.g. Country Manager). */}
      {showCountry && (
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
            Country <span className="text-red-500">*</span>
          </p>
          <select
            className="w-full max-w-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
            value={countryCode}
            onChange={e => onChangeCountry(e.target.value)}
          >
            <option value="">Select a country…</option>
            {countryOptions.map(code => (
              <option key={code} value={code}>
                {countryFlag(code)} {code.toUpperCase()}
              </option>
            ))}
          </select>
          <p className="mt-2 text-[11.5px] text-gray-400">
            This role manages every centre in the selected country — no individual centre assignment.
          </p>
        </div>
      )}

      {/* Assigned Centres — only for centre-scoped access levels (Facility Only / Admin). */}
      {showAssignedCentres && (
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
            Assigned Centres <span className="text-red-500">*</span>
            {assignedCentres.length > 0 && (
              <span className="ml-2 text-gray-400">· {assignedCentres.length} selected</span>
            )}
          </p>
          {centresLoading ? (
            <p className="text-[12px] text-gray-400">Loading centres…</p>
          ) : (
            <>
              {centres.length === 0 && (
                <p className="mb-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-700">
                  No centres found in Centre Management. Create a centre there, or add one manually with “Other centre”.
                </p>
              )}
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {centres.map(centre => {
                  const checked = assignedCentres.includes(centre.code);
                  return (
                    <label
                      key={centre.code}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] transition ${
                        checked
                          ? 'border-[#21295A] bg-[#21295A]/5 font-semibold text-[#21295A]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <input
                        checked={checked}
                        className="h-4 w-4 accent-[#21295A]"
                        type="checkbox"
                        onChange={() => toggleOne(centre.code)}
                      />
                      <span>{centreLabel(centre)}</span>
                    </label>
                  );
                })}

                {/* Other — assign a centre that isn't listed above. */}
                <button
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[13px] transition ${
                    otherOpen
                      ? 'border-[#21295A] bg-[#21295A]/5 font-semibold text-[#21295A]'
                      : 'border-dashed border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                  type="button"
                  onClick={() => setShowOther(o => !o)}
                >
                  <span className="text-[15px] leading-none">＋</span> Other centre
                </button>
              </div>

              {otherOpen && (
                <div className="mt-2">
                  <div className="flex gap-2">
                    <input
                      className={INPUT_CLASS}
                      placeholder="Centre code or name not listed above"
                      value={otherInput}
                      onChange={e => setOtherInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addOther();
                        }
                      }}
                    />
                    <button
                      className="shrink-0 rounded-lg bg-[#21295A] px-4 text-[13px] font-semibold text-white transition hover:bg-[#2c3670] disabled:opacity-40"
                      disabled={!otherInput.trim()}
                      type="button"
                      onClick={addOther}
                    >
                      Add
                    </button>
                  </div>
                  {customEntries.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {customEntries.map(v => (
                        <span
                          key={v}
                          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-[12px] font-medium text-gray-700"
                        >
                          {v}
                          <button
                            aria-label={`Remove ${v}`}
                            className="text-[14px] leading-none text-gray-400 transition hover:text-gray-700"
                            type="button"
                            onClick={() => onChangeCentres(assignedCentres.filter(x => x !== v))}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Module Permissions — directly below Assigned Centres. Renders only when the
          backend supplies the master menu list, so it's invisible (and harmless)
          until the extended staff config is live. */}
      {modulePermissionMenus && modulePermissionMenus.length > 0 && modulePermissions && onChangeModulePermissions && (
        <ModulePermissionsSection
          // Country/global-scoped levels carry no per-centre assignment — treat as
          // centreless (0), which shows the "all centres" row same as a multi-centre member.
          centreCount={showCountry ? 0 : assignedCentres.length}
          defaults={modulePermissionDefaults}
          error={modulePermissionError}
          loadingDefaults={modulePermissionsLoading}
          menus={modulePermissionMenus}
          value={modulePermissions}
          onChange={onChangeModulePermissions}
        />
      )}
    </div>
  );
};

export default RoleAccessStep;
