// Mock data for Smart CRM frontend
export const mockUsers = [
  { id: '1', name: 'Admin User', email: 'admin@crm.com', password: 'admin123', role: 'admin', avatar: 'AU', status: 'active' },
  { id: '2', name: 'John Smith', email: 'john@crm.com', password: 'john123', role: 'telecaller', avatar: 'JS', status: 'active' },
  { id: '3', name: 'Sarah Wilson', email: 'sarah@crm.com', password: 'sarah123', role: 'telecaller', avatar: 'SW', status: 'active' },
  { id: '4', name: 'Mike Johnson', email: 'mike@crm.com', password: 'mike123', role: 'telecaller', avatar: 'MJ', status: 'inactive' },
];

export const mockCustomers = [
  { id: '1', name: 'Rahul Sharma', mobile: '9876543210', alternateNumber: '9876543211', email: 'rahul@example.com', company: 'Tech Solutions Pvt Ltd', city: 'Mumbai', state: 'Maharashtra', leadSource: 'Website', interestedProduct: 'CRM Software', status: 'active', assignedTelecaller: 'John Smith', telecallerId: '2', remarks: 'Very interested in premium package', createdAt: '2024-01-15' },
  { id: '2', name: 'Priya Patel', mobile: '9876543212', alternateNumber: '9876543213', email: 'priya@example.com', company: 'Digital Marketing Hub', city: 'Ahmedabad', state: 'Gujarat', leadSource: 'Referral', interestedProduct: 'Marketing Automation', status: 'active', assignedTelecaller: 'Sarah Wilson', telecallerId: '3', remarks: 'Needs a custom demo', createdAt: '2024-01-20' },
  { id: '3', name: 'Amit Kumar', mobile: '9876543214', alternateNumber: '9876543215', email: 'amit@example.com', company: 'StartupX', city: 'Bangalore', state: 'Karnataka', leadSource: 'Social Media', interestedProduct: 'Project Management', status: 'active', assignedTelecaller: 'John Smith', telecallerId: '2', remarks: 'Looking for affordable options', createdAt: '2024-02-01' },
  { id: '4', name: 'Sneha Reddy', mobile: '9876543216', alternateNumber: '9876543217', email: 'sneha@example.com', company: 'EduLearn', city: 'Hyderabad', state: 'Telangana', leadSource: 'Email Campaign', interestedProduct: 'LMS Solution', status: 'active', assignedTelecaller: 'Sarah Wilson', telecallerId: '3', remarks: 'Budget approved, ready to proceed', createdAt: '2024-02-10' },
  { id: '5', name: 'Vikram Singh', mobile: '9876543218', alternateNumber: '9876543219', email: 'vikram@example.com', company: 'Real Estate Pro', city: 'Delhi', state: 'Delhi', leadSource: 'Cold Call', interestedProduct: 'CRM Software', status: 'active', assignedTelecaller: 'John Smith', telecallerId: '2', remarks: 'Interested but wants monthly billing', createdAt: '2024-02-15' },
  { id: '6', name: 'Anita Desai', mobile: '9876543220', alternateNumber: '9876543221', email: 'anita@example.com', company: 'HealthPlus', city: 'Pune', state: 'Maharashtra', leadSource: 'Referral', interestedProduct: 'ERP Solution', status: 'active', assignedTelecaller: 'Sarah Wilson', telecallerId: '3', remarks: 'Decision pending from management', createdAt: '2024-02-20' },
  { id: '7', name: 'Rajesh Gupta', mobile: '9876543222', alternateNumber: '9876543223', email: 'rajesh@example.com', company: 'LogiTech', city: 'Chennai', state: 'Tamil Nadu', leadSource: 'Website', interestedProduct: 'Inventory Management', status: 'active', assignedTelecaller: 'John Smith', telecallerId: '2', remarks: 'Demo scheduled for next week', createdAt: '2024-03-01' },
  { id: '8', name: 'Meera Joshi', mobile: '9876543224', alternateNumber: '9876543225', email: 'meera@example.com', company: 'FinServ', city: 'Mumbai', state: 'Maharashtra', leadSource: 'Trade Show', interestedProduct: 'Fintech Solution', status: 'active', assignedTelecaller: 'Sarah Wilson', telecallerId: '3', remarks: 'High priority lead - enterprise client', createdAt: '2024-03-05' },
];

