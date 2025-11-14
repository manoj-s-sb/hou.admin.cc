import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { Login, Dashboard, UserList, Induction, ViewInduction, Tours, Members } from "./pages";
import { Provider } from "react-redux";
import store from "./store/store";
import { Toaster } from "react-hot-toast";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Layout>
              <UserList />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/induction"
        element={
          <ProtectedRoute>
            <Layout>
              <Induction />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/view-induction"
        element={
          <ProtectedRoute>
            <Layout>
              <ViewInduction />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tour"
        element={
          <ProtectedRoute>
            <Layout>
              <Tours />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscription"
        element={
          <ProtectedRoute>
            <Layout>
              <Members />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/induction" replace />} />
    </Routes>
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
