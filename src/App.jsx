import { useState, useMemo, useEffect } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { ConfirmProvider } from './context/ConfirmContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { Toaster } from 'react-hot-toast';

// Page components
import Login from './pages/Login';
import HomeDashboard from './pages/HomeDashboard';
import Teams from './pages/Teams';
import Insights from './pages/Insights';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Contacts from './pages/Contacts';
import Leads from './pages/Leads';
import ToDos from './pages/ToDos';
import FollowUps from './pages/FollowUps';
import CallHistory from './pages/CallHistory';
import WhatsApp from './pages/WhatsApp';
import Broadcast from './pages/Broadcast';
import WalletPage from './pages/WalletPage';
import PlansBilling from './pages/PlansBilling';
import Automations from './pages/Automations';
import TeamMembers from './pages/TeamMembers';
import Notes from './pages/Notes';
import QuickMessage from './pages/QuickMessage';
import Emails from './pages/Emails';
import Events from './pages/Events';
import Reports from './pages/Reports';
import ReportDetails from './pages/ReportDetails';
import AdminPanel from './pages/AdminPanel';
import UserPanel from './pages/UserPanel';
import SearchPage from './pages/SearchPage';
import MyAccount from './pages/MyAccount';
import Settings from './pages/Settings';

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
  'admin-portfolio': '/admin/portfolio',
  'admin-audit': '/admin/audit',
  'admin-system': '/admin/system',
  'admin-system-smtp': '/admin/system/smtp',
  'admin-system-whatsapp': '/admin/system/whatsapp',
  'admin-system-database': '/admin/system/database',
  'caller-view': '/home',
};

function AppLayout() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const location = useLocation();
  const navigate = useNavigate();

  // Resolve current page from URL pathname
  const resolvePageFromPath = (pathname) => {
    const cleanPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

    if (cleanPath === '/' || !cleanPath) {
      if (isAdmin && !sessionStorage.getItem('smartcrm_preview_caller')) {
        return 'admin-panel';
      }
      return 'home';
    }

    if (cleanPath.startsWith('/admin')) {
      if (!isAdmin) {
        return 'home';
      }
      return pathToPage[cleanPath] || 'admin-panel';
    }

    return pathToPage[cleanPath] || 'home';
  };

  const [currentPage, setCurrentPage] = useState(() => resolvePageFromPath(location.pathname));
  const [collapsed, setCollapsed] = useState(false);

  // Sync state whenever URL pathname changes (e.g. Back/Forward button, address bar, direct link)
  useEffect(() => {
    const targetPage = resolvePageFromPath(location.pathname);
    if (currentPage !== targetPage) {
      setCurrentPage(targetPage);
    }

    // Role safety guard
    if (location.pathname.startsWith('/admin') && !isAdmin) {
      navigate('/home', { replace: true });
    } else if (location.pathname === '/' || location.pathname === '') {
      const defaultTarget = isAdmin && !sessionStorage.getItem('smartcrm_preview_caller') ? '/admin' : '/home';
      navigate(defaultTarget, { replace: true });
    }
  }, [location.pathname, isAdmin]);

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

  // Clear legacy mock data cache once so user starts with a clean slate
  useEffect(() => {
    const contactsCache = localStorage.getItem('smartcrm_contacts') || '';
    const hasLegacyPrivate = contactsCache.includes('Private Client');
    const purged = sessionStorage.getItem('smartcrm_data_purged_v3');
    if (!purged || hasLegacyPrivate) {
      sessionStorage.setItem('smartcrm_data_purged_v3', 'true');
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
        return isAdmin ? (
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
      case 'admin-panel':
      case 'admin-users':
      case 'admin-agents':
      case 'admin-workload':
      case 'admin-reports':
      case 'admin-portfolio':
      case 'admin-audit':
      case 'admin-system':
      case 'admin-system-smtp':
      case 'admin-system-whatsapp':
      case 'admin-system-database':
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
    <div className="min-h-screen bg-gray-50/60 dark:bg-dark-900 flex flex-col">
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
      <div className="flex flex-1">
        <Sidebar
          currentPage={currentPage}
          onNavigate={navigateToPage}
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />

        <main
          className={`flex-1 p-4 sm:p-6 lg:p-8 transition-[margin] duration-300 ease-in-out ${
            collapsed ? 'ml-[72px]' : 'ml-[230px]'
          }`}
        >
          {pageContent}
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