export const mockLeads = [
  { id: '1', customerId: '1', customerName: 'Rahul Sharma', status: 'converted', createdAt: '2024-01-15', history: [
    { status: 'new', date: '2024-01-15', remark: 'Lead created from website' },
    { status: 'contacted', date: '2024-01-16', remark: 'Initial call made, interested' },
    { status: 'interested', date: '2024-01-18', remark: 'Requested detailed proposal' },
    { status: 'follow-up', date: '2024-01-20', remark: 'Follow-up scheduled' },
    { status: 'converted', date: '2024-01-25', remark: 'Deal closed successfully' },
  ]},
  { id: '2', customerId: '2', customerName: 'Priya Patel', status: 'interested', createdAt: '2024-01-20', history: [
    { status: 'new', date: '2024-01-20', remark: 'Referral from existing client' },
    { status: 'contacted', date: '2024-01-21', remark: 'Had a productive discussion' },
    { status: 'interested', date: '2024-01-23', remark: 'Wants custom demo session' },
  ]},
  { id: '3', customerId: '3', customerName: 'Amit Kumar', status: 'follow-up', createdAt: '2024-02-01', history: [
    { status: 'new', date: '2024-02-01', remark: 'Found via social media campaign' },
    { status: 'contacted', date: '2024-02-02', remark: 'Initial contact made' },
    { status: 'follow-up', date: '2024-02-05', remark: 'Wants to compare pricing' },
  ]},
  { id: '4', customerId: '4', customerName: 'Sneha Reddy', status: 'converted', createdAt: '2024-02-10', history: [
    { status: 'new', date: '2024-02-10', remark: 'Email campaign lead' },
    { status: 'contacted', date: '2024-02-11', remark: 'Phone call completed' },
    { status: 'interested', date: '2024-02-13', remark: 'Budget confirmed' },
    { status: 'follow-up', date: '2024-02-15', remark: 'Demo completed successfully' },
    { status: 'converted', date: '2024-02-20', remark: 'Contract signed' },
  ]},
  { id: '5', customerId: '5', customerName: 'Vikram Singh', status: 'contacted', createdAt: '2024-02-15', history: [
    { status: 'new', date: '2024-02-15', remark: 'Cold call lead' },
    { status: 'contacted', date: '2024-02-16', remark: 'Initial call successful' },
  ]},
  { id: '6', customerId: '6', customerName: 'Anita Desai', status: 'new', createdAt: '2024-02-20', history: [
    { status: 'new', date: '2024-02-20', remark: 'Referral lead' },
  ]},
  { id: '7', customerId: '7', customerName: 'Rajesh Gupta', status: 'interested', createdAt: '2024-03-01', history: [
    { status: 'new', date: '2024-03-01', remark: 'Website inquiry' },
    { status: 'contacted', date: '2024-03-02', remark: 'Initial call done' },
    { status: 'interested', date: '2024-03-04', remark: 'Liked the features' },
  ]},
  { id: '8', customerId: '8', customerName: 'Meera Joshi', status: 'follow-up', createdAt: '2024-03-05', history: [
    { status: 'new', date: '2024-03-05', remark: 'Trade show lead - enterprise' },
    { status: 'contacted', date: '2024-03-06', remark: 'Executive meeting done' },
    { status: 'follow-up', date: '2024-03-08', remark: 'Awaiting board approval' },
  ]},
];

