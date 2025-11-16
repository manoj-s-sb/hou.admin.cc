import React from "react";
import { Link, useLocation } from "react-router-dom";
import menus from "../constants/menus";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const CloseIcon: React.FC<{ className?: string }> = ({
  className = "w-6 h-6",
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const location = useLocation();

  const menuItems = menus;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen bg-white flex flex-col border-r border-gray-200 shadow-sm z-50 transition-transform duration-300 ease-in-out
          w-64
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static
        `}
      >
        {/* Header with close button for mobile */}
        <div className="h-20 border-b border-gray-200 flex items-center justify-center px-4 relative">
          <img
            src="/assets/brand.svg"
            alt="Century Portal Logo"
            className="h-16 w-auto"
          />
          <button
            onClick={onClose}
            className="lg:hidden absolute right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Close sidebar"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            // Check if current path matches menu item or is a child route
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + "/") ||
              (item.path === "/induction" && location.pathname.includes("view-induction")) ||
              (item.path === "/members" && location.pathname.includes("view-members"));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  // Close sidebar on mobile when a link is clicked
                  if (window.innerWidth < 1024 && onClose) {
                    onClose();
                  }
                }}
                className={`flex items-center px-5 py-3 mx-2 my-1 rounded-lg no-underline transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-600 font-semibold shadow-sm border-l-4 border-indigo-600"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:translate-x-1"
                }`}
              >
                <span className="flex items-center gap-3 w-full">
                  {item.icon && (
                    <img 
                      src={item.icon} 
                      alt={item.label} 
                      className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} 
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
