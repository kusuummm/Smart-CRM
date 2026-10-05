import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  Eye,
  EyeOff,
  Building2,
  Languages,
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
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  registerSendOtpRequest,
  registerVerifyOtpRequest,
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

  // Register form state
  const [registerStep, setRegisterStep] = useState(1); // 1: Info, 2: OTP
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [regOtp, setRegOtp] = useState('');
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
  const { language, toggleLanguage, t } = useApp();

  // Cooldown countdown timer for OTP resend
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
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email format';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 4) errs.password = 'Password must be at least 4 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!validateLogin()) return;
    setLoading(true);
    const result = await login(email.trim(), password);
    if (result.success) {
      toast.success(t('loginSuccess') || (language === 'hi' ? 'स्वागत है!' : 'Welcome back!'));
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  // ================= 2. REGISTRATION HANDLERS =================
  const validateRegStep1 = () => {
    const errs = {};
    if (!regForm.name.trim()) errs.name = 'Full Name is required';
    if (!regForm.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(regForm.email)) errs.email = 'Invalid email format';
    if (!regForm.password) errs.password = 'Password is required';
    else if (regForm.password.length < 4) errs.password = 'Password must be at least 4 characters';
    if (regForm.password !== regForm.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSendRegOtp = async (e) => {
    if (e) e.preventDefault();
    if (!validateRegStep1()) return;

    setLoading(true);
    try {
      const data = await registerSendOtpRequest({
        name: regForm.name.trim(),
        email: regForm.email.trim(),
        phone: regForm.phone.trim(),
        password: regForm.password,
      });
      toast.success(data.message || 'Verification code sent to your email!');
      setRegisterStep(2);
      setCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRegOtp = async (e) => {
    e.preventDefault();
    if (!regOtp || regOtp.trim().length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const data = await registerVerifyOtpRequest({
        email: regForm.email.trim(),
        otp: regOtp.trim(),
      });
      toast.success(data.message || 'Account verified and created successfully!');
      loginWithSession(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired code');
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
      const data = await forgotPasswordSendOtpRequest({ email: forgotEmail.trim() });
      toast.success(data.message || 'Reset code sent to your email!');
      setForgotStep(2);
      setCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset code');
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
        email: forgotEmail.trim(),
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
    setRegisterStep(1);
    setForgotStep(1);
    setErrors({});
    setRegOtp('');
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
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
                <Building2 className="text-white" size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-dark-900 dark:text-white leading-tight">SmartCRM</h1>
                <p className="text-xs text-dark-500 dark:text-dark-400">
                  {authMode === 'login'
                    ? 'Customer Relationship Management'
                    : authMode === 'register'
                    ? 'Member Registration'
                    : 'Account Recovery'}
                </p>
              </div>
            </div>

            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-dark-600 dark:text-dark-300 bg-dark-100 dark:bg-dark-800 hover:bg-dark-200 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              <Languages size={13} />
              {language === 'en' ? 'हिंदी' : 'English'}
            </button>
          </div>

          {/* ================= MODE 1: LOGIN ================= */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-dark-900 dark:text-white">Welcome back</h2>
                <p className="text-xs text-dark-500 dark:text-dark-400">Sign in to your CRM workspace</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1.5">
                  {t('email') || 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@crm.com"
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
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                className="w-full mt-2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              {/* Toggle to Register */}
              <div className="pt-2 text-center border-t border-dark-100 dark:border-dark-800">
                <p className="text-xs text-dark-600 dark:text-dark-400">
                  New to SmartCRM?{' '}
                  <button
                    type="button"
                    onClick={() => resetAllModes('register')}
                    className="font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
                  >
                    Create an account
                  </button>
                </p>
              </div>

              {/* Demo Credentials */}
              <div className="mt-3 p-3 bg-dark-50 dark:bg-dark-800/60 rounded-xl border border-dark-100 dark:border-dark-700/60">
                <p className="text-[11px] font-semibold text-dark-700 dark:text-dark-300 mb-1">Quick Demo Login:</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('admin@crm.com');
                      setPassword('admin123');
                    }}
                    className="px-2.5 py-1 text-[11px] bg-white dark:bg-dark-700 border border-dark-200 dark:border-dark-600 rounded-lg text-dark-700 dark:text-dark-200 hover:bg-dark-100"
                  >
                    Admin Fill
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('john@crm.com');
                      setPassword('john123');
                    }}
                    className="px-2.5 py-1 text-[11px] bg-white dark:bg-dark-700 border border-dark-200 dark:border-dark-600 rounded-lg text-dark-700 dark:text-dark-200 hover:bg-dark-100"
                  >
                    Telecaller Fill
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ================= MODE 2: REGISTER ================= */}
          {authMode === 'register' && (
            <div>
              {registerStep === 1 ? (
                <form onSubmit={handleSendRegOtp} className="space-y-3.5">
                  <div className="mb-2">
                    <h2 className="text-lg font-bold text-dark-900 dark:text-white">Create an Account</h2>
                    <p className="text-xs text-dark-500 dark:text-dark-400">
                      Step 1 of 2: Enter your details to receive an email OTP
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                      <input
                        type="text"
                        value={regForm.name}
                        onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                        placeholder="John Doe"
                        className={`w-full pl-10 pr-4 py-2 border rounded-xl text-xs sm:text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          errors.name ? 'border-red-300 bg-red-50/50' : 'border-dark-200 dark:border-dark-700'
                        }`}
                      />
                    </div>
                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                      Real Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                      <input
                        type="email"
                        value={regForm.email}
                        onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                        placeholder="you@gmail.com"
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
                        type="tel"
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
                        type={showRegPassword ? 'text' : 'password'}
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
                        type={showRegPassword ? 'text' : 'password'}
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
                    className="w-full mt-2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    {loading ? 'Sending Verification Code...' : 'Send Verification OTP'}
                  </button>

                  <div className="pt-2 text-center">
                    <p className="text-xs text-dark-600 dark:text-dark-400">
                      Already registered?{' '}
                      <button
                        type="button"
                        onClick={() => resetAllModes('login')}
                        className="font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
                      >
                        Sign In here
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                /* Step 2: Enter OTP */
                <form onSubmit={handleVerifyRegOtp} className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xs">
                      <ShieldCheck size={26} />
                    </div>
                    <h2 className="text-lg font-bold text-dark-900 dark:text-white">Verify Your Email</h2>
                    <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                      We sent a 6-digit code to{' '}
                      <strong className="text-dark-900 dark:text-white">{regForm.email}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-center text-xs font-semibold text-dark-700 dark:text-dark-300 mb-2">
                      Enter 6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      value={regOtp}
                      onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full text-center font-mono text-2xl tracking-[0.4em] py-3 px-4 border border-dark-200 dark:border-dark-700 rounded-xl bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-[11px] text-center text-dark-400 dark:text-dark-500 mt-1">
                      Check your inbox or Spam/Junk folder
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || regOtp.length !== 6}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {loading ? 'Verifying & Creating Account...' : 'Verify & Sign In'}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <button
                      type="button"
                      onClick={() => setRegisterStep(1)}
                      className="text-dark-500 hover:text-dark-700 dark:hover:text-dark-300 flex items-center gap-1"
                    >
                      <ArrowLeft size={13} /> Edit Details
                    </button>

                    <button
                      type="button"
                      disabled={cooldown > 0 || loading}
                      onClick={() => handleSendRegOtp()}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium disabled:opacity-50 flex items-center gap-1"
                    >
                      <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
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
                        type="email"
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
                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                    {loading ? 'Sending Recovery Code...' : 'Send Recovery OTP'}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => resetAllModes('login')}
                      className="text-xs font-medium text-dark-500 hover:text-dark-700 dark:hover:text-dark-300 inline-flex items-center gap-1"
                    >
                      <ArrowLeft size={13} /> Back to Sign In
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2: OTP + New Password */
                <form onSubmit={handleVerifyResetPassword} className="space-y-3.5">
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
                      type="text"
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
                        type={showNewPassword ? 'text' : 'password'}
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
                        type={showNewPassword ? 'text' : 'password'}
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
                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {loading ? 'Updating & Signing In...' : 'Save Password & Sign In'}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1.5">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="text-dark-500 hover:text-dark-700 dark:hover:text-dark-300 flex items-center gap-1"
                    >
                      <ArrowLeft size={13} /> Change Email
                    </button>

                    <button
                      type="button"
                      disabled={cooldown > 0 || loading}
                      onClick={() => handleSendForgotOtp()}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium disabled:opacity-50 flex items-center gap-1"
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
