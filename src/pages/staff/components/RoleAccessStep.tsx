import React from 'react';

import { AccessLevelConfig, RoleConfig } from '../types';

import AccessLevelCard from './AccessLevelCard';
import RoleCard from './RoleCard';

interface RoleAccessStepProps {
  roles: RoleConfig[];
  selectedRoles: Record<string, boolean>;
  onToggleRole: (id: string) => void;
  accessLevels: AccessLevelConfig[];
  accessLevel: string | null;
  onSelectAccessLevel: (id: string) => void;
  isConfigLoading: boolean;
  configError: string | null;
}

const RoleAccessStep: React.FC<RoleAccessStepProps> = ({
  roles,
  selectedRoles,
  onToggleRole,
  accessLevels,
  accessLevel,
  onSelectAccessLevel,
  isConfigLoading,
  configError,
}) => {
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
    </div>
  );
};

export default RoleAccessStep;
