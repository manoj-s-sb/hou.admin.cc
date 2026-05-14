import React from 'react';

import Layout from '../components/Layout';

import { canRead, ModuleKey } from './permissions';
import ProtectedRoute from './ProtectedRoute';
import RestrictedAccess from './RestrictedAccess';

interface PermissionRouteProps {
  module?: ModuleKey;
  children: React.ReactNode;
}

const PermissionRoute: React.FC<PermissionRouteProps> = ({ module, children }) => {
  return (
    <ProtectedRoute>
      <Layout>{canRead(module) ? children : <RestrictedAccess />}</Layout>
    </ProtectedRoute>
  );
};

export default PermissionRoute;
