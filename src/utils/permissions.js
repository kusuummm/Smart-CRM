import { Shield, Crown, Users, User, Phone, CheckCircle, Lock, Zap } from 'lucide-react';

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member',
  TELECALLER: 'telecaller',
};

export const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  manager: 2,
  member: 1,
  telecaller: 1,
  user: 1,
};

export const normalizeRole = (role) => {
  const r = (role || '').toLowerCase().trim();
  if (r === 'owner') return 'owner';
  if (r === 'admin') return 'admin';
  if (r === 'manager') return 'manager';
  if (r === 'member' || r === 'telecaller' || r === 'lead' || r === 'user') return 'member';
  return 'member';
};

export const getRoleLevel = (userOrRole) => {
  const role = typeof userOrRole === 'object' ? userOrRole?.role : userOrRole;
  return ROLE_HIERARCHY[normalizeRole(role)] || 1;
};

export const isOwner = (user) => normalizeRole(user?.role) === 'owner';
export const isAdmin = (user) => normalizeRole(user?.role) === 'admin';
export const isManager = (user) => normalizeRole(user?.role) === 'manager';
export const isMember = (user) => normalizeRole(user?.role) === 'member';

export const isAdminOrOwner = (user) => {
  const lvl = getRoleLevel(user);
  return lvl >= 3; // admin or owner
};

export const isManagerOrAbove = (user) => {
  const lvl = getRoleLevel(user);
  return lvl >= 2; // manager, admin, or owner
};

export const canManageUsers = (user) => isAdminOrOwner(user);
export const canAccessBilling = (user) => isOwner(user);
export const canAccessDiagnostics = (user) => isOwner(user);
export const canAccessAuditLogs = (user) => isAdminOrOwner(user);
export const canAssignLeads = (user) => isManagerOrAbove(user);

export const canAssignRole = (currentUser, targetRole) => {
  const normTarget = normalizeRole(targetRole);
  if (normTarget === 'owner') {
    return isOwner(currentUser);
  }
  if (normTarget === 'admin') {
    return isOwner(currentUser) || isAdmin(currentUser);
  }
  return isAdminOrOwner(currentUser);
};

export const getRoleInfo = (role) => {
  const norm = normalizeRole(role);
  switch (norm) {
    case 'owner':
      return {
        key: 'owner',
        name: 'Owner',
        badge: 'OWNER',
        icon: Crown,
        color: 'slate',
        badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
        activePillClass: 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-slate-900/10',
        tagline: 'Organization Owner & Supreme Control',
        description: 'Complete organization authority with billing, plans, system diagnostics, and audit logs.',
      };
    case 'admin':
      return {
        key: 'admin',
        name: 'Administrator',
        badge: 'ADMIN',
        icon: Shield,
        color: 'blue',
        badgeClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
        activePillClass: 'bg-blue-600 text-white shadow-blue-500/20',
        tagline: 'Operations & User Management',
        description: 'Operational control center: user approvals, lead distribution, workload balancing, and progress reports.',
      };
    case 'manager':
      return {
        key: 'manager',
        name: 'Manager',
        badge: 'MANAGER',
        icon: Users,
        color: 'teal',
        badgeClass: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60',
        activePillClass: 'bg-teal-600 text-white shadow-teal-500/20',
        tagline: 'Team Supervision & Monitoring',
        description: 'Supervises team performance, lead distribution, call recordings, and team tasks.',
      };
    case 'member':
    default:
      return {
        key: 'member',
        name: 'Team Member',
        badge: 'MEMBER',
        icon: User,
        color: 'sky',
        badgeClass: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60',
        activePillClass: 'bg-sky-600 text-white shadow-sky-500/20',
        tagline: 'Frontline Agent & Caller',
        description: 'Personal operational workspace with dialer, assigned customers, follow-ups, and customer outreach.',
      };
  }
};

export const ROLE_DEFINITIONS = [
  {
    role: 'member',
    title: 'Team Member',
    level: 1,
    tagline: 'Personal Operational Workspace',
    icon: Phone,
    color: 'sky',
    features: [
      'Personal Home Dashboard & daily agenda',
      'Access strictly to assigned customers & contacts',
      'Built-in Dialer, call logging & call recordings',
      'Follow-up reminders, tasks & pipeline stages',
      'Direct WhatsApp and email customer outreach',
    ],
    restricted: [
      'Cannot view other members’ private customers',
      'Cannot access Admin Control Center or Balancer',
      'Cannot manage users or system configurations',
    ],
  },
  {
    role: 'manager',
    title: 'Team Manager (Supervisor)',
    level: 2,
    tagline: 'Team Supervision & Lead Assignment',
    icon: Users,
    color: 'teal',
    features: [
      'Team Overview Dashboard & agent online presence',
      'Assign & redistribute leads among team members',
      'Monitor team call history & listen to recordings',
      'Team progress reports & conversion rate analytics',
      'Create and delegate tasks & follow-ups to team',
    ],
    restricted: [
      'Cannot manage billing or subscription plans',
      'Cannot access low-level system diagnostics',
      'Cannot delete admin or owner accounts',
    ],
  },
  {
    role: 'admin',
    title: 'Administrator',
    level: 3,
    tagline: 'Operations & Organization Control',
    icon: Shield,
    color: 'blue',
    features: [
      'Full Admin Control Center & KPIs oversight',
      'User Management: Add, edit & approve accounts',
      'Bulk import customer databases & assign leads',
      'Workload Balancer & team performance tracking',
      'Broadcast announcements & system automations',
    ],
    restricted: [
      'Cannot delete or demote Organization Owner',
      'Cannot alter top-level billing & subscription without owner',
    ],
  },
  {
    role: 'owner',
    title: 'Organization Owner',
    level: 4,
    tagline: 'Supreme Organization Authority',
    icon: Crown,
    color: 'slate',
    features: [
      'Unrestricted supreme authority over entire CRM',
      'Subscription plans, billing, invoices & wallet',
      'System diagnostics, MongoDB health & API credentials',
      'Complete immutable audit activity log of all actions',
      'Authority to create, manage, or delete all users',
    ],
    restricted: [],
  },
];
