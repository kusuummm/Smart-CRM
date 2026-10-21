// Data structures and lookup configuration for Smart CRM
export const mockUsers = [];
export const mockCustomers = [];
export const mockLeads = [];
export const mockFollowUps = [];
export const mockCallHistory = [];
export const mockWhatsAppLogs = [];
export const mockEmailLogs = [];
export const mockEvents = [];
export const mockTeamCalls = [];

export const leadStatuses = ['new', 'contacted', 'interested', 'meeting', 'follow-up', 'converted', 'not-interested', 'closed'];

export const leadStatusLabels = {
  'new': 'New Follow-up',
  'contacted': 'Follow-up: Contacted',
  'interested': 'Follow-up: Interested',
  'meeting': 'Follow-up: Meeting Scheduled',
  'follow-up': 'Follow-up: In Progress',
  'converted': 'Follow-up: Converted / Won',
  'not-interested': 'Follow-up: Not Interested',
  'closed': 'Follow-up: Closed',
};
export const eventTypes = ['birthday', 'anniversary', 'emi', 'renewal'];
export const leadSources = ['Website', 'Referral', 'Social Media', 'Email Campaign', 'Cold Call', 'Trade Show', 'Other'];
export const indianStates = ['Maharashtra', 'Gujarat', 'Karnataka', 'Telangana', 'Delhi', 'Tamil Nadu', 'Kerala', 'Rajasthan', 'Punjab', 'Haryana', 'UP', 'West Bengal', 'Other'];

export const statusColors = {
  'new': 'bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  'contacted': 'bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  'interested': 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60',
  'meeting': 'bg-sky-50 text-sky-800 border border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60',
  'follow-up': 'bg-orange-50 text-orange-700 border border-orange-200/80 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60',
  'converted': 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  'not-interested': 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
  'closed': 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  'pending': 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  'completed': 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  'connected': 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  'missed': 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
  'busy': 'bg-orange-50 text-orange-700 border border-orange-200/80 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60',
  'delivered': 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  'read': 'bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  'sent': 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  'failed': 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
  'active': 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  'inactive': 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
};
