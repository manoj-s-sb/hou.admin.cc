import React from 'react';

import { canRead, ModuleKey } from '../utils/permissions';

import Layout from './Layout';
import ProtectedRoute from './ProtectedRoute';
import RestrictedAccess from './RestrictedAccess';

interface RoleProtectedRouteProps {
  module?: ModuleKey;
  children: React.ReactNode;
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ module, children }) => {
  return (
    <ProtectedRoute>
      <Layout>{canRead(module) ? children : <RestrictedAccess />}</Layout>
    </ProtectedRoute>
  );
};

export default RoleProtectedRoute;
