import React, { useEffect, useState } from 'react';

import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { login } from '../../store/auth/api';
import { AppDispatch, RootState } from '../../store/store';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { isLoading: loading, isAuthenticated, error } = useSelector((state: RootState) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(login({ email: username, password }));
  };

  useEffect(() => {
    if (isAuthenticated) {
      toast.success('Logged in successfully!', { duration: 4000 });
      setTimeout(() => navigate('/'), 100);
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-10 py-10 shadow-xl">
        {/* Logo */}
        <div className="mb-5 flex justify-center">
          <img alt="Century Portal Logo" className="h-16 w-auto" src="/assets/brand.svg" />
        </div>

        {/* Heading */}
        <h1 className="mb-1 text-center text-2xl font-bold text-gray-900">Admin Portal</h1>
        <p className="mb-7 text-center text-sm text-gray-400">Sign in to continue</p>

        {/* Error message */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="username">
              Username
            </label>
            <input
              required
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-[#21295A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#21295A]/10"
              id="username"
              placeholder="Enter username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-[#21295A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#21295A]/10"
                id="password"
                placeholder="Enter password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#21295A] py-3 text-sm font-semibold text-white transition-all hover:bg-[#1a2149] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
              </svg>
            )}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
