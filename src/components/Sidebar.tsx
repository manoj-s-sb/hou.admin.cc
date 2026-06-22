import React from 'react';

import { Link, useLocation, useNavigate } from 'react-router-dom';

import { MENU_GROUPS } from '../constants/menus';
import { ROUTES, buildRoute } from '../constants/routes';
import { useCentreNav } from '../contexts/CentreNavContext';
import { CENTRE_MODULE_GROUPS } from '../pages/centres/centreModules';
import { centreColour, countryFlag } from '../pages/centres/constants';
import { canRead, isSuperAdmin } from '../rbac/permissions';

import type { CentreApiStatus } from '../store/centres/types';

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

/** Shared inner: active accent bar + icon + label. */
const NavInner: React.FC<{ active: boolean; icon: React.ReactNode; label: string }> = ({ active, icon, label }) => (
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
  </>
);

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
  // Filter each group's items by permission + super-admin visibility; drop empty groups.
  const visibleGroups = MENU_GROUPS.map(g => ({
    group: g.group,
    items: g.items.filter(item => canRead(item.module) && !(item.hideForSuperAdmin && superAdmin)),
  })).filter(g => g.items.length > 0);

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

            {CENTRE_MODULE_GROUPS.map(g => (
              <React.Fragment key={g.group}>
                <GroupLabel>{g.group}</GroupLabel>
                {g.items.map(m => {
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
            ))}
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