export const mockFollowUps = [
  { id: '1', customerId: '1', customerName: 'Rahul Sharma', date: '2026-07-05', time: '10:00', remarks: 'Discuss premium package', nextFollowUp: '2026-07-12', status: 'pending', createdBy: 'John Smith' },
  { id: '2', customerId: '3', customerName: 'Amit Kumar', date: '2026-07-05', time: '11:30', remarks: 'Follow up on pricing', nextFollowUp: '2026-07-08', status: 'pending', createdBy: 'John Smith' },
  { id: '3', customerId: '2', customerName: 'Priya Patel', date: '2026-07-05', time: '14:00', remarks: 'Schedule custom demo', nextFollowUp: '2026-07-10', status: 'completed', createdBy: 'Sarah Wilson' },
  { id: '4', customerId: '7', customerName: 'Rajesh Gupta', date: '2026-07-06', time: '10:00', remarks: 'Demo follow-up', nextFollowUp: '2026-07-13', status: 'pending', createdBy: 'John Smith' },
  { id: '5', customerId: '8', customerName: 'Meera Joshi', date: '2026-07-06', time: '15:00', remarks: 'Check on board approval', nextFollowUp: '2026-07-09', status: 'pending', createdBy: 'Sarah Wilson' },
  { id: '6', customerId: '5', customerName: 'Vikram Singh', date: '2026-07-04', time: '09:00', remarks: 'Monthly billing discussion', nextFollowUp: '2026-07-11', status: 'completed', createdBy: 'John Smith' },
];

export const mockCallHistory = [
  { id: '1', customerId: '1', customerName: 'Rahul Sharma', date: '2026-07-05', time: '10:30', duration: '15 mins', status: 'connected', remarks: 'Discussed premium package features' },
  { id: '2', customerId: '2', customerName: 'Priya Patel', date: '2026-07-05', time: '11:00', duration: '20 mins', status: 'connected', remarks: 'Scheduled custom demo for next week' },
  { id: '3', customerId: '3', customerName: 'Amit Kumar', date: '2026-07-05', time: '12:00', duration: '5 mins', status: 'missed', remarks: 'Customer did not answer, will retry' },
  { id: '4', customerId: '5', customerName: 'Vikram Singh', date: '2026-07-04', time: '14:00', duration: '10 mins', status: 'connected', remarks: 'Discussed billing options' },
  { id: '5', customerId: '7', customerName: 'Rajesh Gupta', date: '2026-07-04', time: '16:00', duration: '12 mins', status: 'connected', remarks: 'Demo feedback discussion' },
  { id: '6', customerId: '8', customerName: 'Meera Joshi', date: '2026-07-03', time: '11:00', duration: '25 mins', status: 'connected', remarks: 'Executive level discussion' },
  { id: '7', customerId: '4', customerName: 'Sneha Reddy', date: '2026-07-03', time: '09:30', duration: '8 mins', status: 'busy', remarks: 'Busy, callback scheduled' },
  { id: '8', customerId: '6', customerName: 'Anita Desai', date: '2026-07-02', time: '15:00', duration: '18 mins', status: 'connected', remarks: 'Management approval update' },
];

export const mockWhatsAppLogs = [
  { id: '1', customerId: '1', customerName: 'Rahul Sharma', phone: '9876543210', message: 'Thank you for your interest in our CRM software...', type: 'template', status: 'delivered', date: '2026-07-05', sentBy: 'John Smith' },
  { id: '2', customerId: '3', customerName: 'Amit Kumar', phone: '9876543214', message: 'Hi Amit, just checking in on our pricing discussion...', type: 'follow-up', status: 'read', date: '2026-07-05', sentBy: 'John Smith' },
  { id: '3', customerId: '2', customerName: 'Priya Patel', phone: '9876543212', message: 'Hi Priya, your custom demo is scheduled for...', type: 'template', status: 'delivered', date: '2026-07-04', sentBy: 'Sarah Wilson' },
  { id: '4', customerId: '7', customerName: 'Rajesh Gupta', phone: '9876543222', message: 'Thank you for attending the demo yesterday...', type: 'follow-up', status: 'sent', date: '2026-07-04', sentBy: 'John Smith' },
  { id: '5', customerId: '8', customerName: 'Meera Joshi', phone: '9876543224', message: 'Dear Meera, we would like to follow up on...', type: 'offer', status: 'delivered', date: '2026-07-03', sentBy: 'Sarah Wilson' },
];

