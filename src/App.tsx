import React, { Suspense, lazy, useEffect, useState } from 'react';

import { Toaster } from 'react-hot-toast';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PersistGate } from 'redux-persist/integration/react';

import { Loader } from './components/Loader';
import SessionExpiredModal from './components/SessionExpiredModal';
import menus from './constants/menus';
import { ROUTES } from './constants/routes';
import {
  Login,
  UserList,
  Induction,
  ViewInduction,
  Tours,
  Members,
  ViewMembers,
  SlotBookings,
  CoachSchedule,
  Tailgate,
  StaffManagement,
  AddStaffMember,
  ViewStaffMember,
  CentreManagement,
  MembershipPlans,
} from './pages';
import { ACCESS_SCOPES, canRead, PermissionRoute } from './rbac';
import { setSessionExpiredCallback } from './services';
import store, { persistor } from './store/store';

// Heavy routes split into their own chunks — Dashboard pulls in recharts (~300 KB),
// Maintenance is a 900+ LOC page. Keeps the initial bundle lean for everyone else.
const Dashboard = lazy(() => import('./pages/dashboard'));
const Maintenance = lazy(() => import('./pages/maintenance'));

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
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route element={<Login />} path={ROUTES.LOGIN.path} />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.reports}>
                <Dashboard />
              </PermissionRoute>
            }
            path={ROUTES.DASHBOARD.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.superAdmin}>
                <UserList />
              </PermissionRoute>
            }
            path={ROUTES.USERS.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.induction}>
                <Induction />
              </PermissionRoute>
            }
            path={ROUTES.INDUCTION.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.induction}>
                <ViewInduction />
              </PermissionRoute>
            }
            path={ROUTES.VIEW_INDUCTION.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.tour}>
                <Tours />
              </PermissionRoute>
            }
            path={ROUTES.TOUR.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.members}>
                <Members />
              </PermissionRoute>
            }
            path={ROUTES.MEMBERS.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.members}>
                <ViewMembers />
              </PermissionRoute>
            }
            path={ROUTES.VIEW_MEMBERS.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.slots}>
                <SlotBookings />
              </PermissionRoute>
            }
            path={ROUTES.SLOT_BOOKINGS.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.coaches}>
                <CoachSchedule />
              </PermissionRoute>
            }
            path={ROUTES.COACH_SCHEDULE.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.maintenance}>
                <Maintenance />
              </PermissionRoute>
            }
            path={ROUTES.MAINTENANCE.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.tailgate}>
                <Tailgate />
              </PermissionRoute>
            }
            path={ROUTES.TAILGATE.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.staff}>
                <StaffManagement />
              </PermissionRoute>
            }
            path={ROUTES.STAFF_MANAGEMENT.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.staff}>
                <AddStaffMember />
              </PermissionRoute>
            }
            path={ROUTES.STAFF_MANAGEMENT_ADD.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.staff}>
                <AddStaffMember />
              </PermissionRoute>
            }
            path={ROUTES.STAFF_MANAGEMENT_EDIT.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.staff}>
                <ViewStaffMember />
              </PermissionRoute>
            }
            path={ROUTES.STAFF_MANAGEMENT_VIEW.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.superAdmin}>
                <CentreManagement />
              </PermissionRoute>
            }
            path={ROUTES.CENTRES.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.superAdmin}>
                <MembershipPlans />
              </PermissionRoute>
            }
            path={ROUTES.MEMBERSHIP_PLANS.path}
          />
          <Route element={<DefaultLanding />} path={ROUTES.ROOT.path} />
        </Routes>
      </Suspense>

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
