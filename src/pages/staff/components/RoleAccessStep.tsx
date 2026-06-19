import React, { useMemo, useState } from 'react';

import { countryFlag } from '../../centres/constants';
import { AccessLevelConfig, RoleConfig } from '../types';
import { INPUT_CLASS } from '../utils';

import AccessLevelCard from './AccessLevelCard';
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
}) => {
  const [showOther, setShowOther] = useState(false);
  const [otherInput, setOtherInput] = useState('');

  const knownCodes = useMemo(() => new Set(centres.map(c => c.code)), [centres]);
  const customEntries = useMemo(() => assignedCentres.filter(c => !knownCodes.has(c)), [assignedCentres, knownCodes]);
  const otherOpen = showOther || customEntries.length > 0;

  const toggleOne = (code: string) =>
    onChangeCentres(assignedCentres.includes(code) ? assignedCentres.filter(c => c !== code) : [...assignedCentres, code]);

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
      </div>

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
    </div>
  );
};

export default RoleAccessStep;
