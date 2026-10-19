import {
  Home,
  Users,
  Phone,
  Clock,
  BarChart2,
  CheckSquare,
  BookUser,
  MessageSquare,
  Radio,
  Wallet,
  CreditCard,
  Settings,
  Cpu,
  UserCheck,
  FileText,
  Zap,
  Shield,
  ArrowRightLeft,
  Database,
  Activity,
  TrendingUp,
  Mail,
  Calendar,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isOwner, isAdmin, isManager, isAdminOrOwner } from '../utils/permissions';

export default function Sidebar({
  currentPage,
  onNavigate,
  collapsed,
  onToggle,
}) {
  const { user } = useAuth();
  const userIsOwner = isOwner(user);
  const userIsAdmin = isAdmin(user);
  const userIsManager = isManager(user);
  const userIsAdminOrOwner = isAdminOrOwner(user);

  // Member / Caller Workspace
  const memberMenuItems = [
    { type: 'header', label: 'CORE CRM' },
    { id: 'home', label: 'Home', icon: Home },
    { id: 'contacts', label: 'Contacts', icon: BookUser },
    { id: 'leads', label: 'Leads & Pipeline', icon: TrendingUp },
    { id: 'todos', label: 'To Dos & Tasks', icon: CheckSquare },
    { id: 'call-history', label: 'Call History', icon: Phone },
    { id: 'reports', label: 'Reports', icon: Clock },
    { id: 'insights', label: 'Insights', icon: BarChart2 },

    { type: 'header', label: 'COMMUNICATIONS' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'emails', label: 'Emails', icon: Mail },
    { id: 'events', label: 'Calendar & Reminders', icon: Calendar },
    { id: 'quick-message', label: 'Quick Message', icon: Zap },
    { id: 'notes', label: 'Notes', icon: FileText },

    { type: 'header', label: 'WORKSPACE' },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Manager Supervision Center
  const managerMenuItems = [
    { type: 'header', label: 'TEAM SUPERVISION' },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'team-members', label: 'Team Members', icon: UserCheck },
    { id: 'leads', label: 'Team Leads & Pipeline', icon: TrendingUp },
    { id: 'contacts', label: 'Contacts', icon: BookUser },
    { id: 'todos', label: 'To Dos & Tasks', icon: CheckSquare },
    { id: 'call-history', label: 'Call History & Logs', icon: Phone },
    { id: 'admin-reports', label: 'Team Progress Reports', icon: BarChart2 },

    { type: 'header', label: 'COMMUNICATIONS' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'emails', label: 'Emails', icon: Mail },
    { id: 'events', label: 'Calendar & Reminders', icon: Calendar },
    { id: 'broadcast', label: 'Broadcast', icon: Radio },

    { type: 'header', label: 'PREFERENCES' },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Admin Control Center (Operations & Users)
  const adminMenuItems = [
    { type: 'header', label: 'ADMIN CONTROL CENTER' },
    { id: 'admin-panel', label: 'Dashboard Overview', icon: Shield },
    { id: 'admin-users', label: 'Users & Approvals', icon: UserCheck },
    { id: 'admin-tasks', label: 'Lead Tasks & Schedules', icon: CheckSquare },
    { id: 'admin-agents', label: 'Lead Presence', icon: Activity },
    { id: 'admin-workload', label: 'Workload Balancer', icon: ArrowRightLeft },
    { id: 'admin-reports', label: 'Lead Progress Reports', icon: BarChart2 },
    { id: 'admin-audit', label: 'Audit Activity Log', icon: Clock },

    { type: 'header', label: 'ORGANIZATION & TOOLS' },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'automations', label: 'Automations', icon: Cpu },
    { id: 'broadcast', label: 'Broadcast', icon: Radio },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Owner Control Center (Full Supreme Organization Access including Billing & Diagnostics)
  const ownerMenuItems = [
    { type: 'header', label: 'OWNER CONTROL CENTER' },
    { id: 'admin-panel', label: 'Dashboard Overview', icon: Shield },
    { id: 'admin-users', label: 'Users & Approvals', icon: UserCheck },
    { id: 'admin-tasks', label: 'Lead Tasks & Schedules', icon: CheckSquare },
    { id: 'admin-agents', label: 'Lead Presence', icon: Activity },
    { id: 'admin-workload', label: 'Workload Balancer', icon: ArrowRightLeft },
    { id: 'admin-reports', label: 'Lead Progress Reports', icon: BarChart2 },
    { id: 'admin-audit', label: 'Audit Activity Log', icon: Clock },
    { id: 'admin-system', label: 'System Diagnostics', icon: Database },

    { type: 'header', label: 'ORGANIZATION & BILLING' },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'automations', label: 'Automations', icon: Cpu },
    { id: 'broadcast', label: 'Broadcast', icon: Radio },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'plans-billing', label: 'Plans & Billing', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const menuItems = userIsOwner
    ? ownerMenuItems
    : userIsAdmin
    ? adminMenuItems
    : userIsManager
    ? managerMenuItems
    : memberMenuItems;

  const handleItemClick = (item) => {
    if (item.id === 'caller-view') {
      onNavigate('home');
    } else {
      onNavigate(item.id);
    }
  };

  return (
    <aside
      className={`fixed top-16 left-0 z-20 h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out bg-white/95 dark:bg-dark-900/95 backdrop-blur-md border-r border-dark-200/80 dark:border-dark-700/80 flex flex-col ${
        collapsed ? 'w-[72px]' : 'w-[230px]'
      }`}
    >
      {/* Scrollable Navigation Menu */}
      <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 scrollbar-thin">
        {menuItems.map((item, idx) => {
          if (item.type === 'header') {
            if (collapsed) {
              return <div key={`sep-${idx}`} className="border-t border-dark-200/80 dark:border-dark-700/80 my-2" />;
            }
            return (
              <div
                key={`hdr-${idx}`}
                className="text-[10px] font-bold uppercase tracking-wider text-dark-400 dark:text-dark-400 px-3 pt-3 pb-1"
              >
                {item.label}
              </div>
            );
          }

          const Icon = item.icon;
          const isActive =
            currentPage === item.id ||
            (item.id === 'admin-panel' && currentPage === 'admin') ||
            (item.id === 'caller-view' && currentPage === 'home') ||
            (item.id === 'home' &&
              (currentPage === 'dashboard' || currentPage === 'tc-dashboard')) ||
            (item.id === 'contacts' &&
              (currentPage === 'customers' || currentPage === 'tc-customers')) ||
            (item.id === 'leads' &&
              (currentPage === 'tc-leads' || currentPage === 'lead-detail')) ||
            (item.id === 'todos' &&
              (currentPage === 'followups' || currentPage === 'tc-followups')) ||
            (item.id === 'call-history' &&
              (currentPage === 'calls' || currentPage === 'tc-calls')) ||
            (item.id === 'whatsapp' &&
              (currentPage === 'whatsapp-archive' || currentPage === 'tc-whatsapp')) ||
            (item.id === 'emails' &&
              (currentPage === 'tc-emails')) ||
            (item.id === 'events' &&
              (currentPage === 'tc-events')) ||
            (item.id === 'team-members' &&
              (currentPage === 'team' || currentPage === 'teams-members')) ||
            (item.id === 'admin-workload' && currentPage === 'admin-workload') ||
            (item.id === 'admin-reports' &&
              (currentPage === 'admin-reports' || (isAdmin && currentPage === 'reports'))) ||
            (item.id === 'admin-audit' && currentPage === 'admin-audit') ||
            (item.id === 'plans-billing' &&
              (currentPage === 'plans' || currentPage === 'billing'));

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center justify-between px-3 h-10 rounded-lg text-[14px] font-normal transition-colors cursor-pointer group ${
                isActive
                  ? 'bg-blue-50 text-[#1890ff] dark:bg-blue-950/60 dark:text-blue-400 font-medium'
                  : 'text-[rgba(0,0,0,0.88)] dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-800 hover:text-[#1890ff] dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  size={17}
                  className={`flex-shrink-0 ${
                    isActive
                      ? 'text-[#1890ff] dark:text-blue-400'
                      : 'text-dark-500 dark:text-dark-400 group-hover:text-dark-800 dark:group-hover:text-dark-200'
                  }`}
                />
                {!collapsed && (
                  <span className="truncate text-left">{item.label}</span>
                )}
              </div>

              {!collapsed && item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#1890ff] text-white tracking-wide">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
