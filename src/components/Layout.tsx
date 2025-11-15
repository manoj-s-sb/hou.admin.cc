import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import { useDispatch } from "react-redux";
import { logout as logoutAction } from "../store/auth/reducers";
import { useNavigate } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user: any = JSON.parse(localStorage.getItem("user") || "{}");

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
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    dispatch(logoutAction());
    navigate("/login");
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("tokens");
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

    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        isOpen={isSidebarOpen || isDesktop}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col w-full">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between sticky top-0 z-30">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2.5 rounded-xl hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 transition-all duration-200 border border-gray-200 hover:border-indigo-200"
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
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 transition-all duration-200 border border-gray-200 hover:border-indigo-300 shadow-sm hover:shadow-md"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-indigo-100">
                {user ? getInitials(`${user.firstName} ${user.lastName}`) : "U"}
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-semibold text-gray-900">
                  {user ? `${user.firstName} ${user.lastName}` : "User"}
                </span>
                <span className="text-xs text-gray-600 font-medium">
                  {user?.userType?.[0] || "Admin"}
                </span>
              </div>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                  showProfileMenu ? "rotate-180" : ""
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
              <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-fadeIn">
                <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
                  <p className="text-sm font-bold text-gray-900">
                    {user ? `${user.firstName} ${user.lastName}` : "User"}
                  </p>
                  <p className="text-xs text-gray-600 mt-1 font-medium">
                    {user?.email || "admin@example.com"}
                  </p>
                  <span className="inline-block mt-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-semibold">
                    {user?.userType?.[0] || "Admin"}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3 mt-1"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-2 sm:p-5 lg:p-6 bg-gradient-to-br from-gray-50 to-gray-100">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
