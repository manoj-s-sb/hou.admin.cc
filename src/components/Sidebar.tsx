import React from 'react';

import { Link, useLocation } from 'react-router-dom';

import menus from '../constants/menus';

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

  const menuItems = menus;

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
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-gray-200 bg-white shadow-sm transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:translate-x-0`}
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map(item => {
            // Check if current path matches menu item or is a child route
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(`${item.path}/`) ||
              (item.path === '/induction' && location.pathname.includes('view-induction')) ||
              (item.path === '/members' && location.pathname.includes('view-members'));

            return (
              <Link
                key={item.path}
                className={`mx-2 my-1 flex items-center rounded-lg px-5 py-3 no-underline transition-all duration-200 ${
                  isActive
                    ? 'border-l-4 border-indigo-600 bg-gradient-to-r from-indigo-50 to-blue-50 font-semibold text-indigo-600 shadow-sm'
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
      </div>
    </>
  );
};

export default Sidebar;
