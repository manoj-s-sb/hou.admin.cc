import { useEffect, useRef, useState } from 'react';

import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';

import endpoints from '../../constants/endpoints';
import { ROUTES } from '../../constants/routes';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

/**
 * Forgot-password flow — three steps, each its own request against the
 * OTP-based reset endpoints (no Redux involvement; this is local, transient
 * UI state, not part of the persisted auth session):
 *   1. Enter email        -> POST forgotPassword    (always a generic response)
 *   2. Enter OTP           -> POST verifyResetOtp    (returns a short-lived resetToken)
 *   3. Set new password    -> POST resetPassword     (consumes the resetToken)
 * On success, redirects back to /login so the user signs in with the new password.
 */

type Step = 'email' | 'otp' | 'reset';

const RESEND_COOLDOWN_SECONDS = 60;

const inputClass =
  'rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-[#21295A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#21295A]/10';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Pre-fill from the email the admin already typed on the Login page, if they
  // got here via "Forgot password?" — saves retyping it. Falls back to empty
  // when this page is reached directly (e.g. a bookmark/deep link).
  const prefillEmail = (location.state as { email?: string } | null)?.email ?? '';
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(prefillEmail);
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const requestOtp = async (isResend: boolean) => {
    if (!email.trim()) {
      toast.error('Enter your email address.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.post(endpoints.forgotPassword, { email: email.trim() });
      toast.success(response?.data?.message || "If that email is registered, we've sent a verification code to it.");
      startCooldown();
      if (!isResend) setStep('otp');
    } catch (error) {
      toast.error(handleApiError(error, 'Failed to send verification code.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestOtp(false);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(otp.trim())) {
      toast.error('Enter the numeric code we emailed you.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.post(endpoints.verifyResetOtp, { email: email.trim(), otp: otp.trim() });
      const token = response?.data?.data?.resetToken;
      if (!token) {
        toast.error('Something went wrong verifying the code. Please try again.');
        return;
      }
      setResetToken(token);
      setStep('reset');
    } catch (error) {
      toast.error(handleApiError(error, 'Invalid or expired code.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      await api.post(endpoints.resetPassword, {
        email: email.trim(),
        resetToken,
        newPassword,
        confirmPassword,
      });
      toast.success('Password reset successfully. Please sign in with your new password.', { duration: 5000 });
      navigate(ROUTES.LOGIN.path);
    } catch (error) {
      toast.error(handleApiError(error, 'Failed to reset password.'));
    } finally {
      setIsLoading(false);
    }
  };

  const heading =
    step === 'email' ? 'Forgot password?' : step === 'otp' ? 'Enter verification code' : 'Set a new password';
  const subtitle =
    step === 'email'
      ? "Enter your email and we'll send you a verification code."
      : step === 'otp'
        ? `We sent a code to ${email}. It expires shortly, so enter it soon.`
        : 'Choose a new password for your account.';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-10 py-10 shadow-xl">
        <div className="mb-5 flex justify-center">
          <img alt="Century Portal Logo" className="h-16 w-auto" src="/assets/brand.svg" />
        </div>

        <h1 className="mb-1 text-center text-2xl font-bold text-gray-900">{heading}</h1>
        <p className="mb-7 text-center text-sm text-gray-400">{subtitle}</p>

        {step === 'email' && (
          <form className="flex flex-col gap-4" onSubmit={handleEmailSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="fp-email">
                Email
              </label>
              <input
                required
                className={inputClass}
                id="fp-email"
                placeholder="Enter your email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <button
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#21295A] py-3 text-sm font-semibold text-white transition-all hover:bg-[#1a2149] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? 'Sending...' : 'Send code'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form className="flex flex-col gap-4" onSubmit={handleOtpSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="fp-otp">
                Verification code
              </label>
              <input
                required
                className={`${inputClass} text-center text-lg tracking-[0.5em]`}
                id="fp-otp"
                inputMode="numeric"
                maxLength={8}
                placeholder="------"
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>
            <button
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#21295A] py-3 text-sm font-semibold text-white transition-all hover:bg-[#1a2149] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? 'Verifying...' : 'Verify code'}
            </button>
            <div className="flex items-center justify-between text-xs">
              <button
                className="font-semibold text-[#21295A] hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
                disabled={cooldown > 0 || isLoading}
                type="button"
                onClick={() => requestOtp(true)}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
              <button
                className="font-semibold text-gray-500 hover:underline"
                type="button"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                }}
              >
                Change email
              </button>
            </div>
          </form>
        )}

        {step === 'reset' && (
          <form className="flex flex-col gap-4" onSubmit={handleResetSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="fp-new-password">
                New password
              </label>
              <div className="relative">
                <input
                  required
                  className={`w-full pr-11 ${inputClass}`}
                  id="fp-new-password"
                  minLength={8}
                  placeholder="Enter new password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <button
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wide text-gray-500"
                htmlFor="fp-confirm-password"
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  required
                  className={`w-full pr-11 ${inputClass}`}
                  id="fp-confirm-password"
                  minLength={8}
                  placeholder="Re-enter new password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
                <button
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>
            <button
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#21295A] py-3 text-sm font-semibold text-white transition-all hover:bg-[#1a2149] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? 'Saving...' : 'Reset password'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-400">
          <button
            className="font-semibold text-[#21295A] hover:underline"
            type="button"
            onClick={() => navigate(ROUTES.LOGIN.path)}
          >
            Back to sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
