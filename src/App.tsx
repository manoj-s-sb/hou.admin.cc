import React, { useEffect, useState } from 'react';

import { Toaster } from 'react-hot-toast';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import SessionExpiredModal from './components/SessionExpiredModal';
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
} from './pages';
import { setSessionExpiredCallback } from './services';
import store from './store/store';

const AppRoutes: React.FC = () => {
  const [isSessionExpiredModalOpen, setIsSessionExpiredModalOpen] = useState(false);

  useEffect(() => {
    // Set up the session expired callback
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
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
          path="/dashboard"
        />
        <Route
          element={
            <ProtectedRoute>
              <Layout>
                <UserList />
              </Layout>
            </ProtectedRoute>
          }
          path="/users"
        />
        <Route
          element={
            <ProtectedRoute>
              <Layout>
                <Induction />
              </Layout>
            </ProtectedRoute>
          }
          path="/induction"
        />
        <Route
          element={
            <ProtectedRoute>
              <Layout>
                <ViewInduction />
              </Layout>
            </ProtectedRoute>
          }
          path="/view-induction/:userId"
        />
        <Route
          element={
            <ProtectedRoute>
              <Layout>
                <Tours />
              </Layout>
            </ProtectedRoute>
          }
          path="/tour"
        />
        <Route
          element={
            <ProtectedRoute>
              <Layout>
                <Members />
              </Layout>
            </ProtectedRoute>
          }
          path="/members"
        />
        <Route
          element={
            <ProtectedRoute>
              <Layout>
                <ViewMembers />
              </Layout>
            </ProtectedRoute>
          }
          path="/members/:userId"
        />
        <Route
          element={
            <ProtectedRoute>
              <Layout>
                <SlotBookings />
              </Layout>
            </ProtectedRoute>
          }
          path="/slot-bookings"
        />
        <Route
          element={
            <ProtectedRoute>
              <Layout>
                <CoachSchedule />
              </Layout>
            </ProtectedRoute>
          }
          path="/coach-schedule"
        />
        <Route element={<Navigate replace to="/induction" />} path="/" />
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
        <Toaster position="top-right" />
        <AppRoutes />
      </Router>
    </Provider>
  );
}

export default App;
