import React, { useState } from 'react';
import { X, Lock, Mail, User, ShieldCheck, KeyRound, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { apiRequest } from '../../services/api.ts';

export const AuthModal: React.FC = () => {
  const { authModal, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(authModal.mode || 'login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot password flow
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [devPreviewOtp, setDevPreviewOtp] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!authModal.isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.success) {
      setError(res.message || 'Login failed.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const res = await register(email, password, username, fullName);
    setLoading(false);
    if (!res.success) {
      setError(res.message || 'Registration failed.');
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await apiRequest<{ devPreviewOtp?: string }>('/auth/password/forgot', {
      method: 'POST',
      body: { email }
    });
    setLoading(false);
    if (res.success) {
      setForgotStep(2);
      if (res.data?.devPreviewOtp) {
        setDevPreviewOtp(res.data.devPreviewOtp);
      }
      setSuccessMsg('OTP sent to your email.');
    } else {
      setError(res.message || 'Could not request OTP.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await apiRequest('/auth/password/reset', {
      method: 'POST',
      body: { email, otp: otpCode, newPassword }
    });
    setLoading(false);
    if (res.success) {
      setSuccessMsg('Password reset successfully! You can now log in.');
      setTimeout(() => {
        setMode('login');
        setForgotStep(1);
        setSuccessMsg(null);
      }, 1500);
    } else {
      setError(res.message || 'Failed to reset password.');
    }
  };

  const fillAdminCredentials = () => {
    setEmail('sabiborhosain@gmail.com');
    setPassword('100200300');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold">
              DS
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                {mode === 'login' ? 'Sign in to DevSphere' : mode === 'register' ? 'Join DevSphere Community' : 'Reset Account Password'}
              </h3>
              <p className="text-xs text-slate-500">Developer Social Platform</p>
            </div>
          </div>
          <button
            onClick={authModal.close}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              {successMsg}
            </div>
          )}

          {/* Quick-fill Admin Credentials Hint for easy testing */}
          {mode === 'login' && (
            <div className="mb-4 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Default Super Admin credentials available.
                </span>
              </div>
              <button
                type="button"
                onClick={fillAdminCredentials}
                className="px-2.5 py-1 text-xs font-medium bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors flex items-center space-x-1 shrink-0"
              >
                <Sparkles className="w-3 h-3" />
                <span>Quick Fill</span>
              </button>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="sabiborhosain@gmail.com"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); }}
                    className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); }}
                  className="text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400"
                >
                  Create one now
                </button>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Linus Torvalds"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="linus_linux"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="linus@kernel.org"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Confirm
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">Already registered? </span>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400"
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <div>
              {forgotStep === 1 ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <p className="text-xs text-slate-500">
                    Enter your account email. We will generate and dispatch a secure 6-digit OTP code valid for 15 minutes.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="your-email@example.com"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Sending OTP...' : 'Send Reset Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {devPreviewOtp && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200">
                      <strong>Dev Preview OTP:</strong> <span className="font-mono text-sm tracking-widest">{devPreviewOtp}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      6-Digit OTP Code
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value)}
                        placeholder="123456"
                        className="w-full pl-9 pr-3 py-2 text-sm font-mono tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Updating Password...' : 'Set New Password'}
                  </button>
                </form>
              )}

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setForgotStep(1); setError(null); }}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
