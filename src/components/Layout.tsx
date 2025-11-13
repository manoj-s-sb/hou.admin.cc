import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { logout as logoutAction } from '../store/auth/reducers';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { loginResponse  } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = loginResponse?.data?.user;

  console.log(loginResponse);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    dispatch(logoutAction());
    navigate('/login');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('tokens');
  };

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
    <div className="flex min-h-screen">
      <Sidebar 
        isOpen={isSidebarOpen || isDesktop} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className="flex-1 flex flex-col w-full">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between shadow-sm">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Open sidebar"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div className="flex-1"></div>
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                {user ? getInitials(`${user.firstName} ${user.lastName}`) : 'U'}
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium text-gray-800">
                  {user ? `${user.firstName} ${user.lastName}` : 'User'}
                </span>
                <span className="text-xs text-gray-500">{user?.userType?.[0] || 'Admin'}</span>
              </div>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  showProfileMenu ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-800">
                    {user ? `${user.firstName} ${user.lastName}` : 'User'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{user?.email || 'admin@example.com'}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <span>🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-5 sm:p-5 lg:p-5 bg-gray-50">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
