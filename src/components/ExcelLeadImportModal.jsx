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
  SlidersHorizontal,
  Trash2,
  Plus,
  Filter,
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
  const [headerSampleMap, setHeaderSampleMap] = useState({});
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

  // Assignment Strategy: 'rules' (filter-based) | 'round-robin' | 'direct' | 'unassigned'
  const [assignmentStrategy, setAssignmentStrategy] = useState('rules');
  const [activeTelecallers, setActiveTelecallers] = useState([]);
  const [selectedCallerIds, setSelectedCallerIds] = useState([]);
  const [directCallerId, setDirectCallerId] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [batchName, setBatchName] = useState('');

  // Filter-based rules state (assign by city, business, product, etc.)
  const [filterRules, setFilterRules] = useState([
    {
      id: 'rule_1',
      field: 'city', // 'city' | 'company' | 'state' | 'interestedProduct' | 'leadSource'
      operator: 'equals', // 'equals' | 'contains'
      value: '',
      telecallerId: '',
    },
  ]);
  const [fallbackStrategy, setFallbackStrategy] = useState('round-robin'); // 'round-robin' | 'direct' | 'unassigned'
  const [fallbackLeadId, setFallbackLeadId] = useState('');

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
        if (approved.length > 0) {
          setDirectCallerId(approved[0]._id);
          setFallbackLeadId(approved[0]._id);
          setFilterRules((prev) =>
            prev.map((r) => (!r.telecallerId ? { ...r, telecallerId: approved[0]._id } : r))
          );
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Reset modal when reopened
  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setFile(null);
      setRawHeaders([]);
      setHeaderSampleMap({});
      setRawData([]);
      setBatchName('');
      setAssignmentStrategy('rules');
      setFilterRules([
        {
          id: 'rule_1',
          field: 'city',
          operator: 'equals',
          value: '',
          telecallerId: activeTelecallers[0]?._id || '',
        },
      ]);
      setFallbackStrategy('round-robin');
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

  // Unique detected cities from rawData based on mapped city column
  const detectedCities = useMemo(() => {
    if (!mapping.city || !rawData.length) return [];
    const counts = {};
    rawData.forEach((row) => {
      const val = (row[mapping.city] || '').toString().trim();
      if (val) counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [rawData, mapping.city]);

  // Unique detected companies/businesses from rawData
  const detectedCompanies = useMemo(() => {
    if (!mapping.company || !rawData.length) return [];
    const counts = {};
    rawData.forEach((row) => {
      const val = (row[mapping.company] || '').toString().trim();
      if (val) counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [rawData, mapping.company]);

  // Unique detected products from rawData
  const detectedProducts = useMemo(() => {
    if (!mapping.interestedProduct || !rawData.length) return [];
    const counts = {};
    rawData.forEach((row) => {
      const val = (row[mapping.interestedProduct] || '').toString().trim();
      if (val) counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [rawData, mapping.interestedProduct]);

  // Real-time sequential matching calculation across rules
  const ruleMatchCounts = useMemo(() => {
    if (!rawData.length || !filterRules.length) return {};
    const counts = {};
    const claimedRows = new Set();

    filterRules.forEach((rule) => {
      if (!rule.value || !rule.field) {
        counts[rule.id] = 0;
        return;
      }
      const mappedCol = mapping[rule.field];
      if (!mappedCol) {
        counts[rule.id] = 0;
        return;
      }

      const targetVal = rule.value.toLowerCase().trim();
      let matchCount = 0;

      rawData.forEach((row, idx) => {
        if (claimedRows.has(idx)) return;
        const cellVal = (row[mappedCol] || '').toString().toLowerCase().trim();
        const isMatch =
          rule.operator === 'contains'
            ? cellVal.includes(targetVal)
            : cellVal === targetVal;

        if (isMatch) {
          matchCount++;
          claimedRows.add(idx);
        }
      });

      counts[rule.id] = matchCount;
    });

    counts['__totalClaimed'] = claimedRows.size;
    counts['__unmatched'] = Math.max(0, rawData.length - claimedRows.size);
    return counts;
  }, [rawData, filterRules, mapping]);

  // Auto-generate rules from detected cities (allocating across leads)
  const handleAutoGenerateCityRules = () => {
    if (detectedCities.length === 0) {
      toast.error('No cities detected in spreadsheet. Please map the City column first.');
      return;
    }
    if (activeTelecallers.length === 0) {
      toast.error('No active approved leads available in system to assign.');
      return;
    }
    const newRules = detectedCities.slice(0, 10).map((city, idx) => ({
      id: `city_rule_${Date.now()}_${idx}`,
      field: 'city',
      operator: 'equals',
      value: city.name,
      telecallerId: activeTelecallers[idx % activeTelecallers.length]._id,
    }));
    setFilterRules(newRules);
    toast.success(`Generated ${newRules.length} city assignment rules!`);
  };

  // Auto-generate rules from detected businesses
  const handleAutoGenerateCompanyRules = () => {
    if (detectedCompanies.length === 0) {
      toast.error('No companies/businesses detected. Please map the Company column first.');
      return;
    }
    if (activeTelecallers.length === 0) {
      toast.error('No active approved leads available in system to assign.');
      return;
    }
    const newRules = detectedCompanies.slice(0, 10).map((comp, idx) => ({
      id: `comp_rule_${Date.now()}_${idx}`,
      field: 'company',
      operator: 'contains',
      value: comp.name,
      telecallerId: activeTelecallers[idx % activeTelecallers.length]._id,
    }));
    setFilterRules(newRules);
    toast.success(`Generated ${newRules.length} business assignment rules!`);
  };

  const handleAddRule = () => {
    const defaultLeadId = activeTelecallers[0]?._id || '';
    setFilterRules([
      ...filterRules,
      {
        id: `rule_${Date.now()}`,
        field: 'city',
        operator: 'equals',
        value: '',
        telecallerId: defaultLeadId,
      },
    ]);
  };

  const handleDeleteRule = (ruleId) => {
    if (filterRules.length <= 1) {
      setFilterRules([
        {
          id: `rule_${Date.now()}`,
          field: 'city',
          operator: 'equals',
          value: '',
          telecallerId: activeTelecallers[0]?._id || '',
        },
      ]);
      return;
    }
    setFilterRules(filterRules.filter((r) => r.id !== ruleId));
  };

  const handleRuleChange = (ruleId, key, val) => {
    setFilterRules(
      filterRules.map((r) => (r.id === ruleId ? { ...r, [key]: val } : r))
    );
  };

  // ================= 1. FILE PARSING WITH SMART HEADER DETECTION =================
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

        // 1. Scan raw rows (header: 1) to smartly find the row where table headers actually begin
        // This solves sheets that have title banners or empty rows at the top (avoiding __EMPTY_...)
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (!rawRows || rawRows.length === 0) {
          toast.error('The selected spreadsheet appears to be empty');
          return;
        }

        const headerKeywords = [
          'name', 'client', 'customer', 'mobile', 'phone', 'contact', 'number', 'cell',
          'email', 'mail', 'company', 'org', 'firm', 'business', 'city', 'state', 'location',
          'product', 'service', 'package', 'source', 'campaign', 'channel', 'status', 'remark',
          'note', 'comment', 'description', 'call'
        ];

        let headerRowIndex = 0;
        let highestScore = -1;

        for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
          const row = rawRows[r];
          if (!Array.isArray(row)) continue;
          let score = 0;
          let nonBlankCount = 0;
          for (const cell of row) {
            if (cell !== undefined && cell !== null && String(cell).trim() !== '') {
              nonBlankCount++;
              const str = String(cell).toLowerCase().trim();
              if (headerKeywords.some((k) => str.includes(k))) {
                score += 2;
              }
            }
          }
          if (score > highestScore && nonBlankCount >= 2) {
            highestScore = score;
            headerRowIndex = r;
          }
        }

        // Re-parse sheet data starting from the detected header row
        const json = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: '' });

        if (!json || json.length === 0) {
          toast.error('No customer rows found below the header in this spreadsheet');
          return;
        }

        const rawKeys = Object.keys(json[0] || {});
        // Move friendly named headers first, __EMPTY last
        const headers = [
          ...rawKeys.filter((h) => h && !h.startsWith('__EMPTY')),
          ...rawKeys.filter((h) => h && h.startsWith('__EMPTY')),
        ];

        // Extract first non-empty sample preview value for every column
        const sampleMap = {};
        headers.forEach((h) => {
          for (let r = 0; r < Math.min(json.length, 10); r++) {
            const val = json[r]?.[h];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              sampleMap[h] = String(val).trim();
              break;
            }
          }
        });

        setHeaderSampleMap(sampleMap);
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
        'Remarks': 'High priority lead for annual subscription',
      },
      {
        'Full Name': 'Sneha Rao',
        'Mobile Number': '9845012345',
        'Email': 'sneha.rao@techcorp.in',
        'Company Name': 'TechCorp Solutions',
        'City': 'Bangalore',
        'State': 'Karnataka',
        'Interested Product': 'Auto Dialer & Call Recording',
        'Lead Source': 'LinkedIn Campaign',
        'Remarks': 'Looking to automate telecalling team',
      },
      {
        'Full Name': 'Rohit Verma',
        'Mobile Number': '9711223344',
        'Email': 'rohit@vermatraders.com',
        'Company Name': 'Verma Traders',
        'City': 'Jaipur',
        'State': 'Rajasthan',
        'Interested Product': 'CRM Starter Plan',
        'Lead Source': 'Cold Outreach',
        'Remarks': 'Follow up next Monday morning',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample Customers');
    XLSX.writeFile(workbook, 'smart_crm_sample_customers_template.xlsx');
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
      toast.error('Please select at least one lead for Round-Robin assignment');
      return;
    }
    if (assignmentStrategy === 'direct' && !directCallerId) {
      toast.error('Please select a lead to assign customer accounts to');
      return;
    }
    if (assignmentStrategy === 'rules') {
      const activeValidRules = filterRules.filter(
        (r) => r.field && r.value.trim() && r.telecallerId
      );
      if (activeValidRules.length === 0 && fallbackStrategy === 'unassigned') {
        toast.error('Please specify at least one filter rule (e.g. City or Business) or configure fallback lead');
        return;
      }
    }

    setStep('importing');
    cancelRef.current = false;
    setIsCancelling(false);

    const callerMap = new Map(activeTelecallers.map((c) => [c._id, c]));

    // Pre-evaluate rules and fallback so each row has its assigned lead
    let unmatchedCounter = 0;
    const normalizedList = rawData.map((row, rowIdx) => {
      const name = mapping.name ? row[mapping.name] : '';
      const mobile = mapping.mobile ? row[mapping.mobile] : '';
      const email = mapping.email ? row[mapping.email] : '';
      const company = mapping.company ? row[mapping.company] : '';
      const city = mapping.city ? row[mapping.city] : '';
      const state = mapping.state ? row[mapping.state] : '';
      const interestedProduct = mapping.interestedProduct ? row[mapping.interestedProduct] : '';
      const leadSource = mapping.leadSource ? row[mapping.leadSource] : '';
      const remarks = mapping.remarks ? row[mapping.remarks] : '';

      const custPayload = {
        name,
        mobile,
        email,
        company,
        city,
        state,
        interestedProduct,
        leadSource,
        remarks,
        telecallerId: null,
        assignedTelecaller: 'Unassigned',
      };

      let assigned = null;

      if (assignmentStrategy === 'rules') {
        for (const rule of filterRules) {
          if (!rule.field || !rule.value.trim() || !rule.telecallerId) continue;
          const mappedCol = mapping[rule.field];
          const rawVal = (mappedCol ? row[mappedCol] : custPayload[rule.field] || '')
            .toString()
            .toLowerCase()
            .trim();
          const targetVal = rule.value.toLowerCase().trim();
          const isMatch =
            rule.operator === 'contains'
              ? rawVal.includes(targetVal)
              : rawVal === targetVal;

          if (isMatch) {
            assigned = callerMap.get(rule.telecallerId);
            break;
          }
        }

        // Apply fallback if no filter rule matched
        if (!assigned) {
          if (fallbackStrategy === 'direct' && fallbackLeadId) {
            assigned = callerMap.get(fallbackLeadId);
          } else if (fallbackStrategy === 'round-robin' && selectedCallerIds.length > 0) {
            const idx = (unmatchedCounter) % selectedCallerIds.length;
            assigned = callerMap.get(selectedCallerIds[idx]);
            unmatchedCounter++;
          }
        }
      } else if (assignmentStrategy === 'round-robin' && selectedCallerIds.length > 0) {
        const idx = (rowIdx) % selectedCallerIds.length;
        assigned = callerMap.get(selectedCallerIds[idx]);
      } else if (assignmentStrategy === 'direct' && directCallerId) {
        assigned = callerMap.get(directCallerId);
      }

      if (assigned) {
        custPayload.telecallerId = assigned._id;
        custPayload.assignedTelecaller = assigned.name;
      }

      return custPayload;
    });

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
        toast('Import paused / stopped by user');
        break;
      }

      const chunk = normalizedList.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);

      try {
        const res = await bulkImportLeads({
          batch: chunk,
          assignmentStrategy,
          filterRules,
          fallbackStrategy,
          fallbackLeadId,
          telecallerIds:
            assignmentStrategy === 'round-robin' || fallbackStrategy === 'round-robin'
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-900 rounded-2xl border border-dark-200 dark:border-dark-700 shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between bg-dark-50/50 dark:bg-dark-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-dark-900 dark:text-white flex items-center gap-2">
                Excel / CSV Customer Importer & Smart Lead Assignment
              </h2>
              <p className="text-xs text-dark-500 dark:text-dark-400">
                Bulk ingest customer accounts, deduplicate & smartly assign to leads by City, Business, or Strategy
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
            <span>Smart Lead Assignment</span>
          </div>
          <ArrowRight size={14} className="text-dark-300" />
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              step === 'importing' || step === 'complete' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'text-dark-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">4</span>
            <span>Import & Distribute</span>
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

              {/* Required Details Guidance Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-blue-50/80 dark:from-emerald-950/40 dark:via-dark-800 dark:to-blue-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-2.5 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200">
                    <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>What customer details should be in your Excel file?</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors shrink-0"
                  >
                    <Download size={13} />
                    <span>Download Sample Excel Template (.xlsx)</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-dark-700 dark:text-dark-300">
                  <div className="p-2 rounded-xl bg-white/80 dark:bg-dark-800/80 border border-emerald-200/60 dark:border-emerald-900/60">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Mandatory / Required Columns:
                    </span>
                    <ul className="mt-1 space-y-0.5 list-disc list-inside text-[11px] text-dark-600 dark:text-dark-400">
                      <li><strong>Customer Name</strong> (e.g. Aarav Sharma)</li>
                      <li><strong>Mobile Number</strong> (10-digit number for calling & deduplication)</li>
                    </ul>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 dark:bg-dark-800/80 border border-blue-200/60 dark:border-blue-900/60">
                    <span className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                      <Info size={13} /> Optional (Recommended) Columns:
                    </span>
                    <ul className="mt-1 space-y-0.5 list-disc list-inside text-[11px] text-dark-600 dark:text-dark-400">
                      <li>Email, Company Name, City, State</li>
                      <li>Interested Product, Lead Source, Remarks / Notes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: COLUMN MAPPING ================= */}
          {step === 'mapping' && (() => {
            const renderHeaderOptions = (includeSkip = false, skipLabel = '(None / Skip)') => (
              <>
                {includeSkip && <option value="">{skipLabel}</option>}
                {!includeSkip && <option value="">Select column...</option>}
                {rawHeaders.map((h) => {
                  const sample = headerSampleMap[h];
                  const isUnlabeled = h.startsWith('__EMPTY');
                  const displayLabel = isUnlabeled ? `Column (Unlabeled)` : h;
                  const preview = sample ? ` (e.g. "${sample.length > 20 ? sample.slice(0, 20) + '...' : sample}")` : '';
                  return (
                    <option key={h} value={h}>
                      {displayLabel}{preview}
                    </option>
                  );
                })}
              </>
            );

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-dark-900 dark:text-white">
                      Map Columns from {file?.name}
                    </h3>
                    <p className="text-xs text-dark-500 dark:text-dark-400">
                      Detected {rawData.length.toLocaleString()} total rows and {rawHeaders.length} columns.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 border border-emerald-200 dark:border-emerald-800 rounded-lg px-2 py-1"
                    >
                      <Download size={12} /> Template
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep('upload')}
                      className="text-xs text-dark-500 hover:text-dark-700 flex items-center gap-1"
                    >
                      <ArrowLeft size={13} /> Change File
                    </button>
                  </div>
                </div>

                {/* Clear Instruction Banner */}
                <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Info size={15} className="text-blue-600 shrink-0" />
                    <span>
                      <strong>Required:</strong> Please select which spreadsheet column contains the <strong>Customer Name</strong> and <strong>Mobile Number</strong>. All other fields are optional.
                    </span>
                  </div>
                </div>

                {/* Mapping Form Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl bg-dark-50/70 dark:bg-dark-800/40 border border-dark-200 dark:border-dark-700">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 flex items-center gap-1.5">
                      <User size={13} className="text-emerald-600" />
                      <span>Customer Name <strong className="text-red-500">* (Required)</strong></span>
                    </label>
                    <select
                      value={mapping.name}
                      onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                    >
                      {renderHeaderOptions(false)}
                    </select>
                  </div>

                  {/* Mobile */}
                  <div>
                    <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 flex items-center gap-1.5">
                      <Phone size={13} className="text-emerald-600" />
                      <span>Mobile Number <strong className="text-red-500">* (Required)</strong></span>
                    </label>
                    <select
                      value={mapping.mobile}
                      onChange={(e) => setMapping({ ...mapping, mobile: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                    >
                      {renderHeaderOptions(false)}
                    </select>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 flex items-center gap-1.5">
                      <Mail size={13} className="text-dark-400" />
                      <span>Email Address (Optional)</span>
                    </label>
                    <select
                      value={mapping.email}
                      onChange={(e) => setMapping({ ...mapping, email: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                    >
                      {renderHeaderOptions(true, '(None / Skip)')}
                    </select>
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 flex items-center gap-1.5">
                      <Building size={13} className="text-dark-400" />
                      <span>Company / Business (Optional)</span>
                    </label>
                    <select
                      value={mapping.company}
                      onChange={(e) => setMapping({ ...mapping, company: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                    >
                      {renderHeaderOptions(true, '(None / Skip)')}
                    </select>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 flex items-center gap-1.5">
                      <MapPin size={13} className="text-dark-400" />
                      <span>City (Optional)</span>
                    </label>
                    <select
                      value={mapping.city}
                      onChange={(e) => setMapping({ ...mapping, city: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                    >
                      {renderHeaderOptions(true, '(None / Skip)')}
                    </select>
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 flex items-center gap-1.5">
                      <MapPin size={13} className="text-dark-400" />
                      <span>State / Region (Optional)</span>
                    </label>
                    <select
                      value={mapping.state}
                      onChange={(e) => setMapping({ ...mapping, state: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                    >
                      {renderHeaderOptions(true, '(None / Skip)')}
                    </select>
                  </div>

                  {/* Product */}
                  <div>
                    <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 flex items-center gap-1.5">
                      <Tag size={13} className="text-dark-400" />
                      <span>Interested Product (Optional)</span>
                    </label>
                    <select
                      value={mapping.interestedProduct}
                      onChange={(e) => setMapping({ ...mapping, interestedProduct: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                    >
                      {renderHeaderOptions(true, '(None / Skip)')}
                    </select>
                  </div>

                  {/* Lead Source */}
                  <div>
                    <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-dark-400" />
                      <span>Lead Source (Optional)</span>
                    </label>
                    <select
                      value={mapping.leadSource}
                      onChange={(e) => setMapping({ ...mapping, leadSource: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                    >
                      {renderHeaderOptions(true, '(None / Default: Other)')}
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
                  <span>Continue to Lead Assignment</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })()}

          {/* ================= STEP 3: ASSIGNMENT STRATEGY ================= */}
          {step === 'strategy' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-dark-900 dark:text-white">
                  Lead Assignment & Distribution Strategy
                </h3>
                <p className="text-xs text-dark-500 dark:text-dark-400">
                  Select how {rawData.length.toLocaleString()} contacts should be assigned among leads.
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Smart Filter Rules (Recommended) */}
                <div
                  onClick={() => setAssignmentStrategy('rules')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all relative ${
                    assignmentStrategy === 'rules'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-xs ring-1 ring-emerald-500'
                      : 'border-dark-200 dark:border-dark-700 hover:border-dark-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <SlidersHorizontal size={15} className="text-emerald-600" />
                      <span className="font-bold text-xs">Smart Filter Rules</span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-600 text-white uppercase tracking-wider">
                      Best
                    </span>
                  </div>
                  <p className="text-[11px] text-dark-500 dark:text-dark-400">
                    Assign leads dynamically by City, Business/Company, State, or Product filters.
                  </p>
                </div>

                {/* 2. Round-Robin */}
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
                    Evenly distributes contacts one-by-one across all selected active leads.
                  </p>
                </div>

                {/* 3. Direct Assign */}
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
                    <span className="font-bold text-xs">Direct Single Lead</span>
                  </div>
                  <p className="text-[11px] text-dark-500 dark:text-dark-400">
                    Assigns the entire batch exclusively to one chosen lead.
                  </p>
                </div>

                {/* 4. Unassigned Pool */}
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
                    Imports contacts into unassigned queue for leads to claim later.
                  </p>
                </div>
              </div>

              {/* Strategy 1: SMART FILTER-BASED RULES BUILDER */}
              {assignmentStrategy === 'rules' && (
                <div className="p-4 rounded-xl bg-dark-50/70 dark:bg-dark-800/40 border border-dark-200 dark:border-dark-700 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dark-200/80 dark:border-dark-700/80 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-dark-900 dark:text-white flex items-center gap-2">
                        <Filter size={14} className="text-emerald-600" />
                        <span>Filter-Based Lead Assignment Rules</span>
                      </h4>
                      <p className="text-[11px] text-dark-500 dark:text-dark-400">
                        Assign leads dynamically based on customer City, Business/Company, State, or Product.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {detectedCities.length > 0 && (
                        <button
                          type="button"
                          onClick={handleAutoGenerateCityRules}
                          className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Auto-generates rules for detected cities"
                        >
                          <Sparkles size={11} />
                          <span>Auto City Rules ({detectedCities.length})</span>
                        </button>
                      )}
                      {detectedCompanies.length > 0 && (
                        <button
                          type="button"
                          onClick={handleAutoGenerateCompanyRules}
                          className="px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/80 dark:hover:bg-blue-900 text-blue-800 dark:text-blue-300 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Auto-generates rules for detected businesses/companies"
                        >
                          <Building size={11} />
                          <span>Auto Business Rules ({detectedCompanies.length})</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rules List */}
                  <div className="space-y-2.5">
                    {filterRules.map((rule, idx) => {
                      const matchCount = ruleMatchCounts[rule.id] || 0;
                      const matchPct = rawData.length > 0 ? Math.round((matchCount / rawData.length) * 100) : 0;
                      const currentFieldValues =
                        rule.field === 'city'
                          ? detectedCities
                          : rule.field === 'company'
                          ? detectedCompanies
                          : rule.field === 'interestedProduct'
                          ? detectedProducts
                          : [];

                      return (
                        <div
                          key={rule.id}
                          className="p-3 rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 shadow-2xs space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                              {idx + 1}
                            </span>

                            <div className="flex items-center gap-2">
                              {rule.value && (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    matchCount > 0
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-dark-100 dark:bg-dark-700 text-dark-500'
                                  }`}
                                >
                                  {matchCount > 0
                                    ? `✓ Matches ${matchCount.toLocaleString()} customers (${matchPct}%)`
                                    : '0 matches'}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteRule(rule.id)}
                                className="p-1 rounded-lg text-dark-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Delete rule"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                            {/* Filter Field */}
                            <div>
                              <label className="block text-[10px] font-semibold text-dark-500 uppercase mb-0.5">
                                Filter By Field
                              </label>
                              <select
                                value={rule.field}
                                onChange={(e) => handleRuleChange(rule.id, 'field', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 text-dark-900 dark:text-white text-xs font-medium"
                              >
                                <option value="city">City (Location)</option>
                                <option value="company">Business / Company</option>
                                <option value="state">State / Region</option>
                                <option value="interestedProduct">Interested Product</option>
                                <option value="leadSource">Lead Source</option>
                              </select>
                            </div>

                            {/* Operator */}
                            <div>
                              <label className="block text-[10px] font-semibold text-dark-500 uppercase mb-0.5">
                                Condition
                              </label>
                              <select
                                value={rule.operator}
                                onChange={(e) => handleRuleChange(rule.id, 'operator', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 text-dark-900 dark:text-white text-xs font-medium"
                              >
                                <option value="equals">Equals (Exact)</option>
                                <option value="contains">Contains (Partial)</option>
                              </select>
                            </div>

                            {/* Value with datalist */}
                            <div>
                              <label className="block text-[10px] font-semibold text-dark-500 uppercase mb-0.5">
                                Filter Value
                              </label>
                              <input
                                type="text"
                                list={`datalist_${rule.id}`}
                                value={rule.value}
                                onChange={(e) => handleRuleChange(rule.id, 'value', e.target.value)}
                                placeholder={rule.field === 'city' ? 'e.g. Jaipur' : 'e.g. Real Estate'}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 text-dark-900 dark:text-white text-xs"
                              />
                              <datalist id={`datalist_${rule.id}`}>
                                {currentFieldValues.map((item) => (
                                  <option key={item.name} value={item.name}>
                                    {item.name} ({item.count} rows)
                                  </option>
                                ))}
                              </datalist>
                            </div>

                            {/* Assign To Lead */}
                            <div>
                              <label className="block text-[10px] font-semibold text-dark-500 uppercase mb-0.5">
                                Assign To Lead
                              </label>
                              <select
                                value={rule.telecallerId}
                                onChange={(e) => handleRuleChange(rule.id, 'telecallerId', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/30 text-dark-900 dark:text-white text-xs font-semibold"
                              >
                                <option value="">Select Target Lead...</option>
                                {activeTelecallers.map((tc) => (
                                  <option key={tc._id} value={tc._id}>
                                    {tc.name} {tc.isOnline ? '🟢' : ''} ({tc.email})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleAddRule}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-dark-300 dark:border-dark-600 hover:border-emerald-500 hover:text-emerald-600 text-dark-600 dark:text-dark-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Add Another Filter Rule</span>
                      </button>

                      <span className="text-[11px] text-dark-500">
                        Customers covered by filters:{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {(ruleMatchCounts['__totalClaimed'] || 0).toLocaleString()} of {rawData.length.toLocaleString()}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Fallback Assignment for Unmatched Customers */}
                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          Fallback for {(ruleMatchCounts['__unmatched'] || 0).toLocaleString()} Unmatched Customers
                        </span>
                      </div>
                      <span className="text-[11px] text-amber-700 dark:text-amber-400">
                        For records not matching any filter above
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                      <label
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                          fallbackStrategy === 'round-robin'
                            ? 'border-amber-400 bg-white dark:bg-dark-800 font-bold text-dark-900 dark:text-white'
                            : 'border-amber-200/60 text-dark-600 dark:text-dark-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="fallbackStrategy"
                          checked={fallbackStrategy === 'round-robin'}
                          onChange={() => setFallbackStrategy('round-robin')}
                          className="text-amber-600"
                        />
                        <span>Round-Robin across leads</span>
                      </label>

                      <label
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                          fallbackStrategy === 'direct'
                            ? 'border-amber-400 bg-white dark:bg-dark-800 font-bold text-dark-900 dark:text-white'
                            : 'border-amber-200/60 text-dark-600 dark:text-dark-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="fallbackStrategy"
                          checked={fallbackStrategy === 'direct'}
                          onChange={() => setFallbackStrategy('direct')}
                          className="text-amber-600"
                        />
                        <span>Assign to specific lead</span>
                      </label>

                      <label
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                          fallbackStrategy === 'unassigned'
                            ? 'border-amber-400 bg-white dark:bg-dark-800 font-bold text-dark-900 dark:text-white'
                            : 'border-amber-200/60 text-dark-600 dark:text-dark-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="fallbackStrategy"
                          checked={fallbackStrategy === 'unassigned'}
                          onChange={() => setFallbackStrategy('unassigned')}
                          className="text-amber-600"
                        />
                        <span>Unassigned Pool</span>
                      </label>
                    </div>

                    {fallbackStrategy === 'direct' && (
                      <div className="pt-1.5">
                        <select
                          value={fallbackLeadId}
                          onChange={(e) => setFallbackLeadId(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-dark-800 text-dark-900 dark:text-white text-xs font-semibold"
                        >
                          {activeTelecallers.map((tc) => (
                            <option key={tc._id} value={tc._id}>
                              {tc.name} ({tc.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Telecaller Selection for Round-Robin */}
              {assignmentStrategy === 'round-robin' && (
                <div className="p-3.5 rounded-xl bg-dark-50/60 dark:bg-dark-800/40 border border-dark-200 dark:border-dark-700 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <label className="text-xs font-semibold text-dark-700 dark:text-dark-300">
                        Participating Leads ({selectedCallerIds.length} of {activeTelecallers.length} selected)
                      </label>
                      {selectedCallerIds.length > 0 && rawData.length > 0 && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Each lead will receive approx. ~{Math.ceil(rawData.length / selectedCallerIds.length)} contacts
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setSelectedCallerIds(activeTelecallers.map((u) => u._id))}
                        className="text-emerald-600 hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-dark-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCallerIds([])}
                        className="text-dark-500 hover:underline"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {activeTelecallers.length === 0 ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      No approved active leads found in system. Contacts will be imported as Unassigned.
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
                    Select Target Lead
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
                  className="px-3.5 py-2 rounded-xl text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back to Mapping
                </button>
                <button
                  type="button"
                  onClick={handleStartImport}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Sparkles size={15} />
                  <span>Start Import ({rawData.length.toLocaleString()} Customers)</span>
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
                  Ingesting & Distributing Customer Accounts...
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
                  className="px-4 py-2 rounded-xl border border-dark-200 dark:border-dark-700 text-xs font-semibold text-dark-600 dark:text-dark-400 hover:bg-dark-50 dark:hover:bg-dark-800 disabled:opacity-50 cursor-pointer"
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
                  Customer Import & Lead Assignment Complete!
                </h3>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  All valid customer records have been saved into MongoDB and assigned into the lead pipeline.
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
                    <span>Lead Distribution Breakdown</span>
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                    {Object.entries(progress.callerBreakdown).map(([name, count]) => (
                      <div key={name} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white dark:bg-dark-900 border border-dark-100 dark:border-dark-800">
                        <span className="font-semibold text-dark-900 dark:text-white">{name}</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{count.toLocaleString()} customers</span>
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
