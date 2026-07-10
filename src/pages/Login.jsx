import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Eye, EyeOff, Building2, Languages, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Login({ isAddingAccount = false, onCancelAdd }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login, user } = useAuth();
  const { language, toggleLanguage, t } = useApp();

  // Only auto-hide when there's a logged-in user AND we're not deliberately
  // showing this screen to add another account.
  if (user && !isAddingAccount) return null;

  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email format';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 4) errs.password = 'Password must be at least 4 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      toast.success(t('loginSuccess') || (language === 'hi' ? 'स्वागत है!' : 'Welcome back!'));
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-2xl p-8 dark:bg-dark-800">
          {/* Logo + Language Toggle */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              {isAddingAccount && (
                <button onClick={onCancelAdd} className="mr-1 p-1.5 rounded-lg hover:bg-dark-100 text-dark-500 dark:text-dark-400 dark:hover:bg-dark-700" title="Back">
                  <ArrowLeft size={18} />
                </button>
              )}
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
                <Building2 className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-dark-900 dark:text-white">SmartCRM</h1>
                <p className="text-sm text-dark-500 dark:text-dark-400">{isAddingAccount ? 'Sign in to add another account' : (t('customerManagement') || 'Customer Relationship Management')}</p>
              </div>
            </div>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-dark-600 dark:text-dark-300 bg-dark-100 dark:bg-dark-800 hover:bg-dark-200 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              <Languages size={14} />
              {language === 'en' ? 'हिंदी' : 'English'}
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5 dark:text-gray-300">{t('email') || 'Email Address'}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@crm.com"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.email ? 'border-red-300 bg-red-50' : 'border-dark-200 dark:border-dark-600'}`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5 dark:text-gray-300">{t('password') || 'Password'}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-4 py-2.5 pr-10 border rounded-lg text-sm bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.password ? 'border-red-300 bg-red-50' : 'border-dark-200 dark:border-dark-600'}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 dark:text-dark-500">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-dark-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (t('signingIn') || 'Signing in...') : (t('signIn') || 'Sign In')}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-dark-50 dark:bg-dark-800 rounded-lg">
            <p className="text-xs font-semibold text-dark-700 dark:text-dark-300 mb-2 dark:text-gray-300">{t('demoCredentials') || 'Demo Credentials:'}</p>
            <div className="space-y-1 text-xs text-dark-500 dark:text-dark-400">
              <p><span className="font-medium">Admin:</span> admin@crm.com / admin123</p>
              <p><span className="font-medium">Telecaller:</span> john@crm.com / john123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
