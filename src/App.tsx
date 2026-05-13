import React, { useEffect, useState } from 'react';

import { Toaster } from 'react-hot-toast';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PersistGate } from 'redux-persist/integration/react';

import RoleProtectedRoute from './components/RoleProtectedRoute';
import SessionExpiredModal from './components/SessionExpiredModal';
import menus from './constants/menus';
import { ROUTE_MODULES } from './constants/routePermissions';
import { ROUTES } from './constants/routes';
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
import store, { persistor } from './store/store';
import { canRead } from './utils/permissions';

const DefaultLanding: React.FC = () => {
  const firstReadable = menus.find(item => canRead(item.module));
  return <Navigate replace to={firstReadable?.path ?? ROUTES.LOGIN.path} />;
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
        <Route element={<Login />} path={ROUTES.LOGIN.path} />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.reports}>
              <Dashboard />
            </RoleProtectedRoute>
          }
          path={ROUTES.DASHBOARD.path}
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.superAdmin}>
              <UserList />
            </RoleProtectedRoute>
          }
          path={ROUTES.USERS.path}
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.induction}>
              <Induction />
            </RoleProtectedRoute>
          }
          path={ROUTES.INDUCTION.path}
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.induction}>
              <ViewInduction />
            </RoleProtectedRoute>
          }
          path={ROUTES.VIEW_INDUCTION.path}
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.tour}>
              <Tours />
            </RoleProtectedRoute>
          }
          path={ROUTES.TOUR.path}
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.members}>
              <Members />
            </RoleProtectedRoute>
          }
          path={ROUTES.MEMBERS.path}
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.members}>
              <ViewMembers />
            </RoleProtectedRoute>
          }
          path={ROUTES.VIEW_MEMBERS.path}
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.bookings}>
              <SlotBookings />
            </RoleProtectedRoute>
          }
          path={ROUTES.SLOT_BOOKINGS.path}
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.coaches}>
              <CoachSchedule />
            </RoleProtectedRoute>
          }
          path={ROUTES.COACH_SCHEDULE.path}
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.maintenance}>
              <Maintenance />
            </RoleProtectedRoute>
          }
          path={ROUTES.MAINTENANCE.path}
        />
        <Route
          element={
            <RoleProtectedRoute module={ROUTE_MODULES.tailgate}>
              <Tailgate />
            </RoleProtectedRoute>
          }
          path={ROUTES.TAILGATE.path}
        />
        <Route element={<DefaultLanding />} path={ROUTES.ROOT.path} />
      </Routes>

      {/* Global Session Expired Modal */}
      <SessionExpiredModal isOpen={isSessionExpiredModalOpen} onClose={() => setIsSessionExpiredModalOpen(false)} />
    </>
  );
};

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
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
      </PersistGate>
    </Provider>
  );
}

export default App;
