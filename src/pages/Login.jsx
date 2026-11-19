import { useState, useEffect, useRef } from 'react';
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
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
  UserPlus,
  Smartphone,
  Laptop,
  Monitor,
  Check,
  X,
  Shield,
  Sparkles,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  registerSendOtpRequest,
  registerVerifyOtpRequest,
  forgotPasswordSendOtpRequest,
  forgotPasswordVerifyResetRequest,
} from '../api/auth';

// Helper to dynamically detect user's device/platform for responsive indicators
function getDeviceType() {
  if (typeof window === 'undefined' || !navigator) return { type: 'desktop', label: 'Desktop' };
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return { type: 'mobile', label: 'Android Device' };
  if (/iPad|iPhone|iPod/.test(ua)) return { type: 'mobile', label: 'iOS Device' };
  if (/Macintosh|Mac OS X/.test(ua)) return { type: 'desktop', label: 'macOS' };
  if (/Windows/i.test(ua)) return { type: 'desktop', label: 'Windows PC' };
  if (/Linux/i.test(ua)) return { type: 'desktop', label: 'Linux System' };
  return { type: 'desktop', label: 'Desktop Device' };
}

// Password strength evaluator
function evaluatePasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: 'bg-transparent' };
  let score = 0;
  if (pwd.length >= 4) score += 1;
  if (pwd.length >= 8) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500', width: 'w-1/4' };
  if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500', width: 'w-2/4' };
  if (score === 3) return { score: 3, label: 'Good', color: 'bg-blue-500', width: 'w-3/4' };
  return { score: 4, label: 'Strong', color: 'bg-emerald-500', width: 'w-full' };
}

