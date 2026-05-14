import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

import { hasPermission, ModuleKey } from '../rbac/permissions';

import { LoaderSpinner } from './Loader';

import type { PermissionAction } from '../store/auth/types';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  module?: ModuleKey;
  action?: PermissionAction;
  loading?: boolean;
  loadingText?: string;
  loaderClassName?: string;
  icon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      module,
      action = 'write',
      loading = false,
      loadingText = 'Processing…',
      loaderClassName = 'text-white',
      icon,
      disabled,
      children,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    // Hide entirely when permission is denied
    if (module && !hasPermission(module, action)) {
      return null;
    }

    return (
      <button ref={ref} disabled={disabled || loading} type={type} {...rest}>
        {loading ? (
          <>
            <LoaderSpinner className={loaderClassName} size="sm" />
            {loadingText}
          </>
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
