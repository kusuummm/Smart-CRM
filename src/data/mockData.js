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
  'new': 'bg-blue-100 text-blue-700',
  'contacted': 'bg-yellow-100 text-yellow-700',
  'interested': 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  'meeting': 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
  'follow-up': 'bg-orange-100 text-orange-700',
  'converted': 'bg-green-100 text-green-700',
  'not-interested': 'bg-red-100 text-red-700',
  'closed': 'bg-gray-100 text-gray-700',
  'pending': 'bg-yellow-100 text-yellow-700',
  'completed': 'bg-green-100 text-green-700',
  'connected': 'bg-green-100 text-green-700',
  'missed': 'bg-red-100 text-red-700',
  'busy': 'bg-orange-100 text-orange-700',
  'delivered': 'bg-green-100 text-green-700',
  'read': 'bg-blue-100 text-blue-700',
  'sent': 'bg-gray-100 text-gray-700',
  'failed': 'bg-red-100 text-red-700',
  'active': 'bg-green-100 text-green-700',
  'inactive': 'bg-red-100 text-red-700',
};
