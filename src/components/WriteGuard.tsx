import React from 'react';

import { canWrite, ModuleKey } from '../utils/permissions';

interface WriteGuardProps {
  module: ModuleKey;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

const WriteGuard: React.FC<WriteGuardProps> = ({ module, fallback = null, children }) => {
  return <>{canWrite(module) ? children : fallback}</>;
};

export default WriteGuard;
