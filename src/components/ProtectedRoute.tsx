import React from 'react';

import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

import { RootState } from '../store/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const isAuthenticatedFromLocalStorage = localStorage.getItem('isAuthenticated');

  const isAuth = isAuthenticated || isAuthenticatedFromLocalStorage === 'true';

  if (!isAuth) {
    return <Navigate replace to="/login" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