export const mockEmailLogs = [
  { id: '1', customerId: '1', customerName: 'Rahul Sharma', email: 'rahul@example.com', subject: 'Welcome to SmartCRM Solutions!', body: 'Dear Rahul, thank you for choosing SmartCRM...', type: 'welcome', status: 'delivered', date: '2026-07-05', sentBy: 'John Smith' },
  { id: '2', customerId: '2', customerName: 'Priya Patel', email: 'priya@example.com', subject: 'Follow-up: Your Demo is Scheduled', body: 'Hi Priya, your demo has been scheduled...', type: 'follow-up', status: 'read', date: '2026-07-05', sentBy: 'Sarah Wilson' },
  { id: '3', customerId: '5', customerName: 'Vikram Singh', email: 'vikram@example.com', subject: 'Special Offer - 20% Discount on Annual Plans', body: 'Dear Vikram, we have an exclusive offer...', type: 'offer', status: 'delivered', date: '2026-07-04', sentBy: 'John Smith' },
  { id: '4', customerId: '8', customerName: 'Meera Joshi', email: 'meera@example.com', subject: 'Welcome to SmartCRM Solutions!', body: 'Dear Meera, welcome aboard...', type: 'welcome', status: 'sent', date: '2026-07-03', sentBy: 'Sarah Wilson' },
];

export const mockEvents = [
  { id: '1', customerId: '1', customerName: 'Rahul Sharma', type: 'birthday', date: '2026-07-20', description: 'Rahul Sharma\'s birthday', reminder: '1 day before', status: 'upcoming' },
  { id: '2', customerId: '2', customerName: 'Priya Patel', type: 'anniversary', date: '2026-07-15', description: 'Priya Patel\'s business anniversary', reminder: '2 days before', status: 'upcoming' },
  { id: '3', customerId: '5', customerName: 'Vikram Singh', type: 'emi', date: '2026-07-10', description: 'EMI payment due for Vikram Singh', reminder: '3 days before', status: 'upcoming' },
  { id: '4', customerId: '8', customerName: 'Meera Joshi', type: 'renewal', date: '2026-08-01', description: 'License renewal for Meera Joshi', reminder: '7 days before', status: 'upcoming' },
  { id: '5', customerId: '3', customerName: 'Amit Kumar', type: 'birthday', date: '2026-07-25', description: 'Amit Kumar\'s birthday', reminder: '1 day before', status: 'upcoming' },
  { id: '6', customerId: '4', customerName: 'Sneha Reddy', type: 'emi', date: '2026-07-08', description: 'EMI payment due for Sneha Reddy', reminder: '3 days before', status: 'upcoming' },
];

export const leadStatuses = ['new', 'contacted', 'interested', 'follow-up', 'converted', 'not-interested', 'closed'];
export const eventTypes = ['birthday', 'anniversary', 'emi', 'renewal'];
export const leadSources = ['Website', 'Referral', 'Social Media', 'Email Campaign', 'Cold Call', 'Trade Show', 'Other'];
export const indianStates = ['Maharashtra', 'Gujarat', 'Karnataka', 'Telangana', 'Delhi', 'Tamil Nadu', 'Kerala', 'Rajasthan', 'Punjab', 'Haryana', 'UP', 'West Bengal', 'Other'];

export const statusColors = {
  'new': 'bg-blue-100 text-blue-700',
  'contacted': 'bg-yellow-100 text-yellow-700',
  'interested': 'bg-purple-100 text-purple-700',
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
