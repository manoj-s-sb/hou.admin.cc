import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

import PermissionGate from '../rbac/PermissionGate';

import { LoaderSpinner } from './Loader';

import type { ModuleKey } from '../rbac/permissions';
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
      action,
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
    const button = (
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

    if (!module) return button;
    return (
      <PermissionGate action={action} module={module}>
        {button}
      </PermissionGate>
    );
  }
);

Button.displayName = 'Button';

export default Button;
