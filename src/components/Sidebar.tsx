import React, { useEffect, useState } from 'react';

import { Link, useLocation, useNavigate } from 'react-router-dom';

import endpoints from '../constants/endpoints';
import { MENU_GROUPS, type MenuItem } from '../constants/menus';
import { ROUTES, buildRoute } from '../constants/routes';
import { useCentreNav } from '../contexts/CentreNavContext';
import { CENTRE_MODULE_GROUPS } from '../pages/centres/centreModules';
import { centreColour, countryFlag } from '../pages/centres/constants';
import { ACCESS_SCOPES } from '../rbac/constants';
import { canRead, isSuperAdmin, sidebarItems } from '../rbac/permissions';
import api from '../services';

/**
 * Flat lookup of moduleId → { item, group } built once from MENU_GROUPS — the
 * existing frontend visual map (icon/route/group/label). The backend `sidebar`
 * carries module ids; we render each id using this map so the visuals never change.
 * Keyed by every id in a MenuItem's `module` array (not just the first) so schema
 * aliases — e.g. `maintenance_centre` / `maintenance_allcentres` alongside plain
 * `maintenance` — all resolve to the same item; groupsFromBackendSidebar dedupes
 * below so a centre+allcentres pair still renders as a single nav entry.
 */
const MODULE_VISUAL: Record<string, { item: MenuItem; group: string }> = {};
MENU_GROUPS.forEach(g =>
  g.items.forEach(item => {
    (item.module ?? []).forEach(id => {
      MODULE_VISUAL[id] = { item, group: g.group };
    });
  })
);

/**
 * Build grouped nav from the backend sidebar (ordered + filtered). Groups appear
 * in first-seen order; items keep the backend order within each group. Ids with
 * no visual mapping are skipped. Returns [] when nothing resolves → caller falls
 * back to the hardcoded menu (never a blank sidebar).
 */
// Modules that only make sense inside a centre — never shown in the global sidebar.
// NB: 'tailgate' is intentionally NOT here — Tailgate Logs is a global Monitoring
// item (visible to super admins); the in-centre Tailgate view is driven separately
// by CENTRE_MODULE_GROUPS, so it doesn't rely on this set.
const CENTRE_ONLY_MODULES = new Set([
  'members',
  'slotbooking',
  'induction',
  'tour',
  'waitlistleads',
  'coachschedule',
  'facilities',
  'planspricing',
]);

const groupsFromBackendSidebar = (): { group: string; items: MenuItem[] }[] => {
  const order: string[] = [];
  const byGroup: Record<string, MenuItem[]> = {};
  const seenPaths = new Set<string>(); // dedupe centre/allcentres split ids resolving to one item
  sidebarItems().forEach(entry => {
    if (CENTRE_ONLY_MODULES.has(entry.id)) return; // hide centre-scoped modules from global nav
    const visual = MODULE_VISUAL[entry.id];
    if (!visual) return;
    if (seenPaths.has(visual.item.path)) return;
    seenPaths.add(visual.item.path);
    if (!byGroup[visual.group]) {
      byGroup[visual.group] = [];
      order.push(visual.group);
    }
    byGroup[visual.group].push(visual.item);
  });
  return order.map(group => ({ group, items: byGroup[group] }));
};

import type { CentreApiStatus, FacilitySummary } from '../store/centres/types';
import type { TailgateStats } from '../store/tailgate/types';
import type { TicketCounts } from '../store/tickets/types';

const STATUS_DOT: Record<CentreApiStatus, string> = {
  active: 'bg-emerald-500',
  draft: 'bg-amber-500',
  suspended: 'bg-red-500',
};

/** One source of truth for nav-item styling — used by both the global and centre menus. */
const itemClass = (active: boolean): string =>
  `group relative mx-2.5 my-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm no-underline transition-colors duration-150 ${
    active ? 'bg-[#21295A]/[0.07] font-semibold text-[#21295A]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`;