export default function Login({ isAddingAccount = false, onCancelAdd }) {
  // Modes: 'login' | 'register' | 'forgot'
  const [authMode, setAuthMode] = useState('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [approvalNotice, setApprovalNotice] = useState('');
  const [sessionNotice, setSessionNotice] = useState('');

  // Register form state (Step 1: Details, Step 2: OTP Verification)
  const [regStep, setRegStep] = useState(1);
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regOtp, setRegOtp] = useState('');
  const [regCooldown, setRegCooldown] = useState(0);

  // Forgot password state
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // General loading & cooldown timers
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errors, setErrors] = useState({});
  const [currentDevice, setCurrentDevice] = useState({ type: 'desktop', label: 'Desktop' });

  const otpInputRef = useRef(null);
  const { login, loginWithSession, user } = useAuth();
  const { t } = useApp();

  // Detect platform & check for single-device session termination notices on mount
  useEffect(() => {
    setCurrentDevice(getDeviceType());
    try {
      const notice = sessionStorage.getItem('crm_session_notice');
      if (notice) {
        setSessionNotice(notice);
        sessionStorage.removeItem('crm_session_notice');
      }
    } catch {}
  }, []);

  // Cooldown timer for Forgot Password
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Cooldown timer for Registration OTP
  useEffect(() => {
    if (regCooldown <= 0) return;
    const timer = setInterval(() => {
      setRegCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [regCooldown]);

  // Auto-focus OTP input when entering step 2
  useEffect(() => {
    if (regStep === 2 && otpInputRef.current) {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 150);
    }
  }, [regStep]);

  // Dynamic admin check based on entered email
  const isAdminEmailEntered = email.trim().toLowerCase().startsWith('admin@') || email.trim().toLowerCase().includes('admin');

  // Only auto-hide when there's an authenticated user AND not in addingAccount mode
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
    setSessionNotice('');

    const result = await login(email.trim().toLowerCase(), password);
    if (result.success) {
      if (result.user?.role === 'admin' || result.user?.role === 'owner') {
        toast.success('Admin authenticated (Single Active Device Enforced)', { icon: '🔒' });
      } else {
        toast.success(t('loginSuccess') || 'Welcome back!');
      }
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

  // Step 1: Send random OTP to email
  const handleSendRegOtp = async (e) => {
    if (e) e.preventDefault();
    if (!validateRegForm()) return;

    setLoading(true);
    try {
      const data = await registerSendOtpRequest({
        name: regForm.name.trim(),
        email: regForm.email.trim().toLowerCase(),
        phone: regForm.phone.trim(),
        password: regForm.password,
      });

      const successMsg = data.message || `Verification code sent to ${regForm.email.trim().toLowerCase()}!`;
      toast.success(successMsg, { duration: 5000 });
      setRegStep(2);
      setRegCooldown(60);
      setRegOtp('');
      setErrors({});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch verification code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and register as member
  const handleVerifyRegOtp = async (e, customOtp) => {
    if (e) e.preventDefault();
    const cleanOtp = (customOtp || regOtp).trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrors({ regOtp: 'Please enter the 6-digit verification code' });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const data = await registerVerifyOtpRequest({
        email: regForm.email.trim().toLowerCase(),
        otp: cleanOtp,
      });

      toast.success(data.message || 'Registration verified successfully! Welcome to Smart CRM.');

      // If token and session are returned, log the member in immediately
      if (data.token && data.user) {
        loginWithSession(data);
      } else {
        setEmail(regForm.email.trim().toLowerCase());
        setPassword('');
        resetAllModes('login');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed. Please check the code.');
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
    setRegStep(1);
    setForgotStep(1);
    setErrors({});
    setForgotOtp('');
    setRegOtp('');
  };

  const pwdStrength = evaluatePasswordStrength(regForm.password);

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-radial from-[#132247] via-[#0d1630] to-[#070b18] dark:bg-[#070b18] px-3.5 py-6 sm:p-6 md:p-8 transition-colors select-none">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto">
        {/* Main Card with media-responsive border, glassmorphism, and padding */}
        <div className="bg-white/95 dark:bg-dark-850/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 md:p-8 border border-white/20 dark:border-dark-700/80 transition-all duration-300">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between mb-5 sm:mb-6 pb-3.5 sm:pb-4 border-b border-dark-100 dark:border-dark-750">
            <div className="flex items-center gap-3">
              {isAddingAccount && (
                <button
                  onClick={onCancelAdd}
                  className="p-1.5 sm:p-2 rounded-xl hover:bg-dark-100 text-dark-500 dark:text-dark-400 dark:hover:bg-dark-700 transition-colors cursor-pointer"
                  title="Back"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:sm:h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-md shadow-primary-500/20">
                  <Building2 size={20} className="sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-dark-900 dark:text-white tracking-tight leading-none">
                    Smart CRM
                  </h1>
                  <p className="text-[11px] sm:text-xs text-dark-500 dark:text-dark-400 font-medium mt-0.5">
                    {authMode === 'login'
                      ? 'Secure Workplace Access'
                      : authMode === 'register'
                      ? 'Member Registration & Activation'
                      : 'Account Access Recovery'}
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic Device / Security Badge */}
            <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-dark-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-dark-700">
              {currentDevice.type === 'mobile' ? <Smartphone size={11} /> : <Laptop size={11} />}
              <span>{currentDevice.label}</span>
            </div>
          </div>

          {/* Single Device Session Termination Notice (Displays when Admin was logged out from another device) */}
          {sessionNotice && (
            <div className="mb-4 p-3.5 rounded-2xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 text-xs flex items-start gap-2.5 shadow-sm">
              <ShieldAlert className="shrink-0 text-red-600 dark:text-red-400 mt-0.5" size={17} />
              <div className="flex-1">
                <p className="font-bold text-red-800 dark:text-red-300">Single Device Policy Enforced</p>
                <p className="mt-0.5 leading-relaxed text-[11px] sm:text-xs">{sessionNotice}</p>
              </div>
              <button
                type="button"
                onClick={() => setSessionNotice('')}
                className="text-red-500 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 font-bold text-xs cursor-pointer p-0.5"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* ================= MODE 1: LOGIN ================= */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="mb-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-bold text-dark-900 dark:text-white">Sign In</h2>
                  <span className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50 px-2 py-0.5 rounded-md border border-primary-100 dark:border-primary-900/40">
                    Admin &amp; Member
                  </span>
                </div>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                  Enter your registered credentials to access your CRM workspace
                </p>
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
                    className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Dynamic Single-Device Policy Notice when Admin Email is detected */}
              {isAdminEmailEntered && (
                <div className="p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 text-[11px] flex items-center gap-2">
                  <ShieldCheck className="shrink-0 text-blue-600 dark:text-blue-400" size={15} />
                  <span>
                    <strong>Admin Single-Device Policy:</strong> Logging in will automatically sign out any other active device session.
                  </span>
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
                    placeholder="name@domain.com"
                    className={`w-full pl-10 pr-4 py-2.5 sm:py-3 border rounded-xl text-xs sm:text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
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
                    className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium hover:underline cursor-pointer"
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
                    className={`w-full pl-10 pr-10 py-2.5 sm:py-3 border rounded-xl text-xs sm:text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                      errors.password ? 'border-red-300 bg-red-50/50' : 'border-dark-200 dark:border-dark-700'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 min-h-[44px] py-2.5 sm:py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-md shadow-primary-600/20 hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                {loading ? 'Authenticating...' : 'Sign In with Email & Password'}
              </button>

              {/* Toggle to Register */}
              <div className="pt-2 text-center border-t border-dark-100 dark:border-dark-800">
                <p className="text-xs text-dark-600 dark:text-dark-400">
                  New Member?{' '}
                  <button
                    type="button"
                    onClick={() => resetAllModes('register')}
                    className="font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline cursor-pointer ml-1"
                  >
                    Register Member Account
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ================= MODE 2: REGISTER ================= */}
          {authMode === 'register' && (
            <div>
              {regStep === 1 ? (
                /* Step 1: User info & password form */
                <form onSubmit={handleSendRegOtp} className="space-y-3 sm:space-y-3.5">
                  <div className="mb-2">
                    <h2 className="text-base sm:text-lg font-bold text-dark-900 dark:text-white">Member Registration</h2>
                    <p className="text-xs text-dark-500 dark:text-dark-400">
                      Step 1 of 2: Fill details to receive your 6-digit email OTP
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
                        onChange={(e) => {
                          setRegForm({ ...regForm, name: e.target.value });
                          if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
                        }}
                        placeholder="e.g. Kusum Rathore"
                        className={`w-full pl-10 pr-4 py-2 sm:py-2.5 border rounded-xl text-xs sm:text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
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
                        onChange={(e) => {
                          setRegForm({ ...regForm, email: e.target.value });
                          if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                        }}
                        placeholder="member@domain.com"
                        className={`w-full pl-10 pr-4 py-2 sm:py-2.5 border rounded-xl text-xs sm:text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
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
                        className="w-full pl-10 pr-4 py-2 sm:py-2.5 border rounded-xl text-xs sm:text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 border-dark-200 dark:border-dark-700"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-dark-700 dark:text-dark-300">
                        Password <span className="text-red-500">*</span>
                      </label>
                      {regForm.password && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          pwdStrength.score >= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {pwdStrength.label}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                      <input
                        id="reg-password"
                        name="password"
                        type={showRegPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={regForm.password}
                        onChange={(e) => {
                          setRegForm({ ...regForm, password: e.target.value });
                          if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                        }}
                        placeholder="At least 4 characters"
                        className={`w-full pl-10 pr-10 py-2 sm:py-2.5 border rounded-xl text-xs sm:text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          errors.password ? 'border-red-300 bg-red-50/50' : 'border-dark-200 dark:border-dark-700'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 cursor-pointer p-1"
                      >
                        {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Dynamic Password Strength Bar */}
                    {regForm.password && (
                      <div className="w-full bg-dark-100 dark:bg-dark-750 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${pwdStrength.color} ${pwdStrength.width}`} />
                      </div>
                    )}
                    {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-dark-700 dark:text-dark-300">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      {regForm.confirmPassword && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold">
                          {regForm.password === regForm.confirmPassword ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                              <Check size={11} /> Passwords match
                            </span>
                          ) : (
                            <span className="text-red-500 flex items-center gap-0.5">
                              <X size={11} /> No match
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                      <input
                        id="reg-confirm-password"
                        name="confirmPassword"
                        type={showRegPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={regForm.confirmPassword}
                        onChange={(e) => {
                          setRegForm({ ...regForm, confirmPassword: e.target.value });
                          if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
                        }}
                        placeholder="Re-enter password"
                        className={`w-full pl-10 pr-4 py-2 sm:py-2.5 border rounded-xl text-xs sm:text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          errors.confirmPassword ? 'border-red-300 bg-red-50/50' : 'border-dark-200 dark:border-dark-700'
                        }`}
                      />
                    </div>
                    {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 min-h-[44px] py-2.5 sm:py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-md shadow-primary-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                    {loading ? 'Sending Verification OTP...' : 'Send OTP & Continue'}
                  </button>

                  <div className="pt-2 text-center">
                    <p className="text-xs text-dark-600 dark:text-dark-400">
                      Already registered?{' '}
                      <button
                        type="button"
                        onClick={() => resetAllModes('login')}
                        className="font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline cursor-pointer ml-1"
                      >
                        Sign In
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                /* Step 2: OTP Verification & Member Activation */
                <form onSubmit={handleVerifyRegOtp} className="space-y-4">
                  <div className="text-center mb-2">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xs">
                      <ShieldCheck size={26} />
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-dark-900 dark:text-white">Verify Your Email</h2>
                    <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                      Enter the random 6-digit code sent to
                    </p>
                    <div className="inline-block mt-1 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/40 text-xs font-semibold text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/60">
                      {regForm.email}
                    </div>
                  </div>

                  <div>
                    <label className="block text-center text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1.5">
                      6-Digit Security OTP
                    </label>
                    <input
                      ref={otpInputRef}
                      id="reg-otp"
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={regOtp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setRegOtp(val);
                        if (errors.regOtp) setErrors((prev) => ({ ...prev, regOtp: null }));
                        // Dynamic auto-submit when 6 digits are typed or pasted
                        if (val.length === 6) {
                          handleVerifyRegOtp(null, val);
                        }
                      }}
                      placeholder="••••••"
                      className="w-full text-center font-mono text-xl sm:text-2xl tracking-[0.25em] sm:tracking-[0.4em] py-2.5 sm:py-3 px-3 border border-dark-200 dark:border-dark-700 rounded-xl bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-inner"
                    />
                    {errors.regOtp && <p className="mt-1 text-center text-xs text-red-500">{errors.regOtp}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || regOtp.length !== 6}
                    className="w-full min-h-[44px] py-2.5 sm:py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {loading ? 'Verifying OTP...' : 'Verify OTP & Complete Registration'}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="text-dark-500 hover:text-dark-700 dark:hover:text-dark-300 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <ArrowLeft size={13} /> Edit Details
                    </button>

                    <button
                      type="button"
                      disabled={regCooldown > 0 || loading}
                      onClick={() => handleSendRegOtp()}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                      {regCooldown > 0 ? `Resend in ${regCooldown}s` : 'Resend Code'}
                    </button>
                  </div>

                  <div className="text-center pt-2 border-t border-dark-100 dark:border-dark-800">
                    <button
                      type="button"
                      onClick={() => resetAllModes('login')}
                      className="text-xs text-dark-500 hover:text-dark-700 dark:hover:text-dark-300 cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ================= MODE 3: FORGOT PASSWORD ================= */}
          {authMode === 'forgot' && (
            <div>
              {forgotStep === 1 ? (
                <form onSubmit={handleSendForgotOtp} className="space-y-4">
                  <div className="mb-2">
                    <h2 className="text-base sm:text-lg font-bold text-dark-900 dark:text-white">Reset Password</h2>
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
                        className={`w-full pl-10 pr-4 py-2.5 sm:py-3 border rounded-xl text-xs sm:text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          errors.forgotEmail ? 'border-red-300 bg-red-50/50' : 'border-dark-200 dark:border-dark-700'
                        }`}
                      />
                    </div>
                    {errors.forgotEmail && <p className="mt-1 text-xs text-red-500">{errors.forgotEmail}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[44px] py-2.5 sm:py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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

                  <div className="text-center mb-2">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mx-auto mb-1.5 shadow-xs">
                      <KeyRound size={20} />
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-dark-900 dark:text-white">Set New Password</h2>
                    <p className="text-xs text-dark-500 dark:text-dark-400">
                      Code sent to <strong className="text-dark-900 dark:text-white">{forgotEmail}</strong>
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
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      maxLength={6}
                      autoFocus
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-full text-center font-mono text-xl sm:text-2xl tracking-[0.25em] sm:tracking-[0.4em] py-2 px-4 border border-dark-200 dark:border-dark-700 rounded-xl bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 cursor-pointer p-1"
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
                    className="w-full min-h-[44px] py-2.5 sm:py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {loading ? 'Updating Password...' : 'Save Password & Sign In'}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1.5 px-1">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="text-dark-500 hover:text-dark-700 dark:hover:text-dark-300 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <ArrowLeft size={13} /> Change Email
                    </button>

                    <button
                      type="button"
                      disabled={cooldown > 0 || loading}
                      onClick={() => handleSendForgotOtp()}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold disabled:opacity-50 flex items-center gap-1 cursor-pointer"
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
