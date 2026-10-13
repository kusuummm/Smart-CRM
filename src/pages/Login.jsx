import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  Eye,
  EyeOff,
  Building2,
  ArrowLeft,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  KeyRound,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  UserPlus,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  registerRequest,
  forgotPasswordSendOtpRequest,
  forgotPasswordVerifyResetRequest,
} from '../api/auth';

export default function Login({ isAddingAccount = false, onCancelAdd }) {
  // Modes: 'login' | 'register' | 'forgot'
  const [authMode, setAuthMode] = useState('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [approvalNotice, setApprovalNotice] = useState('');

  // Register form state (Direct registration with Email & Password, awaiting Admin approval)
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Forgot password state
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP + New Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // General loading & cooldown timers
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errors, setErrors] = useState({});

  const { login, loginWithSession, user } = useAuth();
  const { t } = useApp();

  // Cooldown countdown timer for OTP resend (Forgot Password)
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Only auto-hide when there's a logged-in user AND not in addingAccount mode
  if (user && !isAddingAccount) return null;

  // ================= 1. LOGIN HANDLERS =================
  const validateLogin = () => {
    const errs = {};
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      errs.email = 'Email address is required';
    } else if (/^\d{4,8}$/.test(cleanEmail)) {
      errs.email = 'Please enter your registered email address, not the OTP verification code';
    } else if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      errs.email = 'Please enter a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 4) {
      errs.password = 'Password must be at least 4 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!validateLogin()) return;
    setLoading(true);
    const result = await login(email.trim().toLowerCase(), password);
    if (result.success) {
      toast.success(t('loginSuccess') || (language === 'hi' ? 'स्वागत है!' : 'Welcome back!'));
      setApprovalNotice('');
    } else {
      if (
        result.message &&
        (result.message.toLowerCase().includes('pending') ||
          result.message.toLowerCase().includes('approval') ||
          result.message.toLowerCase().includes('rejected'))
      ) {
        setApprovalNotice(result.message);
      } else {
        setApprovalNotice('');
      }
      toast.error(result.message);
    }
    setLoading(false);
  };

  // ================= 2. REGISTRATION HANDLERS =================
  const validateRegForm = () => {
    const errs = {};
    if (!regForm.name.trim()) errs.name = 'Full Name is required';
    if (!regForm.email.trim()) errs.email = 'Email address is required';
    else if (!/\S+@\S+\.\S+/.test(regForm.email)) errs.email = 'Invalid email format';
    if (!regForm.password) errs.password = 'Password is required';
    else if (regForm.password.length < 4) errs.password = 'Password must be at least 4 characters';
    if (regForm.password !== regForm.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!validateRegForm()) return;

    setLoading(true);
    try {
      const data = await registerRequest({
        name: regForm.name.trim(),
        email: regForm.email.trim().toLowerCase(),
        phone: regForm.phone.trim(),
        password: regForm.password,
      });

      const successMsg = data.message || 'Registration submitted! Awaiting administrator approval before you can log in.';
      toast.success(successMsg, { duration: 6000 });
      setApprovalNotice(successMsg);

      // Pre-fill email on the login form so the user can easily log in once approved
      setEmail(regForm.email.trim().toLowerCase());
      setPassword('');
      setRegForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
      });
      setAuthMode('login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // ================= 3. FORGOT PASSWORD HANDLERS =================
  const handleSendForgotOtp = async (e) => {
    if (e) e.preventDefault();
    if (!forgotEmail.trim() || !/\S+@\S+\.\S+/.test(forgotEmail)) {
      setErrors({ forgotEmail: 'Please enter a valid registered email address' });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const data = await forgotPasswordSendOtpRequest({ email: forgotEmail.trim().toLowerCase() });
      toast.success(data.message || 'Recovery code sent to your email!');
      setForgotStep(2);
      setCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch recovery code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetPassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      errs.forgotOtp = 'Enter the 6-digit verification code';
    }
    if (!newPassword || newPassword.length < 4) {
      errs.newPassword = 'Password must be at least 4 characters';
    }
    if (newPassword !== confirmNewPassword) {
      errs.confirmNewPassword = 'Passwords do not match';
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const data = await forgotPasswordVerifyResetRequest({
        email: forgotEmail.trim().toLowerCase(),
        otp: forgotOtp.trim(),
        newPassword,
      });
      toast.success(data.message || 'Password reset successfully!');
      loginWithSession(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const resetAllModes = (mode = 'login') => {
    setAuthMode(mode);
    setForgotStep(1);
    setErrors({});
    setForgotOtp('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-900 p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-2xl p-6 sm:p-8 border border-dark-100 dark:border-dark-800 transition-all">
          {/* Header Bar */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-dark-100 dark:border-dark-800">
            <div className="flex items-center gap-3">
              {isAddingAccount && (
                <button
                  onClick={onCancelAdd}
                  className="p-1.5 rounded-lg hover:bg-dark-100 text-dark-500 dark:text-dark-400 dark:hover:bg-dark-700"
                  title="Back"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <div>
                <h1 className="text-xl font-bold text-dark-900 dark:text-white leading-tight">CRM</h1>
                <p className="text-xs text-dark-500 dark:text-dark-400">
                  {authMode === 'login'
                    ? 'Customer Relationship Management'
                    : authMode === 'register'
                    ? 'Caller Registration'
                    : 'Account Recovery'}
                </p>
              </div>
            </div>
          </div>

          {/* ================= MODE 1: LOGIN ================= */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-dark-900 dark:text-white">Welcome back</h2>
                <p className="text-xs text-dark-500 dark:text-dark-400">Sign in to your CRM workspace with Email & Password</p>
              </div>

              {approvalNotice && (
                <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" size={16} />
                  <div className="flex-1">
                    <p className="font-semibold">Approval Required</p>
                    <p className="mt-0.5 leading-relaxed">{approvalNotice}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setApprovalNotice('')}
                    className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1.5">
                  {t('email') || 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="username email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                    }}
                    placeholder="Enter your registered email address"
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.email ? 'border-red-300 bg-red-50/50' : 'border-dark-200 dark:border-dark-700'
                    }`}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-dark-700 dark:text-dark-300">
                    {t('password') || 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => resetAllModes('forgot')}
                    className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                    }}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-2.5 border rounded-xl text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.password ? 'border-red-300 bg-red-50/50' : 'border-dark-200 dark:border-dark-700'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? 'Signing in...' : 'Sign In with Email & Password'}
              </button>

              {/* Quick Fill Admin Button */}
              <div className="pt-3 border-t border-dark-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@crm.com');
                    setPassword('admin123');
                    setErrors({});
                  }}
                  className="w-full p-2.5 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/70 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-left transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-semibold text-xs">
                    <ShieldCheck size={14} />
                    <span>Quick Fill: Master Admin</span>
                  </div>
                  <span className="text-[11px] font-mono text-dark-500 dark:text-dark-400">admin@crm.com</span>
                </button>
              </div>

              {/* Toggle to Register */}
              <div className="pt-2 text-center border-t border-dark-100 dark:border-dark-800">
                <p className="text-xs text-dark-600 dark:text-dark-400">
                  New Caller?{' '}
                  <button
                    type="button"
                    onClick={() => resetAllModes('register')}
                    className="font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline cursor-pointer"
                  >
                    Register Caller Account
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ================= MODE 2: REGISTER ================= */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-dark-900 dark:text-white">Caller Registration</h2>
                <p className="text-xs text-dark-500 dark:text-dark-400">
                  Create your caller account with email & password (requires admin approval)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    placeholder="e.g. Kusum Rathore"
                    className={`w-full pl-10 pr-4 py-2 border rounded-xl text-xs sm:text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.name ? 'border-red-300 bg-red-50/50' : 'border-dark-200 dark:border-dark-700'
                    }`}
                  />
                </div>
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="username email"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    placeholder="caller@example.com"
                    className={`w-full pl-10 pr-4 py-2 border rounded-xl text-xs sm:text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.email ? 'border-red-300 bg-red-50/50' : 'border-dark-200 dark:border-dark-700'
                    }`}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Phone Number <span className="text-dark-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                  <input
                    id="reg-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full pl-10 pr-4 py-2 border rounded-xl text-xs sm:text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 border-dark-200 dark:border-dark-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                  <input
                    id="reg-password"
                    name="password"
                    type={showRegPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    placeholder="At least 4 characters"
                    className={`w-full pl-10 pr-10 py-2 border rounded-xl text-xs sm:text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.password ? 'border-red-300 bg-red-50/50' : 'border-dark-200 dark:border-dark-700'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600"
                  >
                    {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                  <input
                    id="reg-confirm-password"
                    name="confirmPassword"
                    type={showRegPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={regForm.confirmPassword}
                    onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                    placeholder="Re-enter password"
                    className={`w-full pl-10 pr-4 py-2 border rounded-xl text-xs sm:text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.confirmPassword ? 'border-red-300 bg-red-50/50' : 'border-dark-200 dark:border-dark-700'
                    }`}
                  />
                </div>
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                {loading ? 'Submitting Registration...' : 'Register Caller Account'}
              </button>

              <div className="pt-2 text-center">
                <p className="text-xs text-dark-600 dark:text-dark-400">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => resetAllModes('login')}
                    className="font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline cursor-pointer"
                  >
                    Sign In with Email & Password
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ================= MODE 3: FORGOT PASSWORD ================= */}
          {authMode === 'forgot' && (
            <div>
              {forgotStep === 1 ? (
                <form onSubmit={handleSendForgotOtp} className="space-y-4">
                  <div className="mb-3">
                    <h2 className="text-lg font-bold text-dark-900 dark:text-white">Reset Password</h2>
                    <p className="text-xs text-dark-500 dark:text-dark-400">
                      Enter your account email to receive a 6-digit recovery OTP
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1.5">
                      Your Registered Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                      <input
                        id="forgot-email"
                        name="email"
                        type="email"
                        autoComplete="username email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          errors.forgotEmail ? 'border-red-300 bg-red-50/50' : 'border-dark-200 dark:border-dark-700'
                        }`}
                      />
                    </div>
                    {errors.forgotEmail && <p className="mt-1 text-xs text-red-500">{errors.forgotEmail}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                    {loading ? 'Sending Recovery Code...' : 'Send Recovery OTP'}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => resetAllModes('login')}
                      className="text-xs font-medium text-dark-500 hover:text-dark-700 dark:hover:text-dark-300 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft size={13} /> Back to Sign In
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2: OTP + New Password */
                <form onSubmit={handleVerifyResetPassword} className="space-y-3.5">
                  {/* Explicit hidden username field prevents password manager from saving OTP as username */}
                  <input
                    type="email"
                    name="username"
                    value={forgotEmail}
                    autoComplete="username"
                    className="hidden"
                    readOnly
                    tabIndex={-1}
                    aria-hidden="true"
                  />

                  <div className="text-center mb-3">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-1.5 shadow-xs">
                      <KeyRound size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-dark-900 dark:text-white">Set New Password</h2>
                    <p className="text-xs text-dark-500 dark:text-dark-400">
                      Enter the 6-digit code sent to <strong className="text-dark-900 dark:text-white">{forgotEmail}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-center text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1.5">
                      6-Digit Recovery Code
                    </label>
                    <input
                      id="forgot-otp"
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      autoFocus
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full text-center font-mono text-xl tracking-[0.4em] py-2 px-4 border border-dark-200 dark:border-dark-700 rounded-xl bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {errors.forgotOtp && <p className="mt-1 text-center text-xs text-red-500">{errors.forgotOtp}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                      <input
                        id="new-password"
                        name="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 4 characters"
                        className="w-full pl-10 pr-10 py-2 border rounded-xl text-xs sm:text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 border-dark-200 dark:border-dark-700"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.newPassword && <p className="mt-1 text-xs text-red-500">{errors.newPassword}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                      <input
                        id="confirm-new-password"
                        name="confirmNewPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full pl-10 pr-4 py-2 border rounded-xl text-xs sm:text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 border-dark-200 dark:border-dark-700"
                      />
                    </div>
                    {errors.confirmNewPassword && (
                      <p className="mt-1 text-xs text-red-500">{errors.confirmNewPassword}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || forgotOtp.length !== 6}
                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {loading ? 'Updating & Signing In...' : 'Save Password & Sign In'}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1.5">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="text-dark-500 hover:text-dark-700 dark:hover:text-dark-300 flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft size={13} /> Change Email
                    </button>

                    <button
                      type="button"
                      disabled={cooldown > 0 || loading}
                      onClick={() => handleSendForgotOtp()}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
