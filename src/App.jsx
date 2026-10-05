import { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Leads from './pages/Leads';
import FollowUps from './pages/FollowUps';
import CallHistory from './pages/CallHistory';
import WhatsApp from './pages/WhatsApp';
import Emails from './pages/Emails';
import Events from './pages/Events';
import Reports from './pages/Reports';
import AdminPanel from './pages/AdminPanel';
import UserPanel from './pages/UserPanel';
import SearchPage from './pages/SearchPage';
import MyAccount from './pages/MyAccount';
import Settings from './pages/Settings';

function AppLayout() {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useApp();
  const isAdmin = user?.role === 'admin';
  const [currentPage, setCurrentPage] = useState(() => (user?.role === 'admin' ? 'dashboard' : 'tc-dashboard'));
  const [collapsed, setCollapsed] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedLeadStatus, setSelectedLeadStatus] = useState('');
  const [selectedReportId, setSelectedReportId] = useState('');

  // Automatically enforce role separation when user or role changes
  useEffect(() => {
    if (user?.role === 'admin') {
      if (currentPage === 'tc-dashboard' || currentPage?.startsWith('tc-')) {
        setCurrentPage('dashboard');
      }
    } else {
      if (currentPage === 'dashboard' || currentPage === 'admin-panel' || currentPage === 'reports') {
        setCurrentPage('tc-dashboard');
      }
    }
  }, [user?.role]);

  // type: 'customer' (default, search Leads by customer name),
  //       'status' (filter Leads by lead status),
  //       'report' (open a specific report on the Reports page)
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
    setCurrentPage(page);
  };

  const navigateToPage = (page) => {
    setSelectedCustomer('');
    setSelectedLeadStatus('');
    setSelectedReportId('');
    if (!isAdmin && (page === 'admin-panel' || page === 'reports' || page === 'dashboard')) {
      setCurrentPage('tc-dashboard');
      return;
    }
    setCurrentPage(page);
  };

  // Map pages to translation keys for titles
  const pageTitleKeys = {
    dashboard: 'dashboard',
    customers: 'customers',
    leads: 'leads',
    followups: 'followups',
    calls: 'calls',
    whatsapp: 'whatsapp',
    emails: 'emails',
    events: 'events',
    reports: 'reports',
    'admin-panel': 'adminPanel',
    'user-panel': 'userHub',
    'tc-dashboard': 'userHub',
    'tc-customers': 'myContacts',
    'tc-leads': 'myLeads',
    'tc-followups': 'followups',
    'tc-calls': 'calls',
    'tc-whatsapp': 'messages',
    'tc-emails': 'emailUpdates',
    'tc-events': 'eventUpdates',
    'tc-search': 'search',
    search: 'search',
    'my-account': 'myAccount',
    settings: 'settings',
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return isAdmin ? <Dashboard onNavigate={navigateWithCustomer} /> : <UserPanel onNavigate={navigateWithCustomer} />;
      case 'customers': return <Customers onNavigate={navigateToPage} />;
      case 'leads': return <Leads onNavigate={navigateToPage} selectedCustomer={selectedCustomer} selectedLeadStatus={selectedLeadStatus} />;
      case 'followups': return <FollowUps onNavigate={navigateToPage} />;
      case 'calls': return <CallHistory onNavigate={navigateToPage} />;
      case 'whatsapp': return <WhatsApp onNavigate={navigateToPage} />;
      case 'emails': return <Emails onNavigate={navigateToPage} />;
      case 'events': return <Events onNavigate={navigateToPage} />;
      case 'reports': return isAdmin ? <Reports initialReportId={selectedReportId} /> : <UserPanel onNavigate={navigateWithCustomer} />;
      case 'admin-panel': return isAdmin ? <AdminPanel /> : <UserPanel onNavigate={navigateWithCustomer} />;
      case 'user-panel':
      case 'tc-dashboard': return <UserPanel onNavigate={navigateWithCustomer} />;
      case 'tc-customers': return <Customers onNavigate={navigateToPage} />;
      case 'tc-leads': return <Leads onNavigate={navigateToPage} selectedCustomer={selectedCustomer} selectedLeadStatus={selectedLeadStatus} />;
      case 'tc-followups': return <FollowUps onNavigate={navigateToPage} />;
      case 'tc-calls': return <CallHistory onNavigate={navigateToPage} />;
      case 'tc-whatsapp': return <WhatsApp onNavigate={navigateToPage} />;
      case 'tc-emails': return <Emails onNavigate={navigateToPage} />;
      case 'tc-events': return <Events onNavigate={navigateToPage} />;
      case 'tc-search': return <SearchPage onNavigate={navigateToPage} />;
      case 'search': return <SearchPage onNavigate={navigateToPage} />;
      case 'my-account': return <MyAccount onNavigate={navigateToPage} />;
      case 'settings': return <Settings onNavigate={navigateToPage} />;
      default: return isAdmin ? <Dashboard onNavigate={navigateWithCustomer} /> : <UserPanel onNavigate={navigateWithCustomer} />;
    }
  };

  const pageContent = useMemo(() => renderPage(), [currentPage, selectedCustomer, selectedLeadStatus, selectedReportId, isAdmin]);

  return (
    <div className="flex min-h-screen">
      <Sidebar user={{ ...user, onLogout: logout }} currentPage={currentPage} onNavigate={setCurrentPage} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'ml-[72px]' : 'ml-[260px]'}`}>
        <Header
          titleKey={pageTitleKeys[currentPage] || 'dashboard'}
          user={user}
          onToggleSidebar={() => setCollapsed(!collapsed)}
          onLogout={logout}
          onNavigate={navigateToPage}
        />
        <main className="flex-1 p-6 overflow-auto bg-gray-50 dark:bg-dark-900">
          {pageContent}
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, authLoading, addingAccount, cancelAddAccount } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || addingAccount) return <Login isAddingAccount={addingAccount && !!user} onCancelAdd={cancelAddAccount} />;
  return <AppLayout />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppRoutes />
        <Toaster position="top-right" />
      </AppProvider>
    </AuthProvider>
  );
}