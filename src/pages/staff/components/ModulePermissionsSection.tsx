import React, { useState } from 'react';

import type { MenuMasterItem } from '../../../store/staff/types';

/** Grid state: module id → { view, edit }. Edit implies view. */
export type PermGrid = Record<string, { view: boolean; edit: boolean }>;

interface Props {
  menus: MenuMasterItem[];
  value: PermGrid;
  onChange: (next: PermGrid) => void;
  error?: string | null;
  /**
   * Number of centres this member is assigned to. Drives the dual-scope "all centres"
   * row: hidden when the member has exactly one centre (the centre-scope row already
   * covers them — a separate network-wide grant is redundant), shown for 0 (country/
   * global-scoped roles) or 2+ (genuinely spans multiple centres).
   */
  centreCount: number;
  /**
   * Last-fetched role-defaults grid (see getRoleDefaults). When given, a row whose
   * current view/edit state differs from its default gets a small "customized" dot —
   * purely visual, so the admin can see role-derived vs. person-specific at a glance.
   */
  defaults?: PermGrid;
  /** True while a role-defaults refetch (triggered by a role selection change) is in flight. */
  loadingDefaults?: boolean;
}

// Global top-level modules (no duplication of centre-sub modules here except the "all centres" ones).
const TOP_LEVEL_ORDER = [
  'membershipplans',
  'centremanagement', // accordion only — no own checkboxes
  'staffmanagement',
  'reports',
  'ticketsincidents', // "All centres" view
  'tailgate', // "All centres" view
  'maintenance', // "All centres" view
];

// Modules that appear in BOTH the centre sub-panel and the top-level "all centres" row.
// The two rows are DISTINCT grants — a member can see a module inside their own centre
// without seeing it network-wide, and vice versa — so each gets its own grid key (see
// `globalKey`). They're only merged back into one backend field (the module id) at
// submit time, in `mergeDualScope`, since the API has a single permission per module.
export const DUAL_SCOPE_IDS = new Set(['ticketsincidents', 'tailgate', 'maintenance']);

/** Distinct grid key for a dual-scope module's "all centres" row — never sent as-is. */
export const globalKey = (moduleId: string): string => `${moduleId}::global`;

/**
 * Collapses a dual-scope module's two rows (centre + global) into the single verb set
 * the backend understands for that module id — granted if EITHER row grants it. Call
 * this before turning the grid into a `custompermission` payload.
 */
export const mergeDualScope = (grid: PermGrid, moduleId: string): { view: boolean; edit: boolean } => {
  const centre = grid[moduleId] ?? { view: false, edit: false };
  if (!DUAL_SCOPE_IDS.has(moduleId)) return centre;
  const global = grid[globalKey(moduleId)] ?? { view: false, edit: false };
  return { view: centre.view || global.view, edit: centre.edit || global.edit };
};

const CENTRE_SUB_MODULE_ORDER = [
  'members',
  'slotbooking',
  'induction',
  'tour',
  'waitlistleads',
  'coachschedule',
  'ticketsincidents', // "Centre view"
  'tailgate', // "Centre view"
  'maintenance', // "Centre view"
  'facilities',
  'planspricing',
];

interface RowProps {
  label: string;
  moduleId: string;
  value: PermGrid;
  indent?: boolean;
  tag?: string; // optional scope tag e.g. "Centre" or "All centres"
  /** Current state differs from the last-fetched role default — shows a small dot. */
  customized?: boolean;
  onToggleView: (id: string) => void;
  onToggleEdit: (id: string) => void;
}

