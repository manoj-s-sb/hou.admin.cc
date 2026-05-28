import React, { Children, cloneElement, isValidElement } from 'react';

import { toast } from 'react-hot-toast';

import { PermissionAction } from '../store/auth/types';

import { hasPermission, ModuleKey } from './permissions';

interface PermissionGateProps {
  module: ModuleKey;
  action?: PermissionAction;
  message?: string;
  children: React.ReactNode;
}

const DEFAULT_DENIED_MESSAGE =
  "You don't have permission to perform this action. Please contact your admin to request access.";

const showDeniedToast = (message: string) => {
  toast.custom(
    t => (
      <div
        className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-lg transition-all duration-200 ${
          t.visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
        }`}
        role="alert"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
          <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 9v3m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Permission required</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{message}</p>
        </div>
        <button
          aria-label="Dismiss notification"
          className="-mr-1 -mt-1 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          type="button"
          onClick={() => toast.dismiss(t.id)}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        </button>
      </div>
    ),
    { id: 'permission-denied', duration: 4000 }
  );
};

const PermissionGate: React.FC<PermissionGateProps> = ({
  module,
  action = 'write',
  message = DEFAULT_DENIED_MESSAGE,
  children,
}) => {
  const allowed = hasPermission(module, action);
  if (allowed) return <>{children}</>;

  return (
    <>
      {Children.map(children, child => {
        if (!isValidElement<{ onClick?: React.MouseEventHandler; className?: string }>(child)) {
          return child;
        }
        const existingClassName = child.props.className ?? '';
        return cloneElement(child, {
          onClick: (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            showDeniedToast(message);
          },
          className: `${existingClassName} opacity-60 cursor-not-allowed`.trim(),
        });
      })}
    </>
  );
};

export default PermissionGate;