/** Shared inner: active accent bar + icon + label + optional red count badge. */
const NavInner: React.FC<{ active: boolean; icon: React.ReactNode; label: string; badge?: number }> = ({
  active,
  icon,
  label,
  badge,
}) => (
  <>
    {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#21295A]" />}
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center transition-transform duration-150 ${
        active ? 'scale-105' : 'group-hover:scale-105'
      }`}
    >
      {icon}
    </span>
    <span className="truncate">{label}</span>
    {typeof badge === 'number' && badge > 0 && (
      <span className="ml-auto min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
        {badge}
      </span>
    )}
  </>
);

/**
 * Best-effort count badges for the global monitoring/setup nav. Fetched locally
 * (never dispatched to Redux) so it can't disturb the Centre Management page's
 * shared `state.centres`. Each count is independent — a failure leaves the rest.
 *   • Tickets / Incidents → open (non-closed) tickets network-wide
 *   • Centre Management   → total open tailgates + tasks across centres
 *   • Tailgate Logs       → tailgate violations only (all time)
 */
const useSidebarBadges = (enabled: boolean): Record<string, number> => {
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    const load = async () => {
      const next: Record<string, number> = {};
      try {
        const res = await api.post<{ data: TicketCounts }>(endpoints.tickets, { action: 'counts' });
        const c = res.data?.data;
        if (c) next[ROUTES.TICKETS.path] = Math.max(0, (c.total ?? 0) - (c.closed ?? 0));
      } catch {
        /* best-effort — a failed count never blocks the sidebar */
      }
      try {
        const res = await api.post<{ data: { facilities?: FacilitySummary[] } }>(endpoints.centres.centresList, {
          skip: 0,
          limit: 200,
        });
        const facs = res.data?.data?.facilities ?? [];
        next[ROUTES.CENTRES.path] = facs.reduce(
          (sum, f) => sum + (f.stats?.tailgates ?? 0) + (f.stats?.openTasks ?? 0),
          0
        );
      } catch {
        /* best-effort */
      }
      try {
        const now = new Date();
        const [y, m, d] = now.toLocaleDateString('en-CA').split('-');
        const res = await api.post<{ data: TailgateStats }>(endpoints.tailgate.stats, { date: `${d}-${m}-${y}` });
        const t = res.data?.data;
        if (t) next[ROUTES.TAILGATE.path] = t.totalViolations ?? 0;
      } catch {
        /* best-effort */
      }
      if (!cancelled) setBadges(next);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return badges;
};

const GroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-5 pb-1.5 pt-5 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400 first:pt-2">
    {children}
  </div>
);

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const CloseIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
  </svg>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeCentre, closeCentre } = useCentreNav();

  const superAdmin = isSuperAdmin();
  // Count badges only apply to the global monitoring/setup nav (not the per-centre menu).
  const badges = useSidebarBadges(superAdmin && !activeCentre);
  // Centre-managing roles (superadmin + anyone with centremanagement access) reach the
  // per-centre operational modules (Members, Slot Bookings, Coach Schedule, Induction,
  // Tours) by opening a centre — so those items are hidden from their GLOBAL nav.
  // Facility-scoped operational roles (admin/coach/staff), who can't manage centres, keep
  // seeing those modules at the top level (their single centre is auto-scoped).
  const managesCentres = superAdmin || canRead(ACCESS_SCOPES.centreManagement);
  // Today's behaviour: filter each group's items by permission + centre-managing
  // visibility; drop empty groups. This is also the fallback when the backend sends
  // no sidebar (e.g. superadmin) — they keep seeing the full menu, unchanged.
  const fallbackGroups = MENU_GROUPS.map(g => ({
    group: g.group,
    items: g.items.filter(
      item =>
        canRead(item.module) &&
        !(item.hideForSuperAdmin && managesCentres) &&
        !(managesCentres && CENTRE_ONLY_MODULES.has((item.module ?? [])[0] ?? ''))
    ),
  })).filter(g => g.items.length > 0);

  // Prefer the backend-resolved sidebar (ordered + filtered) when it yields any
  // renderable item; otherwise fall back to the hardcoded menu (never blank).
  const backendGroups = groupsFromBackendSidebar();
  const visibleGroups = backendGroups.length > 0 ? backendGroups : fallbackGroups;

  const closeOnMobile = () => {
    if (window.innerWidth < 1024 && onClose) onClose();
  };

  const handleOverlayKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClose) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity lg:hidden"
          role="button"
          tabIndex={0}
          onClick={onClose}
          onKeyDown={handleOverlayKeyDown}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-gray-200 bg-white shadow-sm transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Header with close button for mobile */}
        <div className="relative flex h-20 shrink-0 items-center justify-center border-b border-gray-200 px-4">
          <img alt="Century Portal Logo" className="h-16 w-auto" src="/assets/brand.svg" />
          <button
            aria-label="Close sidebar"
            className="absolute right-4 rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 lg:hidden"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Navigation — swaps to the centre's module nav while a centre is open */}
        {activeCentre ? (
          <nav className="flex-1 space-y-px overflow-y-auto py-3">
            {/* Back to Centres */}
            <button
              className="group mx-2.5 mb-2 flex w-[calc(100%-1.25rem)] items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.04em] text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              type="button"
              onClick={() => {
                closeCentre();
                navigate(ROUTES.CENTRES.path);
              }}
            >
              <svg
                className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back to Centres
            </button>

            {/* Active centre identity card — accent bar in the centre's palette colour */}
            <div
              className="mx-2.5 mb-2 flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5"
              style={{ borderLeft: `3px solid ${centreColour(activeCentre.code)}` }}
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
                    STATUS_DOT[activeCentre.status] ?? 'bg-gray-300'
                  }`}
                />
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    STATUS_DOT[activeCentre.status] ?? 'bg-gray-300'
                  }`}
                />
              </span>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold leading-tight text-gray-900">{activeCentre.name}</div>
                <div className="mt-0.5 truncate text-[11.5px] text-gray-500">
                  {countryFlag(activeCentre.countryCode)} {activeCentre.code}
                </div>
              </div>
            </div>

            {CENTRE_MODULE_GROUPS.map(g => {
              const visibleItems = g.items.filter(m => !m.scope || canRead(m.scope));
              if (!visibleItems.length) return null;
              return (
                <React.Fragment key={g.group}>
                  <GroupLabel>{g.group}</GroupLabel>
                  {visibleItems.map(m => {
                    const modulePath = buildRoute.centreModule(activeCentre.code, m.slug);
                    const isActive = location.pathname === modulePath;
                    return (
                      <button
                        key={m.key}
                        aria-current={isActive ? 'page' : undefined}
                        className={`${itemClass(isActive)} w-[calc(100%-1.25rem)] text-left`}
                        type="button"
                        onClick={() => {
                          navigate(modulePath);
                          closeOnMobile();
                        }}
                      >
                        <NavInner active={isActive} icon={m.icon} label={m.label} />
                      </button>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </nav>
        ) : (
          <nav className="flex-1 space-y-px overflow-y-auto py-3">
            {visibleGroups.map(g => (
              <React.Fragment key={g.group}>
                <GroupLabel>{g.group}</GroupLabel>
                {g.items.map(item => {
                  const isActive =
                    location.pathname === item.path ||
                    location.pathname.startsWith(`${item.path}/`) ||
                    (item.path === ROUTES.INDUCTION.path && location.pathname.startsWith('/view-induction')) ||
                    (item.path === ROUTES.MEMBERS.path && location.pathname.startsWith('/view-members'));

                  return (
                    <Link
                      key={item.path}
                      aria-current={isActive ? 'page' : undefined}
                      className={itemClass(isActive)}
                      to={item.path}
                      onClick={closeOnMobile}
                    >
                      <NavInner
                        active={isActive}
                        badge={badges[item.path]}
                        icon={
                          item.icon && (
                            <img
                              alt=""
                              aria-hidden="true"
                              className={`h-5 w-5 ${isActive ? '' : 'opacity-70'}`}
                              src={item.icon}
                            />
                          )
                        }
                        label={item.label}
                      />
                    </Link>
                  );
                })}
              </React.Fragment>
            ))}
          </nav>
        )}
      </div>
    </>
  );
};

export default Sidebar;
