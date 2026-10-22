import { useRef, useEffect } from 'react';
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
import { useApp } from '../context/AppContext';
import { isOwner, isAdmin, isManager, isAdminOrOwner } from '../utils/permissions';

export default function Sidebar({
  currentPage,
  onNavigate,
  collapsed,
  onToggle,
}) {
  const { user } = useAuth();
  const { themeColor } = useApp();
  const sidebarRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Prevent scroll propagation from sidebar to the underlying main page
  useEffect(() => {
    const sidebarEl = sidebarRef.current;
    if (!sidebarEl) return;

    const handleWheel = (e) => {
      const scrollEl = scrollContainerRef.current;
      if (!scrollEl) {
        e.preventDefault();
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      const maxScrollTop = scrollHeight - clientHeight;

      // If sidebar does not need to scroll (fits completely on screen),
      // prevent wheel scroll entirely so the underlying page doesn't scroll
      if (maxScrollTop <= 1) {
        e.preventDefault();
        return;
      }

      // If cursor is on the sidebar outside the scrollable inner container (e.g., borders, padding, headers),
      // scroll the inner container instead and block window scroll
      if (!scrollEl.contains(e.target)) {
        scrollEl.scrollTop = Math.max(0, Math.min(maxScrollTop, scrollEl.scrollTop + e.deltaY));
        e.preventDefault();
        return;
      }

      const isScrollingUp = e.deltaY < 0;
      const isScrollingDown = e.deltaY > 0;

      // If scrolled to top and scrolling up -> stop window/home page from scrolling
      if (isScrollingUp && scrollTop <= 0) {
        e.preventDefault();
        return;
      }

      // If scrolled to bottom and scrolling down -> stop window/home page from scrolling
      if (isScrollingDown && scrollTop >= maxScrollTop - 1) {
        e.preventDefault();
        return;
      }

      // Clamping: If a single large wheel tick exceeds top or bottom boundary,
      // manually apply the remaining scroll distance to the sidebar and prevent
      // the browser from chaining the excess delta to the window/home page!
      if (isScrollingDown && scrollTop + e.deltaY > maxScrollTop) {
        scrollEl.scrollTop = maxScrollTop;
        e.preventDefault();
        return;
      }

      if (isScrollingUp && scrollTop + e.deltaY < 0) {
        scrollEl.scrollTop = 0;
        e.preventDefault();
        return;
      }
    };

    sidebarEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      sidebarEl.removeEventListener('wheel', handleWheel);
    };
  }, [collapsed]);

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
      ref={sidebarRef}
      style={{ overscrollBehavior: 'contain', overscrollBehaviorY: 'contain' }}
      className={`fixed top-16 -mt-px left-0 z-20 h-[calc(100vh-4rem+1px)] transition-all duration-300 ease-in-out bg-[#10192e] border-r border-[#1d2d52] flex flex-col overscroll-contain ${
        collapsed ? 'w-[72px]' : 'w-[230px]'
      }`}
    >
      {/* Scrollable Navigation Menu */}
      <div
        ref={scrollContainerRef}
        style={{ overscrollBehavior: 'contain', overscrollBehaviorY: 'contain' }}
        className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 scrollbar-thin overscroll-contain"
      >
        {menuItems.map((item, idx) => {
          if (item.type === 'header') {
            if (collapsed) {
              return <div key={`sep-${idx}`} className="border-t border-[#1d2d52] my-2" />;
            }
            const headerColor =
              item.label === 'CORE CRM'
                ? 'text-sky-400'
                : item.label === 'COMMUNICATIONS'
                ? 'text-emerald-400'
                : item.label === 'ADMIN CONTROLS' || item.label === 'MANAGER SUPERVISION'
                ? 'text-violet-400'
                : 'text-amber-400';
            const isMainSection = item.label === 'CORE CRM' || item.label.includes('CONTROL') || item.label.includes('SUPERVISION');
            return (
              <div
                key={`hdr-${idx}`}
                style={isMainSection ? { color: 'var(--color-primary-400, #38bdf8)' } : undefined}
                className={`text-[10px] font-bold uppercase tracking-wider px-3 pt-3.5 pb-1 flex items-center justify-between ${
                  isMainSection ? '' : headerColor
                }`}
              >
                <span>{item.label}</span>
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
              style={
                isActive
                  ? {
                      backgroundColor: 'var(--color-primary-600)',
                      borderLeft: '4px solid var(--color-primary-300)',
                      boxShadow: '0 4px 14px -1px rgba(0, 0, 0, 0.35)',
                    }
                  : undefined
              }
              className={`w-full flex items-center justify-between px-3 h-10 rounded-lg text-[13.5px] transition-all cursor-pointer group ${
                isActive
                  ? 'text-white font-bold'
                  : 'text-slate-300 hover:bg-[#182647] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  size={17}
                  className={`flex-shrink-0 transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                {!collapsed && (
                  <span className={`truncate text-left ${isActive ? 'text-white font-bold' : ''}`}>
                    {item.label}
                  </span>
                )}
              </div>

              {!collapsed && item.badge && (
                <span
                  style={
                    isActive
                      ? {
                          backgroundColor: 'rgba(255, 255, 255, 0.22)',
                          borderColor: 'rgba(255, 255, 255, 0.4)',
                          color: '#ffffff',
                        }
                      : {
                          backgroundColor: 'rgba(var(--color-primary-500-rgb, 43, 73, 138), 0.22)',
                          borderColor: 'rgba(var(--color-primary-400-rgb, 101, 143, 202), 0.45)',
                          color: 'var(--color-primary-300, #7dd3fc)',
                        }
                  }
                  className="px-1.5 py-0.5 text-[10px] font-bold rounded-full border tracking-wide"
                >
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
