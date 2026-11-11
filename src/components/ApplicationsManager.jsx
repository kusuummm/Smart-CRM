import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Folder,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  CreditCard,
  Download,
  Upload,
  Eye,
  Trash2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  User,
  Phone,
  Mail,
  MessageSquare,
  Award,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getApplicationStats,
  getApplications,
  createApplication,
  updateApplicationStatus,
  updatePaymentStatus,
  uploadApplicationDocument,
  updateDocumentStatus,
  deleteApplicationDocument,
  uploadFinalCertificate,
  deleteFinalCertificate,
  getCustomerCommunicationHistory,
} from '../api/applications';
import { getCustomers } from '../api/customers';

// Helper to resolve static file URL
const getFullUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const serverBase = apiBase.replace(/\/api\/?$/, '');
  return `${serverBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

const STATUS_CONFIG = {
  new: { label: 'New Application', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  pending_documents: { label: 'Pending Documents', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  under_review: { label: 'Under Review', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  approved: { label: 'Approved', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  rejected: { label: 'Rejected', bg: 'bg-red-500/10 text-red-400 border-red-500/20' },
  resubmission_required: { label: 'Resubmit Required', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
};

export default function ApplicationsManager({ onNavigateToCustomers }) {
  // Statistics State
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalApplications: 0,
    newApplications: 0,
    pendingDocuments: 0,
    documentsUnderReview: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    resubmissionRequired: 0,
    rejectedOrResubmission: 0,
    paymentPending: 0,
    paymentCompleted: 0,
  });

  // Applications Table State
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals State
  const [selectedApp, setSelectedApp] = useState(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [isNewAppModalOpen, setIsNewAppModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Communication Timeline State
  const [timelineData, setTimelineData] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState('all');

  // Customer options for new application
  const [customersList, setCustomersList] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Form states
  const [newAppForm, setNewAppForm] = useState({
    customerId: '',
    applicationType: 'membership',
    paymentAmount: 500,
    paymentStatus: 'pending',
    paymentReference: '',
    remarks: '',
  });

  const [docUploadForm, setDocUploadForm] = useState({
    name: 'Aadhaar Card',
    type: 'aadhaar',
    remarks: '',
    file: null,
  });

  const [certForm, setCertForm] = useState({
    certificateNumber: '',
    title: 'PeYug Society Membership Certificate',
    issuedDate: new Date().toISOString().slice(0, 10),
    file: null,
  });

  const [statusUpdateForm, setStatusUpdateForm] = useState({
    status: 'under_review',
    rejectionReason: '',
    resubmissionNotes: '',
    remarks: '',
    paymentStatus: 'pending',
    paymentAmount: 0,
    paymentReference: '',
  });

  // Load Statistics
  const fetchStats = useCallback(async () => {
    try {
      const res = await getApplicationStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.warn('Failed to fetch application stats:', err.message);
    }
  }, []);

  // Load Applications
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        paymentStatus: paymentFilter !== 'all' ? paymentFilter : undefined,
      };
      const res = await getApplications(params);
      if (res.success) {
        setApplications(res.applications || []);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.total || 0);
      }
    } catch (err) {
      toast.error('Failed to load applications: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, paymentFilter]);

  useEffect(() => {
    fetchStats();
    fetchApplications();
  }, [fetchStats, fetchApplications]);

  // Load customer list for dropdown
  const loadCustomers = async () => {
    if (customersList.length > 0) return;
    setLoadingCustomers(true);
    try {
      const res = await getCustomers({ limit: 100 });
      if (res.customers) {
        setCustomersList(res.customers);
      }
    } catch (err) {
      console.warn('Could not load customers dropdown:', err.message);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Open Document Folder Modal
  const openDocumentFolder = (app) => {
    setSelectedApp(app);
    setDocUploadForm({
      name: 'Aadhaar Card',
      type: 'aadhaar',
      remarks: '',
      file: null,
    });
    setIsFolderModalOpen(true);
  };

  // Open Certificate Modal
  const openCertificateModal = (app) => {
    setSelectedApp(app);
    setCertForm({
      certificateNumber:
        app.finalCertificate?.certificateNumber ||
        `CERT-JINL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      title: app.finalCertificate?.title || 'PeYug Society Membership Certificate',
      issuedDate: app.finalCertificate?.issuedDate
        ? new Date(app.finalCertificate.issuedDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      file: null,
    });
    setIsCertModalOpen(true);
  };

  // Open Communication History Timeline
  const openCommunicationHistory = async (app) => {
    setSelectedApp(app);
    setIsTimelineModalOpen(true);
    setTimelineLoading(true);
    const targetCustId = app.customerId?._id || app.customerId;
    try {
      const res = await getCustomerCommunicationHistory(targetCustId);
      if (res.success) {
        setTimelineData(res);
      }
    } catch (err) {
      toast.error('Failed to fetch communication history: ' + err.message);
    } finally {
      setTimelineLoading(false);
    }
  };

  // Open Status Update Modal
  const openStatusModal = (app) => {
    setSelectedApp(app);
    setStatusUpdateForm({
      status: app.status,
      rejectionReason: app.rejectionReason || '',
      resubmissionNotes: app.resubmissionNotes || '',
      remarks: app.remarks || '',
      paymentStatus: app.paymentStatus || 'pending',
      paymentAmount: app.paymentAmount || 0,
      paymentReference: app.paymentReference || '',
    });
    setIsStatusModalOpen(true);
  };

  // Submit New Application
  const handleCreateApplication = async (e) => {
    e.preventDefault();
    if (!newAppForm.customerId) {
      toast.error('Please select a customer');
      return;
    }
    try {
      const res = await createApplication(newAppForm);
      if (res.success) {
        toast.success(`Application ${res.application.applicationNumber} created!`);
        setIsNewAppModalOpen(false);
        fetchStats();
        fetchApplications();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // Handle Document Upload
  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!docUploadForm.file) {
      toast.error('Please select a document file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('file', docUploadForm.file);
    formData.append('name', docUploadForm.name);
    formData.append('type', docUploadForm.type);
    formData.append('remarks', docUploadForm.remarks);

    try {
      const res = await uploadApplicationDocument(selectedApp._id, formData);
      if (res.success) {
        toast.success('Document uploaded to folder!');
        setSelectedApp(res.application);
        setDocUploadForm({
          name: 'PAN Card',
          type: 'pan',
          remarks: '',
          file: null,
        });
        fetchStats();
        fetchApplications();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // Handle Document Status Change (Verify, Reject, Resubmit)
  const handleDocStatusChange = async (docId, newStatus) => {
    let remarks = '';
    if (newStatus === 'rejected' || newStatus === 'resubmission_required') {
      remarks = window.prompt(`Enter reason for marking this document as '${newStatus}':`);
      if (remarks === null) return;
    }

    try {
      const res = await updateDocumentStatus(selectedApp._id, docId, {
        status: newStatus,
        remarks,
      });
      if (res.success) {
        toast.success(`Document marked as ${newStatus}`);
        setSelectedApp(res.application);
        fetchStats();
        fetchApplications();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // Handle Delete Document
  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document from the application folder?')) {
      return;
    }
    try {
      const res = await deleteApplicationDocument(selectedApp._id, docId);
      if (res.success) {
        toast.success('Document removed from folder');
        setSelectedApp(res.application);
        fetchStats();
        fetchApplications();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // Handle Final Certificate Upload
  const handleUploadCertificate = async (e) => {
    e.preventDefault();
    if (!certForm.file && !selectedApp.finalCertificate?.fileUrl) {
      toast.error('Please select a Certificate PDF or image file');
      return;
    }

    const formData = new FormData();
    if (certForm.file) {
      formData.append('file', certForm.file);
    }
    formData.append('certificateNumber', certForm.certificateNumber);
    formData.append('title', certForm.title);
    formData.append('issuedDate', certForm.issuedDate);

    try {
      const res = await uploadFinalCertificate(selectedApp._id, formData);
      if (res.success) {
        toast.success('Certificate issued & Application marked Approved!');
        setSelectedApp(res.application);
        setIsCertModalOpen(false);
        fetchStats();
        fetchApplications();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // Handle Delete Certificate
  const handleDeleteCert = async () => {
    if (!window.confirm('Are you sure you want to remove the issued certificate?')) return;
    try {
      const res = await deleteFinalCertificate(selectedApp._id);
      if (res.success) {
        toast.success('Certificate removed');
        setSelectedApp(res.application);
        fetchStats();
        fetchApplications();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // Handle Status Update Submit
  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Update status
      const res1 = await updateApplicationStatus(selectedApp._id, {
        status: statusUpdateForm.status,
        rejectionReason: statusUpdateForm.rejectionReason,
        resubmissionNotes: statusUpdateForm.resubmissionNotes,
        remarks: statusUpdateForm.remarks,
      });

      // 2. Update payment if changed
      if (statusUpdateForm.paymentStatus !== selectedApp.paymentStatus || statusUpdateForm.paymentAmount !== selectedApp.paymentAmount) {
        await updatePaymentStatus(selectedApp._id, {
          paymentStatus: statusUpdateForm.paymentStatus,
          paymentAmount: statusUpdateForm.paymentAmount,
          paymentReference: statusUpdateForm.paymentReference,
        });
      }

      toast.success('Application updated successfully!');
      setIsStatusModalOpen(false);
      fetchStats();
      fetchApplications();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // Filtered timeline
  const filteredTimeline = useMemo(() => {
    if (!timelineData?.timeline) return [];
    if (timelineFilter === 'all') return timelineData.timeline;
    return timelineData.timeline.filter((item) => item.type === timelineFilter);
  }, [timelineData, timelineFilter]);

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* 1. TOP METRIC DASHBOARD (THE 10 ESSENTIAL ADMIN REQUIREMENTS)   */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Total Registered Customers */}
        <div
          onClick={() => {
            if (onNavigateToCustomers) onNavigateToCustomers();
          }}
          className="cursor-pointer bg-[#15203b] hover:bg-[#1c2a4d] border border-blue-500/20 hover:border-blue-500/40 rounded-xl p-3.5 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between text-xs text-blue-400 font-semibold mb-1">
            <span>Total Customers</span>
            <User size={15} />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalCustomers}</div>
          <p className="text-[10px] text-dark-400 mt-1">Registered members</p>
        </div>

        {/* 2. New Applications */}
        <div
          onClick={() => setStatusFilter('new')}
          className={`cursor-pointer rounded-xl p-3.5 border transition-all shadow-sm ${
            statusFilter === 'new'
              ? 'bg-blue-600/20 border-blue-500 text-white ring-2 ring-blue-500/50'
              : 'bg-[#15203b] hover:bg-[#1c2a4d] border-blue-500/20'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-400 font-semibold mb-1">
            <span>New Applications</span>
            <FileText size={15} />
          </div>
          <div className="text-2xl font-bold text-white">{stats.newApplications}</div>
          <p className="text-[10px] text-dark-400 mt-1">Awaiting first action</p>
        </div>

        {/* 3. Pending Documents */}
        <div
          onClick={() => setStatusFilter('pending_documents')}
          className={`cursor-pointer rounded-xl p-3.5 border transition-all shadow-sm ${
            statusFilter === 'pending_documents'
              ? 'bg-amber-600/20 border-amber-500 text-white ring-2 ring-amber-500/50'
              : 'bg-[#15203b] hover:bg-[#1c2a4d] border-amber-500/20'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-1">
            <span>Pending Docs</span>
            <Clock size={15} />
          </div>
          <div className="text-2xl font-bold text-white">{stats.pendingDocuments}</div>
          <p className="text-[10px] text-dark-400 mt-1">Missing uploads</p>
        </div>

        {/* 4. Documents Under Review */}
        <div
          onClick={() => setStatusFilter('under_review')}
          className={`cursor-pointer rounded-xl p-3.5 border transition-all shadow-sm ${
            statusFilter === 'under_review'
              ? 'bg-purple-600/20 border-purple-500 text-white ring-2 ring-purple-500/50'
              : 'bg-[#15203b] hover:bg-[#1c2a4d] border-purple-500/20'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-purple-400 font-semibold mb-1">
            <span>Under Review</span>
            <Eye size={15} />
          </div>
          <div className="text-2xl font-bold text-white">{stats.documentsUnderReview}</div>
          <p className="text-[10px] text-dark-400 mt-1">Docs being checked</p>
        </div>

        {/* 5. Approved Applications */}
        <div
          onClick={() => setStatusFilter('approved')}
          className={`cursor-pointer rounded-xl p-3.5 border transition-all shadow-sm ${
            statusFilter === 'approved'
              ? 'bg-emerald-600/20 border-emerald-500 text-white ring-2 ring-emerald-500/50'
              : 'bg-[#15203b] hover:bg-[#1c2a4d] border-emerald-500/20'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-1">
            <span>Approved</span>
            <CheckCircle2 size={15} />
          </div>
          <div className="text-2xl font-bold text-white">{stats.approvedApplications}</div>
          <p className="text-[10px] text-dark-400 mt-1">Ready for certificate</p>
        </div>

        {/* 6. Rejected / Resubmission Required */}
        <div
          onClick={() => setStatusFilter('rejected_or_resubmission')}
          className={`cursor-pointer rounded-xl p-3.5 border transition-all shadow-sm ${
            statusFilter === 'rejected_or_resubmission'
              ? 'bg-red-600/20 border-red-500 text-white ring-2 ring-red-500/50'
              : 'bg-[#15203b] hover:bg-[#1c2a4d] border-red-500/20'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-red-400 font-semibold mb-1">
            <span>Rejected / Resubmit</span>
            <AlertCircle size={15} />
          </div>
          <div className="text-2xl font-bold text-white">{stats.rejectedOrResubmission}</div>
          <p className="text-[10px] text-dark-400 mt-1">
            {stats.resubmissionRequired} resubmit, {stats.rejectedApplications} rejected
          </p>
        </div>

        {/* 7. Payment Pending / Completed */}
        <div
          onClick={() => {
            if (paymentFilter === 'all') setPaymentFilter('pending');
            else if (paymentFilter === 'pending') setPaymentFilter('completed');
            else setPaymentFilter('all');
          }}
          className={`cursor-pointer rounded-xl p-3.5 border transition-all shadow-sm ${
            paymentFilter !== 'all'
              ? 'bg-teal-600/20 border-teal-500 text-white ring-2 ring-teal-500/50'
              : 'bg-[#15203b] hover:bg-[#1c2a4d] border-teal-500/20'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-teal-400 font-semibold mb-1">
            <span>Payments</span>
            <CreditCard size={15} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-emerald-400">{stats.paymentCompleted}</span>
            <span className="text-xs text-dark-400">/</span>
            <span className="text-sm font-semibold text-amber-400">{stats.paymentPending} pend</span>
          </div>
          <p className="text-[10px] text-dark-400 mt-1">
            {paymentFilter === 'pending'
              ? 'Filtering: Pending'
              : paymentFilter === 'completed'
              ? 'Filtering: Completed'
              : 'Click to filter'}
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. FILTER BAR & ACTIONS                                       */}
      {/* ============================================================== */}
      <div className="bg-[#15203b] border border-[#213259] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-2.5 text-dark-400" size={16} />
          <input
            type="text"
            placeholder="Search by Application #, Customer Name, Mobile, or Certificate #..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-[#0c1427] border border-[#213259] rounded-lg text-sm text-white placeholder-dark-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Quick Filter Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#0c1427] border border-[#213259] rounded-lg text-xs text-white focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="new">New Applications</option>
            <option value="pending_documents">Pending Documents</option>
            <option value="under_review">Documents Under Review</option>
            <option value="approved">Approved Applications</option>
            <option value="resubmission_required">Resubmission Required</option>
            <option value="rejected">Rejected</option>
            <option value="rejected_or_resubmission">Rejected / Resubmission</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#0c1427] border border-[#213259] rounded-lg text-xs text-white focus:outline-none"
          >
            <option value="all">All Payments</option>
            <option value="completed">Payment Completed</option>
            <option value="pending">Payment Pending</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setPaymentFilter('all');
              setPage(1);
              fetchStats();
              fetchApplications();
            }}
            title="Reset Filters & Refresh"
            className="p-2 bg-[#0c1427] hover:bg-[#1c2a4d] border border-[#213259] rounded-lg text-dark-300 hover:text-white"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => {
              loadCustomers();
              setIsNewAppModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Plus size={15} />
            <span>New Application</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. APPLICATIONS TABLE                                         */}
      {/* ============================================================== */}
      <div className="bg-[#15203b] border border-[#213259] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0e172e] text-dark-400 uppercase tracking-wider text-[10px] border-b border-[#213259]">
              <tr>
                <th className="px-4 py-3">Application #</th>
                <th className="px-4 py-3">Customer Details</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Documents Folder</th>
                <th className="px-4 py-3">Final Certificate</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2c4f]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-dark-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-blue-400" />
                      <span>Loading applications...</span>
                    </div>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-dark-400">
                    <p className="font-semibold text-white mb-1">No applications found</p>
                    <p className="text-xs">Adjust your search or click "+ New Application" to create one.</p>
                  </td>
                </tr>
              ) : (
                applications.map((app) => {
                  const statusConf = STATUS_CONFIG[app.status] || STATUS_CONFIG.new;
                  const docCount = app.documents?.length || 0;
                  const verifiedDocCount = app.documents?.filter((d) => d.status === 'verified').length || 0;
                  const hasCert = Boolean(app.finalCertificate?.fileUrl);

                  return (
                    <tr key={app._id} className="hover:bg-[#1a2647] transition-colors">
                      {/* Application Number */}
                      <td className="px-4 py-3 font-mono font-semibold text-blue-400">
                        {app.applicationNumber}
                        <div className="text-[10px] font-normal text-dark-400 mt-0.5">
                          {new Date(app.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{app.customerName}</div>
                        <div className="text-dark-400 text-[11px] flex items-center gap-2 mt-0.5">
                          <span>{app.customerMobile}</span>
                          {app.customerEmail && <span className="truncate max-w-[120px]">{app.customerEmail}</span>}
                        </div>
                      </td>

                      {/* Application Type */}
                      <td className="px-4 py-3">
                        <span className="capitalize px-2 py-0.5 rounded text-[11px] bg-dark-700/60 text-dark-200 border border-dark-600/40">
                          {app.applicationType.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${statusConf.bg}`}
                        >
                          {statusConf.label}
                        </span>
                        {app.status === 'rejected' && app.rejectionReason && (
                          <div className="text-[10px] text-red-400 truncate max-w-[150px] mt-0.5">
                            {app.rejectionReason}
                          </div>
                        )}
                        {app.status === 'resubmission_required' && app.resubmissionNotes && (
                          <div className="text-[10px] text-orange-400 truncate max-w-[150px] mt-0.5">
                            {app.resubmissionNotes}
                          </div>
                        )}
                      </td>

                      {/* Payment */}
                      <td className="px-4 py-3">
                        {app.paymentStatus === 'completed' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                            <CheckCircle2 size={13} />
                            <span>₹{app.paymentAmount} Paid</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                            <Clock size={13} />
                            <span>₹{app.paymentAmount} Pending</span>
                          </span>
                        )}
                        {app.paymentReference && (
                          <div className="text-[10px] text-dark-400 font-mono mt-0.5 truncate max-w-[110px]">
                            Ref: {app.paymentReference}
                          </div>
                        )}
                      </td>

                      {/* Document Folder */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDocumentFolder(app)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0c1427] hover:bg-[#1e2e54] border border-[#213259] rounded text-[11px] text-sky-400 hover:text-sky-300 font-medium transition-colors"
                        >
                          <Folder size={13} />
                          <span>
                            Folder ({verifiedDocCount}/{docCount})
                          </span>
                        </button>
                      </td>

                      {/* Final Certificate */}
                      <td className="px-4 py-3">
                        {hasCert ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={getFullUrl(app.finalCertificate.fileUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 font-semibold"
                            >
                              <Download size={12} />
                              <span>Download</span>
                            </a>
                            <button
                              onClick={() => openCertificateModal(app)}
                              title="Inspect certificate"
                              className="text-dark-400 hover:text-white"
                            >
                              <Eye size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openCertificateModal(app)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-dark-700/60 hover:bg-dark-600 text-dark-300 hover:text-white border border-dark-600/40"
                          >
                            <Upload size={12} />
                            <span>Upload Cert</span>
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Communication History */}
                          <button
                            onClick={() => openCommunicationHistory(app)}
                            title="Customer Communication History"
                            className="p-1.5 bg-[#0c1427] hover:bg-[#1e2e54] border border-[#213259] rounded text-teal-400 hover:text-teal-300"
                          >
                            <MessageSquare size={13} />
                          </button>

                          {/* Status & Review Modal */}
                          <button
                            onClick={() => openStatusModal(app)}
                            title="Update Status & Payment"
                            className="p-1.5 bg-[#0c1427] hover:bg-[#1e2e54] border border-[#213259] rounded text-blue-400 hover:text-blue-300"
                          >
                            <ShieldCheck size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="bg-[#0e172e] px-4 py-2.5 border-t border-[#213259] flex items-center justify-between text-xs text-dark-400">
          <span>
            Showing {applications.length} of {totalCount} applications
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="px-2.5 py-1 bg-[#15203b] hover:bg-[#1f3059] disabled:opacity-40 disabled:hover:bg-[#15203b] border border-[#213259] rounded text-white"
            >
              Previous
            </button>
            <span className="text-white font-semibold">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="px-2.5 py-1 bg-[#15203b] hover:bg-[#1f3059] disabled:opacity-40 disabled:hover:bg-[#15203b] border border-[#213259] rounded text-white"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. MODAL: APPLICATION-WISE DOCUMENT FOLDER                      */}
      {/* ============================================================== */}
      {isFolderModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#10192e] border border-[#233560] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-[#14203d] border-b border-[#233560] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                  <Folder size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Application Document Folder</h3>
                  <p className="text-xs text-dark-400">
                    {selectedApp.applicationNumber} • {selectedApp.customerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-[#1e2e54]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Document List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-dark-400">
                  Uploaded Documents ({selectedApp.documents?.length || 0})
                </h4>

                {!selectedApp.documents || selectedApp.documents.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-[#233560] rounded-xl text-dark-400 text-xs">
                    No documents uploaded in this folder yet. Use the upload form below to add Aadhaar, PAN, Photos, etc.
                  </div>
                ) : (
                  selectedApp.documents.map((doc) => {
                    const docStatusColor =
                      doc.status === 'verified'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : doc.status === 'rejected'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : doc.status === 'resubmission_required'
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

                    return (
                      <div
                        key={doc._id}
                        className="bg-[#15203b] border border-[#233560] rounded-xl p-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText size={20} className="text-blue-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold text-white text-xs truncate flex items-center gap-2">
                              <span>{doc.name}</span>
                              <span
                                className={`text-[10px] px-2 py-0.2 rounded-full border capitalize ${docStatusColor}`}
                              >
                                {doc.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-[11px] text-dark-400 flex items-center gap-2 mt-0.5">
                              <span className="truncate max-w-[150px]">{doc.fileName}</span>
                              {doc.fileSize > 0 && <span>• {Math.round(doc.fileSize / 1024)} KB</span>}
                              {doc.remarks && <span className="text-orange-400">• Note: {doc.remarks}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Preview link */}
                          <a
                            href={getFullUrl(doc.fileUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-[#0c1427] hover:bg-[#1f3059] border border-[#233560] rounded text-blue-400 hover:text-blue-300"
                            title="View/Download File"
                          >
                            <ExternalLink size={14} />
                          </a>

                          {/* Verify */}
                          <button
                            onClick={() => handleDocStatusChange(doc._id, 'verified')}
                            className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded text-emerald-400"
                            title="Verify Document"
                          >
                            <CheckCircle2 size={14} />
                          </button>

                          {/* Request Resubmission */}
                          <button
                            onClick={() => handleDocStatusChange(doc._id, 'resubmission_required')}
                            className="p-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded text-orange-400"
                            title="Request Resubmission"
                          >
                            <RefreshCw size={14} />
                          </button>

                          {/* Reject */}
                          <button
                            onClick={() => handleDocStatusChange(doc._id, 'rejected')}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-red-400"
                            title="Reject Document"
                          >
                            <XCircle size={14} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteDocument(doc._id)}
                            className="p-1.5 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded text-dark-400 hover:text-red-400"
                            title="Delete Document"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Upload New Document Box */}
              <form
                onSubmit={handleUploadDocument}
                className="mt-4 p-4 bg-[#0e172e] border border-[#233560] rounded-xl space-y-3"
              >
                <h5 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Upload size={14} className="text-blue-400" />
                  <span>Upload Document to this Folder</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-dark-400 block mb-1">Document Label</label>
                    <input
                      type="text"
                      value={docUploadForm.name}
                      onChange={(e) => setDocUploadForm({ ...docUploadForm, name: e.target.value })}
                      placeholder="e.g. Aadhaar Card, PAN Card, Photo"
                      className="w-full px-3 py-1.5 bg-[#15203b] border border-[#233560] rounded-lg text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-dark-400 block mb-1">Document Type</label>
                    <select
                      value={docUploadForm.type}
                      onChange={(e) => setDocUploadForm({ ...docUploadForm, type: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#15203b] border border-[#233560] rounded-lg text-xs text-white"
                    >
                      <option value="aadhaar">Aadhaar Card</option>
                      <option value="pan">PAN Card</option>
                      <option value="photo">Photograph</option>
                      <option value="signature">Signature</option>
                      <option value="address_proof">Address Proof</option>
                      <option value="income_proof">Income / Salary Proof</option>
                      <option value="bank_statement">Bank Statement</option>
                      <option value="other">Other Document</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-dark-400 block mb-1">Choose File (PDF, JPG, PNG, WEBP)</label>
                  <input
                    type="file"
                    onChange={(e) => setDocUploadForm({ ...docUploadForm, file: e.target.files[0] })}
                    className="w-full text-xs text-dark-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-all shadow-sm"
                >
                  Upload Document
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. MODAL: FINAL CERTIFICATE UPLOAD & DOWNLOAD                   */}
      {/* ============================================================== */}
      {isCertModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#10192e] border border-[#233560] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#14203d] border-b border-[#233560] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Final Certificate</h3>
                  <p className="text-xs text-dark-400">{selectedApp.customerName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsCertModalOpen(false)}
                className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-[#1e2e54]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* If already has certificate */}
              {selectedApp.finalCertificate?.fileUrl ? (
                <div className="bg-[#15203b] border border-emerald-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                    <CheckCircle2 size={16} />
                    <span>Certificate Officially Issued</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="text-white font-medium">
                      Certificate #: <span className="font-mono text-emerald-300">{selectedApp.finalCertificate.certificateNumber}</span>
                    </div>
                    <div className="text-dark-400">
                      Title: <span className="text-dark-200">{selectedApp.finalCertificate.title}</span>
                    </div>
                    {selectedApp.finalCertificate.issuedDate && (
                      <div className="text-dark-400">
                        Issued Date: <span className="text-dark-200">{new Date(selectedApp.finalCertificate.issuedDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <a
                      href={getFullUrl(selectedApp.finalCertificate.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-sm"
                    >
                      <Download size={14} />
                      <span>Download Certificate</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleDeleteCert}
                      className="p-2 bg-dark-800 hover:bg-dark-700 text-dark-400 hover:text-red-400 border border-dark-600 rounded-lg text-xs"
                      title="Remove Certificate"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Upload / Re-issue Form */}
              <form onSubmit={handleUploadCertificate} className="space-y-3">
                <h5 className="text-xs font-semibold text-white">
                  {selectedApp.finalCertificate?.fileUrl ? 'Replace / Re-issue Certificate' : 'Issue & Upload Final Certificate'}
                </h5>

                <div>
                  <label className="text-[11px] text-dark-400 block mb-1">Certificate Number</label>
                  <input
                    type="text"
                    value={certForm.certificateNumber}
                    onChange={(e) => setCertForm({ ...certForm, certificateNumber: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#15203b] border border-[#233560] rounded-lg text-xs text-white font-mono"
                    placeholder="e.g. CERT-JINL-2026-1002"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] text-dark-400 block mb-1">Certificate Title</label>
                  <input
                    type="text"
                    value={certForm.title}
                    onChange={(e) => setCertForm({ ...certForm, title: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#15203b] border border-[#233560] rounded-lg text-xs text-white"
                    placeholder="PeYug Society Membership Certificate"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-dark-400 block mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={certForm.issuedDate}
                    onChange={(e) => setCertForm({ ...certForm, issuedDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#15203b] border border-[#233560] rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-dark-400 block mb-1">Certificate Document File (PDF / Image)</label>
                  <input
                    type="file"
                    onChange={(e) => setCertForm({ ...certForm, file: e.target.files[0] })}
                    className="w-full text-xs text-dark-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                    required={!selectedApp.finalCertificate?.fileUrl}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-all shadow-sm"
                >
                  Upload & Issue Final Certificate
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. MODAL: CUSTOMER-WISE COMMUNICATION HISTORY                   */}
      {/* ============================================================== */}
      {isTimelineModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#10192e] border border-[#233560] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#14203d] border-b border-[#233560] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Customer Communication History</h3>
                  <p className="text-xs text-dark-400">
                    {selectedApp.customerName} • {selectedApp.customerMobile}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTimelineModalOpen(false)}
                className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-[#1e2e54]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Pills */}
            <div className="px-6 py-2.5 bg-[#0e172e] border-b border-[#233560] flex flex-wrap items-center gap-2 text-xs">
              <span className="text-dark-400 mr-1">Filter:</span>
              {[
                { id: 'all', label: 'All Timeline' },
                { id: 'call', label: `Calls (${timelineData?.counts?.calls || 0})` },
                { id: 'whatsapp', label: `WhatsApp (${timelineData?.counts?.whatsapp || 0})` },
                { id: 'email', label: `Emails (${timelineData?.counts?.emails || 0})` },
                { id: 'note', label: `Notes (${timelineData?.counts?.notes || 0})` },
                { id: 'application', label: `Applications (${timelineData?.counts?.applications || 0})` },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setTimelineFilter(pill.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${
                    timelineFilter === pill.id
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-[#15203b] hover:bg-[#1c2a4d] text-dark-300'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Timeline Stream */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {timelineLoading ? (
                <div className="py-12 text-center text-dark-400">
                  <RefreshCw size={20} className="animate-spin text-teal-400 mx-auto mb-2" />
                  <span>Loading communication stream...</span>
                </div>
              ) : filteredTimeline.length === 0 ? (
                <div className="py-12 text-center text-dark-400 text-xs">
                  No communication records found for this customer.
                </div>
              ) : (
                <div className="relative pl-6 border-l border-[#233560] space-y-4">
                  {filteredTimeline.map((item) => {
                    const iconMap = {
                      call: <Phone size={13} className="text-sky-400" />,
                      whatsapp: <MessageSquare size={13} className="text-emerald-400" />,
                      email: <Mail size={13} className="text-violet-400" />,
                      note: <FileText size={13} className="text-amber-400" />,
                      application: <Award size={13} className="text-teal-400" />,
                      application_event: <CheckCircle2 size={13} className="text-blue-400" />,
                    };

                    return (
                      <div key={item.id} className="relative group">
                        {/* Dot on timeline */}
                        <div className="absolute -left-[31px] top-1 w-6 h-6 rounded-full bg-[#10192e] border border-[#233560] flex items-center justify-center">
                          {iconMap[item.type] || <Clock size={12} className="text-dark-400" />}
                        </div>

                        {/* Card */}
                        <div className="bg-[#15203b] border border-[#233560] rounded-xl p-3 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-white">{item.title}</span>
                            <span className="text-[10px] text-dark-400">
                              {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                            </span>
                          </div>

                          {item.actor && (
                            <div className="text-[11px] text-blue-400">By: {item.actor}</div>
                          )}

                          {item.details && (
                            <div className="text-xs text-dark-300">
                              {item.details.message && <p className="italic">"{item.details.message}"</p>}
                              {item.details.notes && <p>{item.details.notes}</p>}
                              {item.details.content && <p>{item.details.content}</p>}
                              {item.details.preview && <p className="text-dark-400">{item.details.preview}</p>}
                              {item.details.duration && (
                                <p className="text-dark-400">Duration: {item.details.duration} seconds</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. MODAL: CREATE NEW APPLICATION                               */}
      {/* ============================================================== */}
      {isNewAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#10192e] border border-[#233560] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#14203d] border-b border-[#233560] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus size={16} className="text-blue-400" />
                <span>Initiate New Customer Application</span>
              </h3>
              <button
                onClick={() => setIsNewAppModalOpen(false)}
                className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-[#1e2e54]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateApplication} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-dark-300 font-semibold block mb-1">
                  Select Registered Customer *
                </label>
                {loadingCustomers ? (
                  <div className="text-xs text-dark-400 py-2">Loading customer directory...</div>
                ) : (
                  <select
                    value={newAppForm.customerId}
                    onChange={(e) => setNewAppForm({ ...newAppForm, customerId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#15203b] border border-[#233560] rounded-lg text-xs text-white"
                    required
                  >
                    <option value="">-- Choose a Customer --</option>
                    {customersList.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.mobile || c.phone}) {c.company ? `• ${c.company}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-dark-300 font-semibold block mb-1">Application Type</label>
                  <select
                    value={newAppForm.applicationType}
                    onChange={(e) => setNewAppForm({ ...newAppForm, applicationType: e.target.value })}
                    className="w-full px-3 py-2 bg-[#15203b] border border-[#233560] rounded-lg text-xs text-white"
                  >
                    <option value="membership">Society Membership</option>
                    <option value="cooperative_loan">Cooperative Loan</option>
                    <option value="fixed_deposit">Fixed Deposit</option>
                    <option value="recurring_deposit">Recurring Deposit</option>
                    <option value="society_registration">Society Registration</option>
                    <option value="certificate_issue">Certificate Issue</option>
                    <option value="general_service">General Service</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-dark-300 font-semibold block mb-1">Fee Amount (₹)</label>
                  <input
                    type="number"
                    value={newAppForm.paymentAmount}
                    onChange={(e) => setNewAppForm({ ...newAppForm, paymentAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-[#15203b] border border-[#233560] rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-dark-300 font-semibold block mb-1">Payment Status</label>
                  <select
                    value={newAppForm.paymentStatus}
                    onChange={(e) => setNewAppForm({ ...newAppForm, paymentStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-[#15203b] border border-[#233560] rounded-lg text-xs text-white"
                  >
                    <option value="pending">Payment Pending</option>
                    <option value="completed">Payment Completed</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-dark-300 font-semibold block mb-1">Payment Ref / Txn ID</label>
                  <input
                    type="text"
                    value={newAppForm.paymentReference}
                    onChange={(e) => setNewAppForm({ ...newAppForm, paymentReference: e.target.value })}
                    placeholder="e.g. UPI/UTR/Cash"
                    className="w-full px-3 py-2 bg-[#15203b] border border-[#233560] rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-dark-300 font-semibold block mb-1">Initial Notes</label>
                <textarea
                  rows={2}
                  value={newAppForm.remarks}
                  onChange={(e) => setNewAppForm({ ...newAppForm, remarks: e.target.value })}
                  placeholder="Notes about documents required, special instructions..."
                  className="w-full px-3 py-2 bg-[#15203b] border border-[#233560] rounded-lg text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-all shadow-sm"
              >
                Create Application
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. MODAL: UPDATE APPLICATION STATUS & PAYMENT                  */}
      {/* ============================================================== */}
      {isStatusModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#10192e] border border-[#233560] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#14203d] border-b border-[#233560] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Review & Update Status</h3>
                <p className="text-xs text-dark-400">{selectedApp.applicationNumber}</p>
              </div>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-[#1e2e54]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-dark-300 font-semibold block mb-1">Application Lifecycle Status</label>
                <select
                  value={statusUpdateForm.status}
                  onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, status: e.target.value })}
                  className="w-full px-3 py-2 bg-[#15203b] border border-[#233560] rounded-lg text-xs text-white font-medium"
                >
                  <option value="new">New Application</option>
                  <option value="pending_documents">Pending Documents</option>
                  <option value="under_review">Documents Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="resubmission_required">Rejected / Resubmission Required</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {statusUpdateForm.status === 'rejected' && (
                <div>
                  <label className="text-xs text-red-400 font-semibold block mb-1">Rejection Reason *</label>
                  <textarea
                    rows={2}
                    value={statusUpdateForm.rejectionReason}
                    onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, rejectionReason: e.target.value })}
                    placeholder="Enter reason for rejection..."
                    className="w-full px-3 py-2 bg-[#15203b] border border-red-500/30 rounded-lg text-xs text-white"
                    required
                  />
                </div>
              )}

              {statusUpdateForm.status === 'resubmission_required' && (
                <div>
                  <label className="text-xs text-orange-400 font-semibold block mb-1">Resubmission Instructions *</label>
                  <textarea
                    rows={2}
                    value={statusUpdateForm.resubmissionNotes}
                    onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, resubmissionNotes: e.target.value })}
                    placeholder="Describe which documents need to be re-uploaded and why..."
                    className="w-full px-3 py-2 bg-[#15203b] border border-orange-500/30 rounded-lg text-xs text-white"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#233560]">
                <div>
                  <label className="text-xs text-dark-300 font-semibold block mb-1">Payment Status</label>
                  <select
                    value={statusUpdateForm.paymentStatus}
                    onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, paymentStatus: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#15203b] border border-[#233560] rounded-lg text-xs text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-dark-300 font-semibold block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={statusUpdateForm.paymentAmount}
                    onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, paymentAmount: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#15203b] border border-[#233560] rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-dark-300 font-semibold block mb-1">Payment Reference / Note</label>
                <input
                  type="text"
                  value={statusUpdateForm.paymentReference}
                  onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, paymentReference: e.target.value })}
                  placeholder="e.g. UPI/Txn #12345"
                  className="w-full px-3 py-1.5 bg-[#15203b] border border-[#233560] rounded-lg text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-all shadow-sm"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
