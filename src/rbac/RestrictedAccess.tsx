import React from 'react';

import { useNavigate } from 'react-router-dom';

import { getRole } from './permissions';

const RestrictedAccess: React.FC = () => {
  const navigate = useNavigate();
  const role = getRole();

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <svg className="h-7 w-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 9v3m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Restricted Access</h2>
        <p className="mb-1 text-sm text-gray-600">You don&apos;t have permission to view this page.</p>
        <p className="mb-6 text-sm text-gray-600">
          Please contact your admin to request access
          {role ? ` (current role: ${role})` : ''}.
        </p>
        <button
          className="rounded-lg bg-[#21295A] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1a2049]"
          onClick={() => navigate(-1)}
        >
          Go back
        </button>
      </div>
    </div>
  );
};

export default RestrictedAccess;
