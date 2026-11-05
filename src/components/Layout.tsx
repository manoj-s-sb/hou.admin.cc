import React, { useState, useEffect } from 'react';

import { CentreNavProvider } from '../contexts/CentreNavContext';

import NotificationsLogModal from './NotificationsLogModal';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isNotificationsLogOpen, setIsNotificationsLogOpen] = useState(false);

  // Handle sidebar state on resize
  useEffect(() => {
    const checkDesktop = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      // On desktop, sidebar is always visible via CSS, so we can reset mobile state
      if (desktop) {
        setIsSidebarOpen(false);
      }
    };

    // Check on mount
    checkDesktop();

    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  return (
    <CentreNavProvider>
      <div className="flex min-h-screen">
        <Sidebar
          isOpen={isSidebarOpen || isDesktop}
          onClose={() => setIsSidebarOpen(false)}
          onOpenNotifications={() => setIsNotificationsLogOpen(true)}
        />
        <div className="flex h-screen w-full flex-col overflow-hidden lg:ml-64">
          {/* The top header was removed (user profile + notifications now live at the
              sidebar bottom). This floating button is the only way to open the sidebar
              on mobile/tablet; hidden on desktop where the sidebar is always visible. */}
          <button
            aria-label="Open sidebar"
            className="fixed left-3 top-3 z-30 rounded-xl border border-[#21295A]/20 bg-white/90 p-2.5 text-[#21295A] shadow-md backdrop-blur transition-all duration-200 hover:bg-white lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
          {/* Reserves space on mobile so the floating menu button never overlaps page
              content (e.g. a page's back arrow / title). No-op on desktop. */}
          <div className="h-14 shrink-0 lg:hidden" />
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-br from-gray-50 to-gray-100 p-2 max-[560px]:p-2 sm:p-5 lg:p-6">
            {children}
          </main>
        </div>
      </div>
      <NotificationsLogModal isOpen={isNotificationsLogOpen} onClose={() => setIsNotificationsLogOpen(false)} />
    </CentreNavProvider>
  );
};

export default Layout;
