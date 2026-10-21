import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { ConfirmProvider } from './context/ConfirmContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { Toaster } from 'react-hot-toast';
import { isAdminOrOwner, isManager, isOwner } from './utils/permissions';

// Core synchronous pages for instant initial paint
import Login from './pages/Login';
import HomeDashboard from './pages/HomeDashboard';

// Dynamic code-split pages (loaded on demand)
const Teams = lazy(() => import('./pages/Teams'));
const Insights = lazy(() => import('./pages/Insights'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const Contacts = lazy(() => import('./pages/Contacts'));
const Leads = lazy(() => import('./pages/Leads'));
const ToDos = lazy(() => import('./pages/ToDos'));
const FollowUps = lazy(() => import('./pages/FollowUps'));
const CallHistory = lazy(() => import('./pages/CallHistory'));
const WhatsApp = lazy(() => import('./pages/WhatsApp'));
const Broadcast = lazy(() => import('./pages/Broadcast'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const PlansBilling = lazy(() => import('./pages/PlansBilling'));
const Automations = lazy(() => import('./pages/Automations'));
const TeamMembers = lazy(() => import('./pages/TeamMembers'));
const Notes = lazy(() => import('./pages/Notes'));
const QuickMessage = lazy(() => import('./pages/QuickMessage'));
const Emails = lazy(() => import('./pages/Emails'));
const Events = lazy(() => import('./pages/Events'));
const Reports = lazy(() => import('./pages/Reports'));
const ReportDetails = lazy(() => import('./pages/ReportDetails'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const UserPanel = lazy(() => import('./pages/UserPanel'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const MyAccount = lazy(() => import('./pages/MyAccount'));
const Settings = lazy(() => import('./pages/Settings'));

function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[420px] w-full">
      <div className="flex flex-col items-center gap-3 text-dark-500 dark:text-dark-400">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold animate-pulse text-dark-600 dark:text-dark-300">Loading view...</span>
      </div>
    </div>
  );
}

// Interactive Modals matching reference UI
import BuyNumberModal from './components/BuyNumberModal';
import LogoutModal from './components/LogoutModal';

// Route path to internal page ID mapping
const pathToPage = {
  '/': null,
  '/home': 'home',
  '/teams': 'teams',
  '/call-history': 'call-history',
  '/calls': 'call-history',
  '/reports': 'reports',
  '/reports/detail': 'report-detail',
  '/reports/details': 'report-detail',
  '/insights': 'insights',
  '/dashboard': 'dashboard',
  '/todos': 'todos',
  '/followups': 'todos',
  '/contacts': 'contacts',
  '/customers': 'contacts',
  '/leads': 'leads',
  '/whatsapp': 'whatsapp',
  '/broadcast': 'broadcast',
  '/wallet': 'wallet',
  '/plans-billing': 'plans-billing',
  '/plans': 'plans-billing',
  '/billing': 'plans-billing',
  '/settings': 'settings',
  '/team-members': 'team-members',
  '/team': 'team-members',
  '/notes': 'notes',
  '/automations': 'automations',
  '/quick-message': 'quick-message',
  '/emails': 'emails',
  '/events': 'events',
  '/search': 'search',
  '/my-account': 'my-account',
  '/admin': 'admin-panel',
  '/admin/overview': 'admin-panel',
  '/admin/users': 'admin-users',
  '/admin/agents': 'admin-agents',
  '/admin/workload': 'admin-workload',
  '/admin/reports': 'admin-reports',
  '/admin/tasks': 'admin-tasks',
  '/admin/portfolio': 'admin-portfolio',
  '/admin/audit': 'admin-audit',
  '/admin/system': 'admin-system',
  '/admin/system/smtp': 'admin-system-smtp',
  '/admin/system/whatsapp': 'admin-system-whatsapp',
  '/admin/system/database': 'admin-system-database',
};

// Internal page ID to URL route path mapping
const pageToPath = {
  home: '/home',
  teams: '/teams',
  'call-history': '/call-history',
  calls: '/call-history',
  'tc-calls': '/call-history',
  reports: '/reports',
  'report-detail': '/reports/detail',
  'report-details': '/reports/detail',
  insights: '/insights',
  dashboard: '/dashboard',
  todos: '/todos',
  followups: '/todos',
  'tc-followups': '/todos',
  contacts: '/contacts',
  customers: '/contacts',
  'tc-customers': '/contacts',
  leads: '/leads',
  'tc-leads': '/leads',
  whatsapp: '/whatsapp',
  'whatsapp-archive': '/whatsapp',
  'tc-whatsapp': '/whatsapp',
  broadcast: '/broadcast',
  wallet: '/wallet',
  'plans-billing': '/plans-billing',
  plans: '/plans-billing',
  billing: '/plans-billing',
  emails: '/emails',
  'tc-emails': '/emails',
  events: '/events',
  'tc-events': '/events',
  settings: '/settings',
  'team-members': '/team-members',
  team: '/team-members',
  notes: '/notes',
  automations: '/automations',
  'quick-message': '/quick-message',
  search: '/search',
  'tc-search': '/search',
  'my-account': '/my-account',
  'admin-panel': '/admin',
  'admin-overview': '/admin',
  'admin-users': '/admin/users',
  'admin-agents': '/admin/agents',
  'admin-workload': '/admin/workload',
  'admin-reports': '/admin/reports',
  'admin-tasks': '/admin/tasks',
  'admin-portfolio': '/admin/portfolio',
  'admin-audit': '/admin/audit',
  'admin-system': '/admin/system',
  'admin-system-smtp': '/admin/system/smtp',
  'admin-system-whatsapp': '/admin/system/whatsapp',
  'admin-system-database': '/admin/system/database',
  'caller-view': '/home',
};

// Caller-only panel page IDs (Admin is strictly blocked from accessing these personal caller views)
const CALLER_PANEL_PAGES = new Set([
  'home',
  'tc-calls',
  'tc-customers',
  'tc-leads',
  'tc-whatsapp',
  'tc-emails',
  'tc-events',
  'tc-search',
]);

function AppLayout() {
  const { user, logout } = useAuth();
  const isAdmin = isAdminOrOwner(user);
  const manager = isManager(user);
  const location = useLocation();
  const navigate = useNavigate();

  // Resolve current page from URL pathname with strict role boundaries
  const resolvePageFromPath = (pathname) => {
    const cleanPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

    if (isAdmin) {
      // STRICT RULE: Admin/Owner cannot access personal caller panels!
      if (cleanPath === '/' || !cleanPath) {
        return 'admin-panel';
      }
      if (cleanPath.startsWith('/admin')) {
        return pathToPage[cleanPath] || 'admin-panel';
      }
      const pageId = pathToPage[cleanPath];
      if (pageId && CALLER_PANEL_PAGES.has(pageId)) {
        return 'admin-panel';
      }
      return pageId || 'admin-panel';
    }

    if (manager) {
      // Managers supervise teams and review team progress reports
      if (cleanPath === '/' || !cleanPath) {
        return 'teams';
      }
      if (cleanPath === '/admin/reports' || cleanPath === '/reports') {
        return 'admin-reports';
      }
      if (cleanPath.startsWith('/admin')) {
        return 'teams';
      }
      return pathToPage[cleanPath] || 'teams';
    }

    // STRICT RULE: Callers cannot access admin panel or overview!
    if (cleanPath === '/' || !cleanPath || cleanPath.startsWith('/admin')) {
      return 'home';
    }

    return pathToPage[cleanPath] || 'home';
  };

  const [currentPage, setCurrentPage] = useState(() => resolvePageFromPath(location.pathname));
  const [collapsed, setCollapsed] = useState(false);

  // Sync state and enforce strict role boundaries on route transitions
  useEffect(() => {
    const targetPage = resolvePageFromPath(location.pathname);
    if (currentPage !== targetPage) {
      setCurrentPage(targetPage);
    }

    if (isAdmin) {
      // Admin/Owner cannot access personal caller panels
      const pageId = pathToPage[location.pathname] || targetPage;
      if (CALLER_PANEL_PAGES.has(pageId) || location.pathname === '/' || location.pathname === '/home') {
        navigate('/admin', { replace: true });
      }
    } else if (manager) {
      // Manager lands on /teams and can view /admin/reports
      if (location.pathname === '/') {
        navigate('/teams', { replace: true });
      } else if (location.pathname.startsWith('/admin') && location.pathname !== '/admin/reports') {
        navigate('/teams', { replace: true });
      }
    } else {
      // Callers cannot access admin panel
      if (location.pathname.startsWith('/admin') || location.pathname === '/') {
        navigate('/home', { replace: true });
      }
    }
  }, [location.pathname, isAdmin, manager]);

  // Sub-navigation filters & parameters
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedLeadStatus, setSelectedLeadStatus] = useState('');
  const [selectedReportId, setSelectedReportId] = useState('');
  const [selectedCallType, setSelectedCallType] = useState('all');
  const [reportDetailFilter, setReportDetailFilter] = useState({
    category: 'all',
    subStatus: 'all',
    title: '',
  });

  // Modals visibility
  const [isBuyNumberOpen, setIsBuyNumberOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  // Clear all legacy dummy/mock data caches so user has a 100% clean slate
  useEffect(() => {
    const purgeKey = 'smartcrm_data_purged_v6';
    const contactsCache = localStorage.getItem('smartcrm_contacts') || '';
    const callsCache = localStorage.getItem('smartcrm_all_calls') || '';

    const hasDummyContacts =
      /aarav sharma|priya patel|vikram singh|private client|sharma enterprises|patel logistics|apex realty|9876543210|9812345678|9988776655/i.test(
        contactsCache
      );
    const hasDummyCalls =
      /ramesh verma|anita desai|vikram singh|swati kulkarni|rajesh gupta|sunita rao|amit shah|neha agarwal/i.test(
        callsCache
      );
    const isPurged = localStorage.getItem(purgeKey);

    if (!isPurged || hasDummyContacts || hasDummyCalls) {
      localStorage.setItem(purgeKey, 'true');
      localStorage.removeItem('smartcrm_contacts');
      localStorage.removeItem('smartcrm_all_calls');
      localStorage.removeItem('smartcrm_all_tasks');
      Object.keys(localStorage).forEach((key) => {
        if (
          key.startsWith('smartcrm_tasks_') ||
          key.startsWith('smartcrm_calls_') ||
          key.startsWith('smartcrm_notes_')
        ) {
          localStorage.removeItem(key);
        }
      });
    }
  }, []);

  const navigateWithCustomer = (page, value, type = 'customer') => {
    // Admin cannot navigate to caller panels
    if (isAdmin && CALLER_PANEL_PAGES.has(page)) {
      page = 'admin-panel';
    }
    if (!isAdmin && !manager && page.startsWith('admin-')) {
      page = 'home';
    } else if (manager && page.startsWith('admin-') && page !== 'admin-reports') {
      page = 'teams';
    }

    if (type === 'status') {
      setSelectedLeadStatus(value || '');
      setSelectedCustomer('');
      setSelectedReportId('');
    } else if (type === 'report') {
      setSelectedReportId(value || '');
      setSelectedCustomer('');
      setSelectedLeadStatus('');
    } else {
      setSelectedCustomer(value || '');
      setSelectedLeadStatus('');
      setSelectedReportId('');
    }
    setSelectedCallType('all');
    const targetPath = pageToPath[page] || (page.startsWith('/') ? page : `/${page}`);
    setCurrentPage(page);
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  const navigateToPage = (page, filter = null) => {
    // Admin cannot navigate to caller panels
    if (isAdmin && CALLER_PANEL_PAGES.has(page)) {
      page = 'admin-panel';
    }
    // Non-admins cannot navigate to restricted admin pages
    if (!isAdmin && !manager && page.startsWith('admin-')) {
      page = 'home';
    } else if (manager && page.startsWith('admin-') && page !== 'admin-reports') {
      page = 'teams';
    }

    setSelectedCustomer('');
    setSelectedLeadStatus('');
    setSelectedReportId('');
    if (page === 'report-detail' && typeof filter === 'object' && filter !== null) {
      setReportDetailFilter(filter);
    } else if (filter && typeof filter === 'string') {
      setSelectedCallType(filter);
    } else {
      setSelectedCallType('all');
    }
    const targetPath = pageToPath[page] || (page.startsWith('/') ? page : `/${page}`);
    setCurrentPage(page);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      // 1. Home Dashboard
      case 'home':
        return (
          <HomeDashboard
            onNavigate={navigateToPage}
            onOpenBuyNumber={() => setIsBuyNumberOpen(true)}
          />
        );

      // 2. Teams
      case 'teams':
        return (
          <Teams
            onNavigate={navigateToPage}
            onOpenBuyNumber={() => setIsBuyNumberOpen(true)}
          />
        );

      // 3. Call History
      case 'call-history':
      case 'calls':
      case 'tc-calls':
        return <CallHistory onNavigate={navigateToPage} initialCallType={selectedCallType} />;

      // 4. Reports
      case 'reports':
        return (isAdmin || manager) ? (
          <AdminPanel targetSection="admin-reports" onNavigate={navigateToPage} />
        ) : (
          <Reports initialReportId={selectedReportId} onNavigate={navigateToPage} />
        );

      // 4.1 Dedicated Report Elements Details Page (No Popups)
      case 'report-detail':
      case 'report-details':
        return (
          <ReportDetails
            filter={reportDetailFilter}
            onBack={() => navigateToPage('reports')}
            onNavigate={navigateToPage}
            staffName={user?.name || 'Kusum Rathore'}
            period="Oct 09, 2026 – Oct 09, 2026"
          />
        );

      // 5. Insights (Detailed Call & Customer Breakdowns)
      case 'insights':
        return <Insights onNavigate={navigateToPage} />;

      case 'dashboard':
        return <Dashboard onNavigate={navigateWithCustomer} />;

      // 6. To Dos (Tasks / Fresh Leads / Follow Ups / Reminders)
      case 'todos':
      case 'followups':
      case 'tc-followups':
        return <ToDos onNavigate={navigateToPage} />;

      // 7. Contacts (Customers)
      case 'contacts':
      case 'customers':
      case 'tc-customers':
        return <Contacts onNavigate={navigateToPage} />;

      // Existing extended CRM modules
      case 'leads':
      case 'tc-leads':
        return (
          <Leads
            onNavigate={navigateToPage}
            selectedCustomer={selectedCustomer}
            selectedLeadStatus={selectedLeadStatus}
          />
        );
      case 'whatsapp':
      case 'whatsapp-archive':
      case 'tc-whatsapp':
        return <WhatsApp onNavigate={navigateToPage} />;
      case 'broadcast':
        return <Broadcast onNavigate={navigateToPage} />;
      case 'wallet':
        return <WalletPage onNavigate={navigateToPage} />;
      case 'plans-billing':
      case 'plans':
      case 'billing':
        return <PlansBilling onNavigate={navigateToPage} />;
      case 'emails':
      case 'tc-emails':
        return <Emails onNavigate={navigateToPage} />;
      case 'events':
      case 'tc-events':
        return <Events onNavigate={navigateToPage} />;
      case 'admin-reports':
        return (isAdmin || manager) ? (
          <AdminPanel targetSection="admin-reports" onNavigate={navigateToPage} />
        ) : (
          <HomeDashboard
            onNavigate={navigateToPage}
            onOpenBuyNumber={() => setIsBuyNumberOpen(true)}
          />
        );
      case 'admin-panel':
      case 'admin-users':
      case 'admin-agents':
      case 'admin-workload':
      case 'admin-portfolio':
      case 'admin-audit':
      case 'admin-system':
      case 'admin-system-smtp':
      case 'admin-system-whatsapp':
      case 'admin-system-database':
      case 'admin-tasks':
        return isAdmin ? (
          <AdminPanel targetSection={currentPage} onNavigate={navigateToPage} />
        ) : (
          <HomeDashboard
            onNavigate={navigateToPage}
            onOpenBuyNumber={() => setIsBuyNumberOpen(true)}
          />
        );
      case 'caller-view':
        return (
          <HomeDashboard
            onNavigate={navigateToPage}
            onOpenBuyNumber={() => setIsBuyNumberOpen(true)}
          />
        );
      case 'user-panel':
      case 'tc-dashboard':
        return (
          <HomeDashboard
            onNavigate={navigateToPage}
            onOpenBuyNumber={() => setIsBuyNumberOpen(true)}
          />
        );
      case 'search':
      case 'tc-search':
        return <SearchPage onNavigate={navigateToPage} />;
      case 'my-account':
        return (
          <MyAccount
            onNavigate={navigateToPage}
            onLogout={() => setShowLogoutModal(true)}
          />
        );
      case 'settings':
        return <Settings onNavigate={navigateToPage} />;
      case 'team-members':
      case 'team':
        return <TeamMembers onNavigate={navigateToPage} />;
      case 'notes':
        return <Notes onNavigate={navigateToPage} />;
      case 'automations':
        return <Automations onNavigate={navigateToPage} />;
      case 'quick-message':
        return <QuickMessage onNavigate={navigateToPage} />;
      default:
        return (
          <HomeDashboard
            onNavigate={navigateToPage}
            onOpenBuyNumber={() => setIsBuyNumberOpen(true)}
          />
        );
    }
  };

  const pageContent = useMemo(
    () => renderPage(),
    [currentPage, selectedCustomer, selectedLeadStatus, selectedReportId, isAdmin, user]
  );

  return (
    <div className="min-h-screen bg-[#fafbfd] dark:bg-dark-950 flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Top Header */}
      <Header
        user={user}
        isAdmin={isAdmin}
        currentPage={currentPage}
        onToggleSidebar={() => setCollapsed(!collapsed)}
        onLogout={() => setShowLogoutModal(true)}
        onNavigate={navigateToPage}
      />

      {/* Main Container with Sidebar */}
      <div className="flex flex-1 w-full min-w-0 overflow-x-hidden">
        <Sidebar
          currentPage={currentPage}
          onNavigate={navigateToPage}
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />

        <main
          className={`flex-1 min-w-0 max-w-full p-4 sm:p-6 lg:p-8 transition-[margin] duration-300 ease-in-out overflow-x-hidden ${
            collapsed ? 'ml-[72px]' : 'ml-[230px]'
          }`}
        >
          <Suspense fallback={<PageLoadingFallback />}>
            {pageContent}
          </Suspense>
        </main>
      </div>

      {/* Global Interactive Modals */}
      <BuyNumberModal
        isOpen={isBuyNumberOpen}
        onClose={() => setIsBuyNumberOpen(false)}
      />

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        user={user}
        isLoading={isLoggingOut}
      />
    </div>
  );
}

function AppRoutes() {
  const { user, authLoading, addingAccount, cancelAddAccount } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || addingAccount) {
    return (
      <Login
        isAddingAccount={addingAccount && !!user}
        onCancelAdd={cancelAddAccount}
      />
    );
  }

  return <AppLayout />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <ConfirmProvider>
            <AppRoutes />
            <Toaster position="top-right" />
          </ConfirmProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}