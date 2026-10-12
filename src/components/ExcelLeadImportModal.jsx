import { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Users,
  Shield,
  Download,
  X,
  Layers,
  Check,
  Sparkles,
  Info,
  Phone,
  User,
  Building,
  MapPin,
  Tag,
  FileText,
} from 'lucide-react';
import { getUsers } from '../api/users';
import { bulkImportLeads } from '../api/leads';
import { toast } from 'react-hot-toast';

const CHUNK_SIZE = 500; // 500 rows per batch ensures fast, lightweight requests

export default function ExcelLeadImportModal({ isOpen, onClose, onImportSuccess }) {
  // Steps: 'upload' -> 'mapping' -> 'strategy' -> 'importing' -> 'complete'
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Column Mapping
  const [mapping, setMapping] = useState({
    name: '',
    mobile: '',
    email: '',
    company: '',
    city: '',
    state: '',
    interestedProduct: '',
    leadSource: '',
    remarks: '',
  });

  // Assignment Strategy
  const [assignmentStrategy, setAssignmentStrategy] = useState('round-robin'); // 'round-robin' | 'direct' | 'unassigned'
  const [activeTelecallers, setActiveTelecallers] = useState([]);
  const [selectedCallerIds, setSelectedCallerIds] = useState([]);
  const [directCallerId, setDirectCallerId] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [batchName, setBatchName] = useState('');

  // Execution & Progress State
  const [progress, setProgress] = useState({
    currentChunk: 0,
    totalChunks: 0,
    processedCount: 0,
    totalRows: 0,
    importedCount: 0,
    duplicatesSkipped: 0,
    invalidCount: 0,
    callerBreakdown: {},
  });
  const [isCancelling, setIsCancelling] = useState(false);
  const cancelRef = useRef(false);

  // Load active approved telecallers
  useEffect(() => {
    if (!isOpen) return;
    getUsers({ role: 'telecaller' })
      .then((res) => {
        const approved = (res.users || []).filter(
          (u) => u.isApproved !== false && u.status !== 'rejected' && u.status !== 'inactive'
        );
        setActiveTelecallers(approved);
        // Default select all active telecallers for round-robin
        setSelectedCallerIds(approved.map((u) => u._id));
        if (approved.length > 0) setDirectCallerId(approved[0]._id);
      })
      .catch(() => {});
  }, [isOpen]);

  // Reset modal when reopened
  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setFile(null);
      setRawHeaders([]);
      setRawData([]);
      setBatchName('');
      setProgress({
        currentChunk: 0,
        totalChunks: 0,
        processedCount: 0,
        totalRows: 0,
        importedCount: 0,
        duplicatesSkipped: 0,
        invalidCount: 0,
        callerBreakdown: {},
      });
      setIsCancelling(false);
      cancelRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ================= 1. FILE PARSING =================
  const handleFileProcess = (selectedFile) => {
    if (!selectedFile) return;
    const validExts = ['.xlsx', '.xls', '.csv'];
    const fileName = selectedFile.name.toLowerCase();
    const isValid = validExts.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      toast.error('Please upload an Excel (.xlsx, .xls) or CSV file');
      return;
    }

    setFile(selectedFile);
    setBatchName(selectedFile.name.replace(/\.[^/.]+$/, ''));

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!json || json.length === 0) {
          toast.error('The selected spreadsheet appears to be empty');
          return;
        }

        const headers = Object.keys(json[0] || {});
        setRawHeaders(headers);
        setRawData(json);

        // Auto-detect column headers based on common naming patterns
        const autoMap = {
          name: '',
          mobile: '',
          email: '',
          company: '',
          city: '',
          state: '',
          interestedProduct: '',
          leadSource: '',
          remarks: '',
        };

        headers.forEach((h) => {
          const lower = h.toLowerCase().trim();
          if (!autoMap.name && (lower.includes('name') || lower.includes('client') || lower.includes('customer'))) {
            autoMap.name = h;
          } else if (
            !autoMap.mobile &&
            (lower.includes('phone') || lower.includes('mobile') || lower.includes('contact') || lower.includes('cell') || lower.includes('number'))
          ) {
            autoMap.mobile = h;
          } else if (!autoMap.email && lower.includes('mail')) {
            autoMap.email = h;
          } else if (!autoMap.company && (lower.includes('company') || lower.includes('org') || lower.includes('firm') || lower.includes('business'))) {
            autoMap.company = h;
          } else if (!autoMap.city && lower.includes('city')) {
            autoMap.city = h;
          } else if (!autoMap.state && lower.includes('state')) {
            autoMap.state = h;
          } else if (!autoMap.interestedProduct && (lower.includes('product') || lower.includes('service') || lower.includes('package') || lower.includes('course'))) {
            autoMap.interestedProduct = h;
          } else if (!autoMap.leadSource && (lower.includes('source') || lower.includes('campaign') || lower.includes('channel') || lower.includes('medium'))) {
            autoMap.leadSource = h;
          } else if (!autoMap.remarks && (lower.includes('remark') || lower.includes('note') || lower.includes('comment') || lower.includes('desc'))) {
            autoMap.remarks = h;
          }
        });

        setMapping(autoMap);
        setStep('mapping');
      } catch (err) {
        toast.error('Failed to parse spreadsheet file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        'Full Name': 'Aarav Sharma',
        'Mobile Number': '9876543210',
        'Email': 'aarav@example.com',
        'Company Name': 'Sharma Enterprises',
        'City': 'Mumbai',
        'State': 'Maharashtra',
        'Interested Product': 'CRM Enterprise Pro',
        'Lead Source': 'Website',
        'Remarks': 'Requested demo call for 10 users',
      },
      {
        'Full Name': 'Priya Patel',
        'Mobile Number': '9812345678',
        'Email': 'priya@example.com',
        'Company Name': 'Patel Logistics',
        'City': 'Ahmedabad',
        'State': 'Gujarat',
        'Interested Product': 'Cloud Telephony IVR',
        'Lead Source': 'Facebook Ads',
        'Remarks': 'Needs custom pricing quotation',
      },
      {
        'Full Name': 'Vikram Singh',
        'Mobile Number': '9988776655',
        'Email': 'vikram@example.com',
        'Company Name': 'Apex Realty',
        'City': 'Delhi',
        'State': 'Delhi',
        'Interested Product': 'WhatsApp CRM Integration',
        'Lead Source': 'Referral',
        'Remarks': 'High priority lead',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample Leads');
    XLSX.writeFile(workbook, 'smart_crm_sample_leads_template.xlsx');
  };

  // ================= 2. COLUMN MAPPING VALIDATION =================
  const handleProceedToStrategy = () => {
    if (!mapping.name) {
      toast.error('Please map the "Full Name" column');
      return;
    }
    if (!mapping.mobile) {
      toast.error('Please map the "Mobile Number" column');
      return;
    }
    setStep('strategy');
  };

  // Preview 5 sample rows mapped
  const previewRows = useMemo(() => {
    return rawData.slice(0, 5).map((row) => ({
      name: mapping.name ? row[mapping.name] : '—',
      mobile: mapping.mobile ? row[mapping.mobile] : '—',
      email: mapping.email ? row[mapping.email] : '—',
      company: mapping.company ? row[mapping.company] : '—',
      city: mapping.city ? row[mapping.city] : '—',
      state: mapping.state ? row[mapping.state] : '—',
      product: mapping.interestedProduct ? row[mapping.interestedProduct] : '—',
    }));
  }, [rawData, mapping]);

  // ================= 3. EXECUTE CHUNKED BULK IMPORT =================
  const handleStartImport = async () => {
    if (assignmentStrategy === 'round-robin' && selectedCallerIds.length === 0) {
      toast.error('Please select at least one telecaller for Round-Robin assignment');
      return;
    }
    if (assignmentStrategy === 'direct' && !directCallerId) {
      toast.error('Please select a telecaller to assign leads to');
      return;
    }

    setStep('importing');
    cancelRef.current = false;
    setIsCancelling(false);

    // Transform raw rows into normalized lead payloads
    const normalizedList = rawData.map((row) => ({
      name: mapping.name ? row[mapping.name] : '',
      mobile: mapping.mobile ? row[mapping.mobile] : '',
      email: mapping.email ? row[mapping.email] : '',
      company: mapping.company ? row[mapping.company] : '',
      city: mapping.city ? row[mapping.city] : '',
      state: mapping.state ? row[mapping.state] : '',
      interestedProduct: mapping.interestedProduct ? row[mapping.interestedProduct] : '',
      leadSource: mapping.leadSource ? row[mapping.leadSource] : '',
      remarks: mapping.remarks ? row[mapping.remarks] : '',
    }));

    const totalRows = normalizedList.length;
    const totalChunks = Math.ceil(totalRows / CHUNK_SIZE);

    let totalImported = 0;
    let totalDuplicates = 0;
    let totalInvalid = 0;
    let combinedBreakdown = {};
    let runningOffset = 0;

    setProgress({
      currentChunk: 0,
      totalChunks,
      processedCount: 0,
      totalRows,
      importedCount: 0,
      duplicatesSkipped: 0,
      invalidCount: 0,
      callerBreakdown: {},
    });

    for (let c = 0; c < totalChunks; c++) {
      if (cancelRef.current) {
        toast('Import paused / stopped by user', { icon: '🛑' });
        break;
      }

      const chunk = normalizedList.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);

      try {
        const res = await bulkImportLeads({
          batch: chunk,
          assignmentStrategy,
          telecallerIds:
            assignmentStrategy === 'round-robin'
              ? selectedCallerIds
              : assignmentStrategy === 'direct'
              ? [directCallerId]
              : [],
          skipDuplicates,
          batchName: batchName.trim(),
          roundRobinOffset: runningOffset,
        });

        if (res.success) {
          totalImported += res.imported || 0;
          totalDuplicates += res.duplicatesSkipped || 0;
          totalInvalid += res.invalidCount || 0;
          runningOffset += res.imported || 0;

          // Merge caller breakdowns
          if (res.callerBreakdown) {
            Object.entries(res.callerBreakdown).forEach(([k, v]) => {
              combinedBreakdown[k] = (combinedBreakdown[k] || 0) + v;
            });
          }

          setProgress({
            currentChunk: c + 1,
            totalChunks,
            processedCount: Math.min((c + 1) * CHUNK_SIZE, totalRows),
            totalRows,
            importedCount: totalImported,
            duplicatesSkipped: totalDuplicates,
            invalidCount: totalInvalid,
            callerBreakdown: { ...combinedBreakdown },
          });
        }
      } catch (err) {
        toast.error(`Chunk ${c + 1} encountered an error: ${err.response?.data?.message || err.message}`);
      }

      // Small tick delay keeps browser UI buttery smooth and responsive
      await new Promise((r) => setTimeout(r, 40));
    }

    setStep('complete');
    if (onImportSuccess) onImportSuccess();
  };

  const handleCancelImport = () => {
    cancelRef.current = true;
    setIsCancelling(true);
  };

  const percentComplete =
    progress.totalRows > 0 ? Math.round((progress.processedCount / progress.totalRows) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-900 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between bg-dark-50/50 dark:bg-dark-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-dark-900 dark:text-white flex items-center gap-2">
                Excel / CSV Lead Importer & Assigner
              </h2>
              <p className="text-xs text-dark-500 dark:text-dark-400">
                Bulk ingest thousands of leads, deduplicate & distribute across telecallers
              </p>
            </div>
          </div>
          {step !== 'importing' && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-dark-400 hover:text-dark-700 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
            >
              <X size={19} />
            </button>
          )}
        </div>

        {/* Wizard Stepper Tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 flex items-center justify-between text-xs font-semibold overflow-x-auto">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              step === 'upload' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'text-dark-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">1</span>
            <span>Upload File</span>
          </div>
          <ArrowRight size={14} className="text-dark-300" />
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              step === 'mapping' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'text-dark-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
            <span>Map Columns</span>
          </div>
          <ArrowRight size={14} className="text-dark-300" />
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              step === 'strategy' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'text-dark-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
            <span>Assign Callers</span>
          </div>
          <ArrowRight size={14} className="text-dark-300" />
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              step === 'importing' || step === 'complete' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'text-dark-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">4</span>
            <span>Process & Done</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* ================= STEP 1: UPLOAD ================= */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                  isDragOver
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20'
                    : 'border-dark-200 dark:border-dark-700 hover:border-emerald-400 bg-dark-50/40 dark:bg-dark-800/40'
                }`}
                onClick={() => document.getElementById('excel-file-input').click()}
              >
                <input
                  id="excel-file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => handleFileProcess(e.target.files[0])}
                />
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <UploadCloud size={30} />
                </div>
                <h3 className="font-bold text-dark-900 dark:text-white text-base">
                  Choose or Drop your Excel / CSV File
                </h3>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1 max-w-md mx-auto">
                  Supports .xlsx, .xls, and .csv files. Handles 5,000 to 500,000+ rows smoothly via chunked background streaming.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs">
                  <span>Browse File</span>
                </div>
              </div>

              {/* Sample Template & Help Box */}
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <Info size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-blue-900 dark:text-blue-200">Need a template to test?</span>
                    <p className="text-blue-700 dark:text-blue-300 mt-0.5">
                      Download our ready-made Excel template with standard columns (Name, Mobile, City, Product).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-dark-800 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 font-semibold hover:bg-blue-50 shrink-0"
                >
                  <Download size={13} />
                  <span>Download Template (.xlsx)</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: COLUMN MAPPING ================= */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-dark-900 dark:text-white">
                    Map Columns from {file?.name}
                  </h3>
                  <p className="text-xs text-dark-500 dark:text-dark-400">
                    Detected {rawData.length.toLocaleString()} total rows and {rawHeaders.length} columns.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="text-xs text-dark-500 hover:text-dark-700 flex items-center gap-1"
                >
                  <ArrowLeft size={13} /> Change File
                </button>
              </div>

              {/* Mapping Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl bg-dark-50/70 dark:bg-dark-800/40 border border-dark-200 dark:border-dark-700">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 flex items-center gap-1.5">
                    <User size={13} className="text-emerald-600" />
                    <span>Customer Name <strong className="text-red-500">*</strong></span>
                  </label>
                  <select
                    value={mapping.name}
                    onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                  >
                    <option value="">Select column...</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Mobile */}
                <div>
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 flex items-center gap-1.5">
                    <Phone size={13} className="text-emerald-600" />
                    <span>Mobile Number <strong className="text-red-500">*</strong></span>
                  </label>
                  <select
                    value={mapping.mobile}
                    onChange={(e) => setMapping({ ...mapping, mobile: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                  >
                    <option value="">Select column...</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 flex items-center gap-1.5">
                    <span>Email Address</span>
                  </label>
                  <select
                    value={mapping.email}
                    onChange={(e) => setMapping({ ...mapping, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                  >
                    <option value="">(None / Skip)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Company */}
                <div>
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 flex items-center gap-1.5">
                    <Building size={13} />
                    <span>Company / Business</span>
                  </label>
                  <select
                    value={mapping.company}
                    onChange={(e) => setMapping({ ...mapping, company: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                  >
                    <option value="">(None / Skip)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 flex items-center gap-1.5">
                    <MapPin size={13} />
                    <span>City</span>
                  </label>
                  <select
                    value={mapping.city}
                    onChange={(e) => setMapping({ ...mapping, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                  >
                    <option value="">(None / Skip)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 flex items-center gap-1.5">
                    <span>State / Region</span>
                  </label>
                  <select
                    value={mapping.state}
                    onChange={(e) => setMapping({ ...mapping, state: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                  >
                    <option value="">(None / Skip)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Product */}
                <div>
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 flex items-center gap-1.5">
                    <Tag size={13} />
                    <span>Interested Product</span>
                  </label>
                  <select
                    value={mapping.interestedProduct}
                    onChange={(e) => setMapping({ ...mapping, interestedProduct: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                  >
                    <option value="">(None / Skip)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Lead Source */}
                <div>
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 flex items-center gap-1.5">
                    <span>Lead Source</span>
                  </label>
                  <select
                    value={mapping.leadSource}
                    onChange={(e) => setMapping({ ...mapping, leadSource: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                  >
                    <option value="">(None / Default: Other)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Preview Table */}
              <div>
                <h4 className="text-xs font-bold text-dark-600 dark:text-dark-400 uppercase tracking-wider mb-2">
                  Sample Data Preview (First 5 Rows)
                </h4>
                <div className="overflow-x-auto border border-dark-200 dark:border-dark-700 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-dark-100/60 dark:bg-dark-800 text-dark-600 dark:text-dark-400 font-semibold border-b border-dark-200 dark:border-dark-700">
                      <tr>
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Mobile</th>
                        <th className="p-2.5">Email</th>
                        <th className="p-2.5">Company</th>
                        <th className="p-2.5">City</th>
                        <th className="p-2.5">Product</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                      {previewRows.map((r, i) => (
                        <tr key={i} className="hover:bg-dark-50 dark:hover:bg-dark-800/50">
                          <td className="p-2.5 font-medium text-dark-900 dark:text-white">{r.name}</td>
                          <td className="p-2.5 font-mono text-dark-700 dark:text-dark-300">{r.mobile}</td>
                          <td className="p-2.5 text-dark-600 dark:text-dark-400">{r.email}</td>
                          <td className="p-2.5 text-dark-600 dark:text-dark-400">{r.company}</td>
                          <td className="p-2.5 text-dark-600 dark:text-dark-400">{r.city}</td>
                          <td className="p-2.5 text-dark-600 dark:text-dark-400">{r.product}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={handleProceedToStrategy}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <span>Continue to Caller Assignment</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: ASSIGNMENT STRATEGY ================= */}
          {step === 'strategy' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-dark-900 dark:text-white">
                  Lead Assignment & Distribution Strategy
                </h3>
                <p className="text-xs text-dark-500 dark:text-dark-400">
                  Select how {rawData.length.toLocaleString()} leads should be assigned among telecallers.
                </p>
              </div>

              {/* Batch Name Input */}
              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Batch Campaign Name (Optional)
                </label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="e.g. Facebook Campaign - Oct 2026"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                />
              </div>

              {/* Strategy Selector Radio Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Round-Robin */}
                <div
                  onClick={() => setAssignmentStrategy('round-robin')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    assignmentStrategy === 'round-robin'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-xs ring-1 ring-emerald-500'
                      : 'border-dark-200 dark:border-dark-700 hover:border-dark-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <RefreshCw size={15} className="text-emerald-600" />
                    <span className="font-bold text-xs">Round-Robin</span>
                  </div>
                  <p className="text-[11px] text-dark-500 dark:text-dark-400">
                    Evenly distributes leads one-by-one across all selected active telecallers.
                  </p>
                </div>

                {/* 2. Direct Assign */}
                <div
                  onClick={() => setAssignmentStrategy('direct')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    assignmentStrategy === 'direct'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-xs ring-1 ring-emerald-500'
                      : 'border-dark-200 dark:border-dark-700 hover:border-dark-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <User size={15} className="text-emerald-600" />
                    <span className="font-bold text-xs">Direct Single Caller</span>
                  </div>
                  <p className="text-[11px] text-dark-500 dark:text-dark-400">
                    Assigns the entire batch exclusively to one chosen telecaller.
                  </p>
                </div>

                {/* 3. Unassigned Pool */}
                <div
                  onClick={() => setAssignmentStrategy('unassigned')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    assignmentStrategy === 'unassigned'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-xs ring-1 ring-emerald-500'
                      : 'border-dark-200 dark:border-dark-700 hover:border-dark-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Layers size={15} className="text-emerald-600" />
                    <span className="font-bold text-xs">Unassigned Pool</span>
                  </div>
                  <p className="text-[11px] text-dark-500 dark:text-dark-400">
                    Imports leads as unassigned for callers to claim later or manual dispatch.
                  </p>
                </div>
              </div>

              {/* Telecaller Selection for Round-Robin */}
              {assignmentStrategy === 'round-robin' && (
                <div className="p-3.5 rounded-xl bg-dark-50/60 dark:bg-dark-800/40 border border-dark-200 dark:border-dark-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-dark-700 dark:text-dark-300">
                      Participating Telecallers ({selectedCallerIds.length} of {activeTelecallers.length} selected)
                    </label>
                    <button
                      type="button"
                      onClick={() => setSelectedCallerIds(activeTelecallers.map((u) => u._id))}
                      className="text-[11px] text-emerald-600 font-semibold hover:underline"
                    >
                      Select All
                    </button>
                  </div>

                  {activeTelecallers.length === 0 ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      No approved active telecallers found in system. Leads will be imported as Unassigned.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {activeTelecallers.map((caller) => {
                        const isChecked = selectedCallerIds.includes(caller._id);
                        return (
                          <label
                            key={caller._id}
                            className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer ${
                              isChecked
                                ? 'border-emerald-300 bg-white dark:bg-dark-800 text-dark-900 dark:text-white'
                                : 'border-dark-200 dark:border-dark-700 text-dark-500'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedCallerIds(selectedCallerIds.filter((id) => id !== caller._id));
                                } else {
                                  setSelectedCallerIds([...selectedCallerIds, caller._id]);
                                }
                              }}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="font-semibold">{caller.name}</span>
                            <span className="text-[10px] text-dark-400 font-mono truncate">({caller.email})</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Single Telecaller Selection for Direct */}
              {assignmentStrategy === 'direct' && (
                <div className="p-3.5 rounded-xl bg-dark-50/60 dark:bg-dark-800/40 border border-dark-200 dark:border-dark-700">
                  <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                    Select Target Telecaller
                  </label>
                  <select
                    value={directCallerId}
                    onChange={(e) => setDirectCallerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                  >
                    {activeTelecallers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Deduplication Switch */}
              <div className="p-3.5 rounded-xl border border-dark-200 dark:border-dark-700 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-dark-900 dark:text-white">
                    Automatic Phone Number Deduplication
                  </h4>
                  <p className="text-[11px] text-dark-500 dark:text-dark-400">
                    Skips records whose 10-digit mobile number already exists in CRM database to avoid duplicate calls.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-dark-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={() => setStep('mapping')}
                  className="px-3.5 py-2 rounded-xl text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800 font-semibold text-xs flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Back to Mapping
                </button>
                <button
                  type="button"
                  onClick={handleStartImport}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
                >
                  <Sparkles size={15} />
                  <span>Start Import ({rawData.length.toLocaleString()} Leads)</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 4: IMPORTING IN PROGRESS ================= */}
          {step === 'importing' && (
            <div className="py-8 space-y-6 text-center max-w-lg mx-auto">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-100 dark:border-emerald-950/60 animate-ping"></div>
                <div className="relative w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center">
                  <RefreshCw size={32} className="animate-spin" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-dark-900 dark:text-white">
                  Ingesting & Distributing Leads...
                </h3>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  Processing batch {progress.currentChunk} of {progress.totalChunks} ({CHUNK_SIZE} rows per batch)
                </p>
              </div>

              {/* Live Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-dark-100 dark:bg-dark-800 rounded-full h-3 overflow-hidden border border-dark-200 dark:border-dark-700">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${percentComplete}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-dark-600 dark:text-dark-400">
                  <span>{progress.processedCount.toLocaleString()} / {progress.totalRows.toLocaleString()} rows processed</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{percentComplete}%</span>
                </div>
              </div>

              {/* Live Counter Stats */}
              <div className="grid grid-cols-3 gap-3 text-left">
                <div className="p-3 rounded-xl bg-dark-50 dark:bg-dark-800/50 border border-dark-200 dark:border-dark-700">
                  <span className="text-[10px] uppercase font-bold text-dark-400">Imported</span>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {progress.importedCount.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-dark-50 dark:bg-dark-800/50 border border-dark-200 dark:border-dark-700">
                  <span className="text-[10px] uppercase font-bold text-dark-400">Duplicates</span>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {progress.duplicatesSkipped.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-dark-50 dark:bg-dark-800/50 border border-dark-200 dark:border-dark-700">
                  <span className="text-[10px] uppercase font-bold text-dark-400">Invalid</span>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    {progress.invalidCount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCancelImport}
                  disabled={isCancelling}
                  className="px-4 py-2 rounded-xl border border-dark-200 dark:border-dark-700 text-xs font-semibold text-dark-600 dark:text-dark-400 hover:bg-dark-50 dark:hover:bg-dark-800 disabled:opacity-50"
                >
                  {isCancelling ? 'Stopping...' : 'Pause / Cancel Remaining'}
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 5: COMPLETED ================= */}
          {step === 'complete' && (
            <div className="py-6 space-y-5 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-dark-900 dark:text-white">
                  Import & Assignment Complete!
                </h3>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  All valid records have been saved into MongoDB and assigned into the caller pipeline.
                </p>
              </div>

              {/* Results Metric Grid */}
              <div className="grid grid-cols-3 gap-3 text-left">
                <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">
                    Successfully Created
                  </span>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {progress.importedCount.toLocaleString()}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
                  <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300">
                    Duplicates Skipped
                  </span>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                    {progress.duplicatesSkipped.toLocaleString()}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700">
                  <span className="text-[10px] uppercase font-bold text-dark-500">
                    Total Processed
                  </span>
                  <p className="text-2xl font-bold text-dark-800 dark:text-white mt-0.5">
                    {progress.processedCount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Assignment Breakdown by Telecaller */}
              {Object.keys(progress.callerBreakdown).length > 0 && (
                <div className="p-4 rounded-xl border border-dark-200 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-800/40 text-left space-y-2">
                  <span className="text-xs font-bold text-dark-700 dark:text-dark-300 flex items-center gap-1.5">
                    <Users size={14} className="text-emerald-600" />
                    <span>Caller Distribution Breakdown</span>
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                    {Object.entries(progress.callerBreakdown).map(([name, count]) => (
                      <div key={name} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white dark:bg-dark-900 border border-dark-100 dark:border-dark-800">
                        <span className="font-semibold text-dark-900 dark:text-white">{name}</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{count.toLocaleString()} leads</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all"
                >
                  Done & View Pipeline
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
