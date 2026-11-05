import React from 'react';

import { useSelector } from 'react-redux';

import Layout from '../components/Layout';
import { RootState } from '../store/store';

import { canRead, ModuleKey } from './permissions';
import ProtectedRoute from './ProtectedRoute';
import RestrictedAccess from './RestrictedAccess';

interface PermissionRouteProps {
  module?: ModuleKey;
  children: React.ReactNode;
}

const PermissionRoute: React.FC<PermissionRouteProps> = ({ module, children }) => {
  // Subscribe to permissions so the gate re-renders when they change mid-session
  // (e.g. after fetchMe / a role change). canRead() still reads them imperatively;
  // this subscription only tells React when to re-run the check.
  useSelector((state: RootState) => state.auth.permissions);
  return (
    <ProtectedRoute>
      <Layout>{canRead(module) ? children : <RestrictedAccess />}</Layout>
    </ProtectedRoute>
  );
};

export default PermissionRoute;
