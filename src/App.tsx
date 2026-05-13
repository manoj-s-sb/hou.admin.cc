import React, { useEffect, useState } from 'react';

import { Toaster } from 'react-hot-toast';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import RoleProtectedRoute from './components/RoleProtectedRoute';
import SessionExpiredModal from './components/SessionExpiredModal';
import menus from './constants/menus';
import { ROUTE_MODULES } from './constants/routePermissions';
import {
  Login,
  Dashboard,
  UserList,
  Induction,
  ViewInduction,
  Tours,
  Members,
  ViewMembers,
  SlotBookings,
  CoachSchedule,
  Maintenance,
  Tailgate,
} from './pages';
import { setSessionExpiredCallback } from './services';
import store from './store/store';
import { canRead } from './utils/permissions';

const DefaultLanding: React.FC = () => {
  const firstReadable = menus.find(item => canRead(item.module));
  return <Navigate replace to={firstReadable?.path ?? '/login'} />;
};

const AppRoutes: React.FC = () => {
  const [isSessionExpiredModalOpen, setIsSessionExpiredModalOpen] = useState(false);

  useEffect(() => {
    setSessionExpiredCallback(() => {
      setIsSessionExpiredModalOpen(true);
    });
  }, []);

  return (
    <>
      <Routes>
        <Route element={<Login />} path="/login" />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.reports}>
              <Dashboard />
            </RoleProtectedRoute>
          }
          path="/dashboard"
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.superAdmin}>
              <UserList />
            </RoleProtectedRoute>
          }
          path="/users"
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.induction}>
              <Induction />
            </RoleProtectedRoute>
          }
          path="/induction"
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.induction}>
              <ViewInduction />
            </RoleProtectedRoute>
          }
          path="/view-induction/:userId"
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.tour}>
              <Tours />
            </RoleProtectedRoute>
          }
          path="/tour"
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.members}>
              <Members />
            </RoleProtectedRoute>
          }
          path="/members"
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.members}>
              <ViewMembers />
            </RoleProtectedRoute>
          }
          path="/members/:userId"
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.bookings}>
              <SlotBookings />
            </RoleProtectedRoute>
          }
          path="/slot-bookings"
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.coaches}>
              <CoachSchedule />
            </RoleProtectedRoute>
          }
          path="/coach-schedule"
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.maintenance}>
              <Maintenance />
            </RoleProtectedRoute>
          }
          path="/maintenance"
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.tailgate}>
              <Tailgate />
            </RoleProtectedRoute>
          }
          path="/tailgate"
        />
        <Route element={<DefaultLanding />} path="/" />
      </Routes>

      {/* Global Session Expired Modal */}
      <SessionExpiredModal isOpen={isSessionExpiredModalOpen} onClose={() => setIsSessionExpiredModalOpen(false)} />
    </>
  );
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              fontSize: '14px',
              padding: '16px',
              borderRadius: '8px',
              maxWidth: '500px',
              zIndex: 9999,
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <AppRoutes />
      </Router>
    </Provider>
  );
}

export default App;