const ModuleRow: React.FC<RowProps> = ({
  label,
  moduleId,
  value,
  indent,
  tag,
  customized,
  onToggleView,
  onToggleEdit,
}) => {
  const row = value[moduleId] ?? { view: false, edit: false };
  const on = row.view || row.edit;
  return (
    <div
      className={`flex items-center gap-2 text-[13px] transition ${
        indent
          ? `px-3 py-2 ${on ? 'font-semibold text-[#21295A]' : 'text-gray-500'}`
          : `rounded-lg border px-3 py-2.5 ${on ? 'border-[#21295A] bg-[#21295A]/5 font-semibold text-[#21295A]' : 'border-gray-200 bg-white text-gray-600'}`
      }`}
    >
      <span className="flex flex-1 items-center gap-2 truncate">
        {label}
        {customized && (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
            title="Customized — differs from the role default"
          />
        )}
        {tag && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${
              tag === 'Centre' ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'
            }`}
          >
            {tag}
          </span>
        )}
      </span>
      <label className="flex w-14 cursor-pointer items-center justify-center">
        <input
          aria-label={`View ${label}`}
          checked={row.view}
          className="h-4 w-4 accent-[#21295A]"
          type="checkbox"
          onChange={() => onToggleView(moduleId)}
        />
      </label>
      <label className="flex w-14 cursor-pointer items-center justify-center">
        <input
          aria-label={`Edit ${label}`}
          checked={row.edit}
          className="h-4 w-4 accent-[#21295A]"
          type="checkbox"
          onChange={() => onToggleEdit(moduleId)}
        />
      </label>
    </div>
  );
};

const ModulePermissionsSection: React.FC<Props> = ({
  menus,
  value,
  onChange,
  error,
  centreCount,
  defaults,
  loadingDefaults,
}) => {
  const [open, setOpen] = useState(false);
  const [centreExpanded, setCentreExpanded] = useState(false);

  const isCustomized = (id: string): boolean => {
    if (!defaults) return false;
    const cur = value[id] ?? { view: false, edit: false };
    const def = defaults[id] ?? { view: false, edit: false };
    return cur.view !== def.view || cur.edit !== def.edit;
  };

  const byId = Object.fromEntries(menus.map(m => [m.id, m]));
  const grantedCount = menus.filter(m => value[m.id]?.view || value[m.id]?.edit).length;
  // Only genuinely multi-centre (or centre-less, i.e. country/global-scoped) members get
  // a separate "all centres" row for dual-scope modules — see the `centreCount` doc above.
  const showGlobalRow = centreCount !== 1;

  const setRow = (id: string, next: { view: boolean; edit: boolean }) => {
    onChange({ ...value, [id]: next });
  };

  const toggleView = (id: string) => {
    const cur = value[id] ?? { view: false, edit: false };
    const view = !cur.view;
    const next: PermGrid = { ...value, [id]: { view, edit: view ? cur.edit : false } };
    // Turning on a dual-scope module's Centre row for a multi-centre member also grants
    // the network-wide row by default — still independently uncheckable afterwards.
    if (view && DUAL_SCOPE_IDS.has(id) && showGlobalRow) {
      const gKey = globalKey(id);
      const gCur = value[gKey] ?? { view: false, edit: false };
      if (!gCur.view) next[gKey] = { ...gCur, view: true };
    }
    onChange(next);
    if (id === 'centremanagement' && view) setCentreExpanded(true);
  };

  const toggleEdit = (id: string) => {
    const cur = value[id] ?? { view: false, edit: false };
    const edit = !cur.edit;
    setRow(id, { view: edit ? true : cur.view, edit });
  };

  const topLevel = TOP_LEVEL_ORDER.filter(id => showGlobalRow || !DUAL_SCOPE_IDS.has(id))
    .map(id => byId[id])
    .filter(Boolean);
  const centreSubs = CENTRE_SUB_MODULE_ORDER.map(id => byId[id]).filter(Boolean);
  const subGranted = centreSubs.filter(s => value[s.id]?.view || value[s.id]?.edit).length;

  return (
    <div>
      <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">Module Permissions</p>

      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:bg-gray-50"
        type="button"
        onClick={() => setOpen(o => !o)}
      >
        <span className="flex flex-col">
          <span className="text-[13px] font-semibold text-[#21295A]">Module access</span>
          <span className="mt-0.5 text-[11.5px] text-gray-500">
            {grantedCount > 0
              ? `${grantedCount} of ${menus.length} modules granted`
              : `Set access for ${menus.length} modules`}
            {loadingDefaults && ' · Refreshing role defaults…'}
          </span>
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
          <p className="mb-2 px-2 text-[12px] text-gray-600">
            Fine-tune what this member can see and change per module. Defaults come from the selected role(s).
          </p>

          <div className="flex items-center gap-2 px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <span className="flex-1">Module</span>
            <span className="w-14 text-center">View</span>
            <span className="w-14 text-center">Edit</span>
          </div>

          <div className="space-y-1.5">
            {topLevel.map(m => {
              if (m.id === 'centremanagement') {
                // Centre Management is "on" if any sub-module is granted
                const cmOn = subGranted > 0;
                return (
                  <React.Fragment key={m.id}>
                    {/* Centre Management — accordion toggle; tick reflects sub-module state */}
                    <button
                      className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[13px] transition ${
                        cmOn
                          ? 'border-[#21295A] bg-[#21295A]/5 font-semibold text-[#21295A]'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                      type="button"
                      onClick={() => setCentreExpanded(e => !e)}
                    >
                      <svg
                        className={`h-3.5 w-3.5 shrink-0 transition-transform ${centreExpanded ? 'rotate-180' : ''} ${cmOn ? 'text-[#21295A]' : 'text-gray-400'}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        viewBox="0 0 24 24"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      <span className="flex-1">{m.label}</span>
                      {cmOn && (
                        <span className="rounded-full bg-[#21295A]/10 px-2 py-0.5 text-[10px] font-bold text-[#21295A]">
                          {subGranted}/{centreSubs.length} inside
                        </span>
                      )}
                      {/* Clicking this tick grants View to ALL sub-modules (or revokes all) */}
                      <span
                        aria-checked={cmOn}
                        aria-label="Toggle all centre sub-modules"
                        className="flex w-14 items-center justify-center"
                        role="checkbox"
                        tabIndex={0}
                        onClick={e => {
                          e.stopPropagation();
                          const next = { ...value };
                          if (cmOn) {
                            // revoke all sub-modules
                            centreSubs.forEach(s => {
                              next[s.id] = { view: false, edit: false };
                            });
                          } else {
                            // grant View to all sub-modules
                            centreSubs.forEach(s => {
                              next[s.id] = { view: true, edit: next[s.id]?.edit ?? false };
                            });
                            setCentreExpanded(true);
                          }
                          onChange(next);
                        }}
                        onKeyDown={e => {
                          if (e.key === ' ' || e.key === 'Enter') e.currentTarget.click();
                        }}
                      >
                        <span
                          className={`flex h-4 w-4 cursor-pointer items-center justify-center rounded border-2 transition ${cmOn ? 'border-[#21295A] bg-[#21295A]' : 'border-gray-300 bg-white hover:border-[#21295A]/50'}`}
                        >
                          {cmOn && (
                            <svg
                              className="h-2.5 w-2.5 text-white"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={3}
                              viewBox="0 0 24 24"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                      </span>
                      <span className="w-14" />
                    </button>

                    {centreExpanded && (
                      <div className="overflow-hidden rounded-xl border border-[#21295A]/15 bg-gradient-to-b from-slate-50 to-white shadow-inner">
                        <div className="flex items-center gap-2 border-b border-[#21295A]/10 bg-[#21295A]/[0.04] px-4 py-2">
                          <svg
                            className="h-3 w-3 text-[#21295A]/50"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                          >
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                          </svg>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#21295A]/50">
                            Inside Centre
                          </span>
                          <div className="ml-auto flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#21295A]/40">
                            <span className="w-14 text-center">View</span>
                            <span className="w-14 text-center">Edit</span>
                          </div>
                        </div>
                        {centreSubs.map((sub, i) => (
                          <div key={sub.id} className={i < centreSubs.length - 1 ? 'border-b border-gray-100' : ''}>
                            <ModuleRow
                              indent
                              customized={isCustomized(sub.id)}
                              label={sub.label}
                              moduleId={sub.id}
                              tag={DUAL_SCOPE_IDS.has(sub.id) ? 'Centre' : undefined}
                              value={value}
                              onToggleEdit={toggleEdit}
                              onToggleView={toggleView}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </React.Fragment>
                );
              }

              const isDual = DUAL_SCOPE_IDS.has(m.id);
              const rowId = isDual ? globalKey(m.id) : m.id;
              return (
                <ModuleRow
                  key={m.id}
                  customized={isCustomized(rowId)}
                  label={m.label}
                  moduleId={rowId}
                  tag={isDual ? 'All centres' : undefined}
                  value={value}
                  onToggleEdit={toggleEdit}
                  onToggleView={toggleView}
                />
              );
            })}
          </div>

          {error && <p className="mt-2 px-1 text-[12px] font-semibold text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default ModulePermissionsSection;
