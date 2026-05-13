import React, { Children, cloneElement, isValidElement } from 'react';

import { toast } from 'react-hot-toast';

import { PermissionAction } from '../store/auth/types';
import { hasPermission, ModuleKey } from '../utils/permissions';

interface PermissionGateProps {
  module: ModuleKey;
  action?: PermissionAction;
  message?: string;
  children: React.ReactNode;
}

const PermissionGate: React.FC<PermissionGateProps> = ({
  module,
  action = 'write',
  message = "You don't have permission to perform this action",
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
            toast.error(message);
          },
          className: `${existingClassName} opacity-60 cursor-not-allowed`.trim(),
        });
      })}
    </>
  );
};

export default PermissionGate;
