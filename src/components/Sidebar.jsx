import { useApp } from '../context/AppContext';
import { LayoutDashboard, Users, TrendingUp, CalendarCheck, Phone, MessageCircle, Mail, Calendar, BarChart3, Search, Shield, ChevronLeft, ChevronRight, Bell } from 'lucide-react';

export default function Sidebar({ user, currentPage, onNavigate, collapsed, onToggle }) {
  const { t } = useApp();
  const isAdmin = user?.role === 'admin';

  const adminMenuItems = [
    { id: 'dashboard', key: 'dashboard', icon: LayoutDashboard },
    { id: 'customers', key: 'customers', icon: Users },
    { id: 'leads', key: 'leads', icon: TrendingUp },
    { id: 'followups', key: 'followups', icon: CalendarCheck },
    { id: 'calls', key: 'calls', icon: Phone },
    { id: 'whatsapp', key: 'whatsapp', icon: MessageCircle },
    { id: 'emails', key: 'emails', icon: Mail },
    { id: 'events', key: 'events', icon: Calendar },
    { id: 'reports', key: 'reports', icon: BarChart3 },
    { id: 'search', key: 'search', icon: Search },
  ];

  const adminOnlyItems = [
    { id: 'admin-panel', key: 'adminPanel', icon: Shield },
  ];

  const telecallerMenuItems = [
    { id: 'tc-dashboard', key: 'telecallerDashboard', icon: LayoutDashboard },
    { id: 'tc-customers', key: 'myCustomers', icon: Users },
    { id: 'tc-leads', key: 'myLeads', icon: TrendingUp },
    { id: 'tc-followups', key: 'followups', icon: CalendarCheck },
    { id: 'tc-calls', key: 'calls', icon: Phone },
    { id: 'tc-whatsapp', key: 'whatsapp', icon: MessageCircle },
    { id: 'tc-emails', key: 'emails', icon: Mail },
    { id: 'tc-events', key: 'events', icon: Calendar },
    { id: 'tc-search', key: 'search', icon: Search },
  ];

  const menuItems = isAdmin ? adminMenuItems : telecallerMenuItems;
  const extraItems = isAdmin ? adminOnlyItems : [];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out bg-white dark:bg-dark-900 border-r border-dark-200 dark:border-dark-700 flex flex-col ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-dark-200 dark:border-dark-700 flex-shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm tracking-tight">CRM</span>
            </div>
            <div>
              <h1 className="font-bold text-base text-dark-900 dark:text-white leading-none">Smart</h1>
              <h1 className="font-bold text-base text-primary-600 leading-none -mt-0.5">CRM</h1>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center mx-auto shadow-sm">
            <span className="text-white font-bold text-sm tracking-tight">CRM</span>
          </div>
        )}
        <button onClick={onToggle} className="hidden lg:flex p-1.5 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 text-dark-500 dark:text-dark-400 transition-colors dark:hover:bg-dark-600">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-3 px-3 py-2 overflow-y-auto scrollbar-thin">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'text-dark-600 dark:text-dark-400 hover:bg-dark-50 dark:hover:bg-dark-800 hover:text-dark-900 dark:hover:text-dark-200'
                }`}
                title={collapsed ? t(item.key) : undefined}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-primary-600' : ''} />
                {!collapsed && <span>{t(item.key)}</span>}
              </button>
            );
          })}
        </div>

        {extraItems.length > 0 && (
          <div className="mt-6 pt-4 border-t border-dark-200 dark:border-dark-700">
            {!collapsed && (
              <p className="px-3 text-[10px] font-bold text-dark-400 dark:text-dark-500 uppercase tracking-wider mb-2">
                Administration
              </p>
            )}
            <div className="space-y-1">
              {extraItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 shadow-sm'
                        : 'text-dark-600 dark:text-dark-400 hover:bg-dark-50 dark:hover:bg-dark-800 hover:text-dark-900 dark:hover:text-dark-200'
                    }`}
                    title={collapsed ? t(item.key) : undefined}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-primary-600' : ''} />
                    {!collapsed && <span>{t(item.key)}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-dark-200 dark:border-dark-700 p-3 flex-shrink-0">
        {!collapsed ? (
          <button
            onClick={() => onNavigate?.('my-account')}
            className="w-full bg-dark-50 dark:bg-dark-800 rounded-xl p-3 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-xs tracking-wide">{user?.avatar}</span>
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${user?.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-dark-900 dark:text-white group-hover:text-primary-700 truncate">{user?.name}</p>
                <p className="text-xs text-dark-500 dark:text-dark-400 capitalize flex items-center gap-1">
                  {isAdmin ? (
                    <span className="flex items-center gap-1"><Shield size={10} /> {t('adminPanel')}</span>
                  ) : (
                    <span className="flex items-center gap-1"><Bell size={10} /> {t('telecaller') || 'Telecaller'}</span>
                  )}
                </p>
              </div>
            </div>
          </button>
        ) : (
          <button
            onClick={() => onNavigate?.('my-account')}
            className="w-full flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            title={user?.name}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-sm relative">
              <span className="text-white font-bold text-xs">{user?.avatar}</span>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${user?.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </div>
          </button>
        )}
      </div>
    </aside>
  );
}
