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
      toast.success('Login Successful!', {
        duration: 4000,
      });
      // Small delay to ensure toast shows before navigation
      setTimeout(() => {
        navigate('/members');
      }, 100);
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-5">
      <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-10 shadow-lg">
        <div className="mb-6 flex justify-center">
          <div className="rounded-lg bg-white p-4">
            <img alt="Century Portal Logo" className="h-16 w-auto" src="/assets/brand.svg" />
          </div>
        </div>
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-800">Admin Portal</h1>
        <h2 className="mb-8 text-center text-lg font-normal text-gray-600">Sign In</h2>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="username">
              Username
            </label>
            <input
              required
              className="rounded-md border border-gray-300 px-3 py-3 text-sm transition-colors focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              id="username"
              placeholder="Enter username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                required
                className="w-full rounded-md border border-gray-300 px-3 py-3 pr-10 text-sm transition-colors focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                id="password"
                placeholder="Enter password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          {error && <div className="rounded bg-red-50 p-2 text-center text-sm text-red-600">{error}</div>}
          <button
            className="cursor-pointer rounded-md bg-indigo-600 px-4 py-3 text-base font-semibold text-white transition-all hover:bg-indigo-700 hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:bg-indigo-400"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
