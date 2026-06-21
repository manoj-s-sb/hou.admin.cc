import React from 'react';

import { Link, useLocation } from 'react-router-dom';

import menus from '../constants/menus';
import { ROUTES } from '../constants/routes';
import { useCentreNav } from '../contexts/CentreNavContext';
import { CENTRE_MODULE_GROUPS } from '../pages/centres/centreModules';
import { countryFlag } from '../pages/centres/constants';
import { canRead } from '../rbac/permissions';

import type { CentreApiStatus } from '../store/centres/types';

const STATUS_DOT: Record<CentreApiStatus, string> = {
  active: 'bg-emerald-400',
  draft: 'bg-amber-400',
  suspended: 'bg-red-400',
};

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
  const { activeCentre, module, setModule, closeCentre } = useCentreNav();

  const menuItems = menus.filter(item => canRead(item.module));

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
        <div className="relative flex h-20 items-center justify-center border-b border-gray-200 px-4">
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
          <div className="flex flex-[1_1_auto] flex-col gap-px overflow-y-auto bg-[#21295a] px-3 py-3.5">
            <button
              className="flex cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-2 py-1.5 text-[12.5px] font-semibold text-white/70 transition-all hover:bg-white/10 hover:text-white"
              type="button"
              onClick={() => closeCentre()}
            >
              <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back to Centres
            </button>

            <div className="my-2 flex items-center gap-2.5 border-y border-white/10 px-2 py-3">
              <span
                className={`h-[9px] w-[9px] flex-shrink-0 rounded-full bg-muted ${STATUS_DOT[activeCentre.status] ?? ''}`}
              />
              <div style={{ minWidth: 0 }}>
                <div className="truncate text-[13px] font-bold text-white">{activeCentre.name}</div>
                <div className="truncate text-[11.5px] text-white/60">
                  {countryFlag(activeCentre.countryCode)} {activeCentre.code}
                </div>
              </div>
            </div>

            {CENTRE_MODULE_GROUPS.map(g => (
              <React.Fragment key={g.group}>
                <div className="px-2 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.06em] text-white/40">
                  {g.group}
                </div>
                {g.items.map(m => (
                  <button
                    key={m.key}
                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-[9px] text-left text-[13px] font-medium text-white/65 transition-all hover:bg-white/10 hover:text-white ${module === m.key ? 'bg-white/[0.18] font-semibold text-white' : ''}`}
                    type="button"
                    onClick={() => {
                      setModule(m.key);
                      if (window.innerWidth < 1024 && onClose) onClose();
                    }}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <nav className="flex-1 overflow-y-auto py-4">
            {menuItems.map(item => {
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`) ||
                (item.path === ROUTES.INDUCTION.path && location.pathname.startsWith('/view-induction')) ||
                (item.path === ROUTES.MEMBERS.path && location.pathname.startsWith('/view-members'));

              return (
                <Link
                  key={item.path}
                  className={`mx-2 my-1 flex items-center rounded-lg px-5 py-3 no-underline transition-all duration-200 ${
                    isActive
                      ? 'border-l-4 border-[#21295A] bg-gradient-to-r from-[#21295A]/10 to-[#21295A]/5 font-semibold text-[#21295A] shadow-sm'
                      : 'text-gray-700 hover:translate-x-1 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  to={item.path}
                  onClick={() => {
                    // Close sidebar on mobile when a link is clicked
                    if (window.innerWidth < 1024 && onClose) {
                      onClose();
                    }
                  }}
                >
                  <span className="flex w-full items-center gap-3">
                    {item.icon && (
                      <img
                        alt={item.label}
                        className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : ''}`}
                        src={item.icon}
                      />
                    )}
                    <span className="text-sm">{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </>
  );
};

export default Sidebar;
