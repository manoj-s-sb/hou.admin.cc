import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../../store/auth/api";
import { AppDispatch, RootState } from "../../store/store";
import toast from "react-hot-toast";

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const {
    isLoading: loading,
    isAuthenticated,
    error,
  } = useSelector((state: RootState) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    dispatch(login({ email: username, password }));
  };

  useEffect(() => {
    if (isAuthenticated) {
      toast.success("Login Successful!", {
        duration: 4000,
      });
      // Small delay to ensure toast shows before navigation
      setTimeout(() => {
        navigate("/induction");
      }, 100);
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-white p-5">
      <div className="bg-white rounded-xl p-10 w-full max-w-md shadow-lg border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg p-4">
            <img
              src="/assets/brand.svg"
              alt="Century Portal Logo"
              className="h-16 w-auto"
            />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
          Admin Portal
        </h1>
        <h2 className="text-lg font-normal text-gray-600 mb-8 text-center">
          Sign In
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="username"
              className="text-sm font-medium text-gray-700"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              className="px-3 py-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="px-3 py-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm p-2 bg-red-50 rounded text-center">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-3 bg-indigo-600 text-white rounded-md text-base font-semibold cursor-pointer transition-all hover:bg-indigo-700 hover:shadow-lg active:translate-y-0 disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
