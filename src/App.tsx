import React, { Suspense, lazy, useEffect, useState } from 'react';

import { Toaster } from 'react-hot-toast';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PersistGate } from 'redux-persist/integration/react';

import Layout from './components/Layout';
import { Loader } from './components/Loader';
import SessionExpiredModal from './components/SessionExpiredModal';
import menus, { MENU_ITEM_BY_MODULE } from './constants/menus';
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
  CentreModuleRoute,
  MembershipPlans,
  Tickets,
} from './pages';
import ComingSoon from './pages/centres/components/ComingSoon';
import { ACCESS_SCOPES, canRead, PermissionRoute, RestrictedAccess, sidebarItems } from './rbac';
import { setSessionExpiredCallback } from './services';
import { fetchMe } from './store/auth/api';
import store, { persistor, AppDispatch, RootState } from './store/store';

// Heavy routes split into their own chunks — Reports pulls in recharts (~300 KB),
// Maintenance is a 900+ LOC page. Keeps the initial bundle lean for everyone else.
const Reports = lazy(() => import('./pages/reports'));
const Maintenance = lazy(() => import('./pages/maintenance'));

const DefaultLanding: React.FC<{ bootChecked: boolean }> = ({ bootChecked }) => {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  // Not signed in → the login page.
  if (!isAuthenticated) return <Navigate replace to={ROUTES.LOGIN.path} />;

  // A session resumed from persisted storage (page load/refresh) may still hold a
  // different user's leftover sidebar/permissions until the boot /me refresh below
  // resolves. Wait for it rather than redirecting off stale data (e.g. landing on
  // Membership Plans for a user whose real sidebar never included it).
  if (!bootChecked) return <Loader />;

  // Signed in → land on the first backend sidebar item that maps to a global route,
  // else the first readable hardcoded menu item.
  const sidebarPath = sidebarItems()
    .map(entry => MENU_ITEM_BY_MODULE[entry.id]?.path)
    .find(Boolean);
  const dest = sidebarPath ?? menus.find(item => canRead(item.module))?.path;
  if (dest) return <Navigate replace to={dest} />;

  // Authenticated but nothing is accessible (e.g. a role with no granted modules):
  // show a clear "no access" page — never bounce back to /login (that loops and
  // spams the login-success toast).
  return (
    <Layout>
      <RestrictedAccess />
    </Layout>
  );
};

const AppRoutes: React.FC = () => {
  const [isSessionExpiredModalOpen, setIsSessionExpiredModalOpen] = useState(false);
  // Nothing to refresh if the app booted signed-out; DefaultLanding can act on
  // the (already-fresh) auth state right away. Only a resumed, already-authed
  // session needs to wait for the /me refresh below before it's trustworthy.
  const [bootChecked, setBootChecked] = useState(() => !store.getState().auth.isAuthenticated);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    setSessionExpiredCallback(() => {
      setIsSessionExpiredModalOpen(true);
    });
  }, []);

  // On boot, re-hydrate role/permissions/scope from /me (source of truth) so a
  // changed role takes effect without a full re-login. Only when already authed;
  // a 401 is handled globally, other failures leave persisted auth intact.
  useEffect(() => {
    if (!store.getState().auth.isAuthenticated) return;
    dispatch(fetchMe()).finally(() => setBootChecked(true));
  }, [dispatch]);

  return (
    <>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route element={<Login />} path={ROUTES.LOGIN.path} />
          {/* Pre-launch: Centre Management is the only functional area of the app right
              now (see the New York rollout plan). Every other module below keeps its real
              route/permission gate — so it still appears in the sidebar and stays
              reachable — but renders a "Coming Soon" placeholder instead of its real page.
              Re-enabling one later is just swapping its <ComingSoon .../> back for the
              real component (still imported above, untouched). */}
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.reports}>
                <ComingSoon moduleLabel="Reports" />
              </PermissionRoute>
            }
            path={ROUTES.REPORTS.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.superAdmin}>
                <ComingSoon moduleLabel="User List" />
              </PermissionRoute>
            }
            path={ROUTES.USERS.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.induction}>
                <ComingSoon moduleLabel="Induction" />
              </PermissionRoute>
            }
            path={ROUTES.INDUCTION.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.induction}>
                <ComingSoon moduleLabel="Induction" />
              </PermissionRoute>
            }
            path={ROUTES.VIEW_INDUCTION.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.tour}>
                <ComingSoon moduleLabel="Tour Details" />
              </PermissionRoute>
            }
            path={ROUTES.TOUR.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.members}>
                <ComingSoon moduleLabel="Members" />
              </PermissionRoute>
            }
            path={ROUTES.MEMBERS.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.members}>
                <ComingSoon moduleLabel="Members" />
              </PermissionRoute>
            }
            path={ROUTES.VIEW_MEMBERS.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.slots}>
                <ComingSoon moduleLabel="Slot Bookings" />
              </PermissionRoute>
            }
            path={ROUTES.SLOT_BOOKINGS.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.coaches}>
                <ComingSoon moduleLabel="Coach Schedule" />
              </PermissionRoute>
            }
            path={ROUTES.COACH_SCHEDULE.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.maintenance}>
                <ComingSoon moduleLabel="Maintenance & Tasks" />
              </PermissionRoute>
            }
            path={ROUTES.MAINTENANCE.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.tailgate}>
                <ComingSoon moduleLabel="Tailgate Logs" />
              </PermissionRoute>
            }
            path={ROUTES.TAILGATE.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.staff}>
                <ComingSoon moduleLabel="Staff Management" />
              </PermissionRoute>
            }
            path={ROUTES.STAFF_MANAGEMENT.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.staff}>
                <ComingSoon moduleLabel="Staff Management" />
              </PermissionRoute>
            }
            path={ROUTES.STAFF_MANAGEMENT_ADD.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.staff}>
                <ComingSoon moduleLabel="Staff Management" />
              </PermissionRoute>
            }
            path={ROUTES.STAFF_MANAGEMENT_EDIT.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.staff}>
                <ComingSoon moduleLabel="Staff Management" />
              </PermissionRoute>
            }
            path={ROUTES.STAFF_MANAGEMENT_VIEW.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.centreManagement}>
                <CentreManagement />
              </PermissionRoute>
            }
            path={ROUTES.CENTRES.path}
          />
          {/* One generic centre-scoped route — the module is resolved from :moduleSlug and
              permission-gated inside CentreModuleRoute (so no fixed module here). Centre
              Management stays fully live — CentreModuleRoute has its own separate
              "Coming Soon" gate for New York's non-waitlist modules only. */}
          <Route
            element={
              <PermissionRoute>
                <CentreModuleRoute />
              </PermissionRoute>
            }
            path={ROUTES.CENTRE_MODULE.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.membershipPlans}>
                <ComingSoon moduleLabel="Membership Plans" />
              </PermissionRoute>
            }
            path={ROUTES.MEMBERSHIP_PLANS.path}
          />
          <Route
            element={
              <PermissionRoute module={ACCESS_SCOPES.tickets}>
                <ComingSoon moduleLabel="Tickets / Incidents" />
              </PermissionRoute>
            }
            path={ROUTES.TICKETS.path}
          />
          <Route element={<DefaultLanding bootChecked={bootChecked} />} path={ROUTES.ROOT.path} />
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
