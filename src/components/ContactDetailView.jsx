import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Pencil,
  Phone,
  PhoneCall,
  MessageCircle,
  FileText,
  ChevronDown,
  Trash2,
  Check,
  CheckCircle2,
  Plus,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sparkles,
  Clock,
  ArrowUpRight,
  SlidersHorizontal,
  X,
  Calendar,
  Send,
  User,
} from 'lucide-react';
import { audioEngine } from '../utils/audioPlayer';
import CallRecordingModal from './CallRecordingModal';
import TeamCallHistoryTable from './TeamCallHistoryTable';
import { useToast } from './Toast';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import { getFollowUps, createFollowUp, updateFollowUp, deleteFollowUp } from '../api/followups';
import { getNotes, createNote, deleteNote } from '../api/notes';
import { getCalls, createCall, deleteCall } from '../api/callHistory';
import { updateCustomer, deleteCustomer } from '../api/customers';

export default function ContactDetailView({
  contact,
  onBack,
  onNavigate,
  onStartCall,
  onUpdateContact,
  onDeleteContact,
}) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // Contact Details State
  const [activeSubTab, setActiveSubTab] = useState('contact'); // 'contact' | 'call-history'
  const [tag, setTag] = useState(contact?.tag || contact?.tags || 'call');
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [leadOwner, setLeadOwner] = useState(contact?.assignedTelecaller || user?.name || 'Admin');
  const [leadStage, setLeadStage] = useState(contact?.leadStage || contact?.status || 'Select Follow-up Status');

  // Audio Playback in Recent Calls
  const [playingCallId, setPlayingCallId] = useState(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Call Recording / AI Summary Modal
  const [selectedCallForModal, setSelectedCallForModal] = useState(null);
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);

  // Modals state
  const [isAddFollowUpOpen, setIsAddFollowUpOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  const contactName = contact?.name || 'Contact';
  const rawContactPhone = contact?.phone
    ? contact.phone.replace(/[^0-9]/g, '')
    : '';
  const contactPhone = rawContactPhone ? rawContactPhone.slice(-10) : '';
  const contactStorageKey = contact?.id || contactPhone || 'default';

  // Notes state
  const [contactNotes, setContactNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');

  // Follow-up form state
  const [followUpForm, setFollowUpForm] = useState({
    type: 'REMINDER',
    note: '',
    date: 'Today, 10:00 AM',
  });

  // Tasks state
  const [tasks, setTasks] = useState([]);

  // Calls list
  const [recentCalls, setRecentCalls] = useState([]);

  // Load persistent data from localStorage and backend APIs
  useEffect(() => {
    // 1. Sync tasks
    try {
      const savedTasks = localStorage.getItem(`smartcrm_tasks_${contactStorageKey}`);
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    } catch {}

    getFollowUps({ limit: 50 })
      .then((res) => {
        const serverFollowups = (res.followUps || []).filter(
          (f) =>
            f.customerId === contact?.id ||
            f.customerName?.toLowerCase() === contactName.toLowerCase() ||
            (f.phone && f.phone.includes(contactPhone))
        );
        if (serverFollowups.length > 0) {
          const mapped = serverFollowups.map((st) => ({
            id: st._id,
            type: st.type || 'REMINDER',
            date: st.date ? `${st.date} ${st.time || ''}` : 'Today',
            note: st.remarks || st.nextFollowUp || 'Follow-up task',
            createdAgo: 'From CRM database',
            completed: st.status === 'completed',
          }));
          setTasks((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newOnes = mapped.filter((m) => !existingIds.has(m.id));
            const combined = [...newOnes, ...prev];
            localStorage.setItem(`smartcrm_tasks_${contactStorageKey}`, JSON.stringify(combined));
            return combined;
          });
        }
      })
      .catch(() => {});

    // 2. Sync notes
    try {
      const savedNotes = localStorage.getItem(`smartcrm_notes_${contactStorageKey}`);
      if (savedNotes) {
        setContactNotes(JSON.parse(savedNotes));
      }
    } catch {}

    getNotes({ customer: contactName })
      .then((res) => {
        if (res.notes && res.notes.length > 0) {
          const mappedNotes = res.notes.map((n) => ({
            id: n._id,
            text: n.noteFull || n.noteShort || '',
            date: n.createdAt
              ? new Date(n.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recently',
            author: n.createdByName || 'Agent',
          }));
          setContactNotes((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newOnes = mappedNotes.filter((m) => !existingIds.has(m.id));
            const combined = [...newOnes, ...prev];
            localStorage.setItem(`smartcrm_notes_${contactStorageKey}`, JSON.stringify(combined));
            return combined;
          });
        }
      })
      .catch(() => {});

    // 3. Sync calls
    try {
      const savedCalls = localStorage.getItem(`smartcrm_calls_${contactPhone}`);
      if (savedCalls) {
        setRecentCalls(JSON.parse(savedCalls));
      }
    } catch {}

    getCalls({ limit: 100 })
      .then((res) => {
        const serverCalls = (res.calls || []).filter(
          (c) =>
            c.customerId === contact?.id ||
            (c.customerPhone && c.customerPhone.includes(contactPhone)) ||
            (c.customerName && c.customerName.toLowerCase() === contactName.toLowerCase())
        );
        if (serverCalls.length > 0) {
          const mappedCalls = serverCalls.map((sc) => ({
            id: sc._id,
            time: sc.time || (sc.date ? sc.date.slice(5) : '01:54 pm'),
            agent: sc.calledByName || user?.name || 'Agent',
            duration: sc.duration ? (sc.duration.includes('s') ? sc.duration : `${sc.duration}s`) : '12s',
            hasRecording: sc.status === 'connected' || !!sc.recordingUrl,
            recordingUrl: sc.recordingUrl || '',
            callType: sc.callType || (sc.status === 'connected' ? 'outgoing' : 'missed'),
            aiSummary: {
              sentiment: 'Positive',
              score: 92,
              summary: sc.remarks || `Call completed with ${contactName}.`,
              keyPoints: ['Call Logged in CRM'],
              followUps: ['Follow up scheduled'],
            },
            transcript: [
              { speaker: sc.calledByName || user?.name || 'Agent', role: 'agent', time: '00:02', text: `Hello ${contactName}, calling from CRM.` },
              { speaker: contactName, role: 'customer', time: '00:05', text: 'Yes, thank you for reaching out.' },
            ],
          }));
          setRecentCalls((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newOnes = mappedCalls.filter((m) => !existingIds.has(m.id));
            const combined = [...newOnes, ...prev];
            localStorage.setItem(`smartcrm_calls_${contactPhone}`, JSON.stringify(combined));
            return combined;
          });
        }
      })
      .catch(() => {});
  }, [contactStorageKey, contactName, contactPhone, contact?.id, user?.name]);

  // Handle Play/Pause
  const handleTogglePlayCall = (c) => {
    if (!c.hasRecording) {
      addToast('No audio recording available for missed call', 'info');
      return;
    }

    if (playingCallId === c.id) {
      if (isAudioPlaying) {
        audioEngine.pause();
        setIsAudioPlaying(false);
      } else {
        audioEngine.resume();
        setIsAudioPlaying(true);
      }
    } else {
      audioEngine.stop();
      setPlayingCallId(c.id);
      setIsAudioPlaying(true);
      audioEngine.playCall(
        c,
        0,
        () => {},
        () => {
          setIsAudioPlaying(false);
          setPlayingCallId(null);
        }
      );
    }
  };

  const handleOpenAiSummary = (c) => {
    setSelectedCallForModal({
      ...c,
      customerName: contact?.name || 'Customer',
      customerNumber: contact?.phone || contactPhone || '-',
    });
    setIsRecordingModalOpen(true);
  };

  const handleDeleteCall = async (id) => {
    const ok = await confirm({
      title: 'Delete Call Log',
      message: 'Are you sure you want to permanently delete this call record?',
      confirmText: 'Delete Call Record',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!ok) return;

    if (typeof id === 'string' && id.length === 24) {
      deleteCall(id).catch(() => {});
    }

    const updated = recentCalls.filter((c) => c.id !== id);
    setRecentCalls(updated);
    try {
      localStorage.setItem(`smartcrm_calls_${contactPhone}`, JSON.stringify(updated));
    } catch {}
    addToast('Call record deleted', 'info');
  };

  // Click To Call Handler
  const handleTriggerCall = () => {
    if (onStartCall) {
      onStartCall(contact);
    } else {
      audioEngine.playRingTone();
      addToast(`Initiating call to ${contactName} (+91 ${contactPhone})...`, 'success');

      // Dynamically add an outgoing call log
      const newCallRec = {
        id: `rc_${Date.now()}`,
        time: 'Just now',
        agent: user?.name || 'Agent',
        duration: '14s',
        hasRecording: true,
        callType: 'outgoing',
        aiSummary: {
          sentiment: 'Positive',
          score: 94,
          summary: `Call placed to ${contactName} regarding follow-up. Customer responded positively.`,
          keyPoints: ['Direct Call placed from Contact Details', 'Customer contacted successfully'],
          followUps: ['Review recorded conversation'],
        },
        transcript: [
          { speaker: user?.name || 'Agent', role: 'agent', time: '00:02', text: `Hello ${contactName}, this is ${user?.name || 'Support'} following up on your account.` },
          { speaker: contactName, role: 'customer', time: '00:06', text: 'Hi! Yes, thanks for reaching out.' },
        ],
      };

      const updatedCalls = [newCallRec, ...recentCalls];
      setRecentCalls(updatedCalls);
      try {
        localStorage.setItem(`smartcrm_calls_${contactPhone}`, JSON.stringify(updatedCalls));
      } catch {}

      // Save to backend
      createCall({
        customerId: (contact?.id && contact.id.length === 24) ? contact.id : undefined,
        customerName: contactName,
        customerPhone: contactPhone,
        duration: '14s',
        status: 'connected',
        remarks: `Call to ${contactName} placed from Contact Details`,
      }).catch(() => {});

      const cleanPhone = contactPhone.replace(/[^0-9]/g, '');
      if (cleanPhone) {
        try {
          window.open(`tel:${cleanPhone}`, '_self');
        } catch (e) {}
      }
    }
  };

  // Complete Task handler
  const handleCompleteTask = async (taskId) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    const nextCompleted = !targetTask?.completed;
    const ok = await confirm({
      title: nextCompleted ? 'Complete Task' : 'Reopen Task',
      message: `Are you sure you want to mark this task as ${nextCompleted ? 'Completed' : 'Pending'}?`,
      confirmText: nextCompleted ? 'Mark Complete' : 'Mark Pending',
      cancelText: 'Cancel',
      type: nextCompleted ? 'primary' : 'warning',
    });
    if (!ok) return;

    if (taskId && typeof taskId === 'string' && taskId.length === 24) {
      updateFollowUp(taskId, { status: nextCompleted ? 'completed' : 'pending' }).catch(() => {});
    }

    const updated = tasks.map((t) => (t.id === taskId ? { ...t, completed: nextCompleted } : t));
    setTasks(updated);
    try {
      localStorage.setItem(`smartcrm_tasks_${contactStorageKey}`, JSON.stringify(updated));
      const globalTasks = JSON.parse(localStorage.getItem('smartcrm_all_tasks') || '[]');
      localStorage.setItem(
        'smartcrm_all_tasks',
        JSON.stringify(
          globalTasks.map((gt) => (gt._id === taskId ? { ...gt, status: nextCompleted ? 'completed' : 'pending' } : gt))
        )
      );
    } catch {}

    addToast('Task status updated successfully!', 'success');
  };

  // Delete Task handler
  const handleDeleteTask = async (taskId) => {
    const ok = await confirm({
      title: 'Delete Task',
      message: 'Are you sure you want to permanently delete this task?',
      confirmText: 'Delete Task',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!ok) return;

    if (taskId && typeof taskId === 'string' && taskId.length === 24) {
      deleteFollowUp(taskId).catch(() => {});
    }

    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    try {
      localStorage.setItem(`smartcrm_tasks_${contactStorageKey}`, JSON.stringify(updated));
      const globalTasks = JSON.parse(localStorage.getItem('smartcrm_all_tasks') || '[]');
      localStorage.setItem(
        'smartcrm_all_tasks',
        JSON.stringify(globalTasks.filter((gt) => gt._id !== taskId))
      );
    } catch {}

    addToast('Task deleted', 'info');
  };

  // Add Follow-up Task
  const handleAddFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpForm.note.trim()) {
      addToast('Please enter a note for the follow up', 'error');
      return;
    }

    const newId = `task_${Date.now()}`;
    const created = {
      id: newId,
      type: followUpForm.type,
      date: followUpForm.date || 'Today, 05:00 PM',
      note: followUpForm.note.trim(),
      createdAgo: 'Just now',
      completed: false,
    };

    try {
      if (contact?.id && contact.id.length === 24) {
        await createFollowUp({
          customerId: contact.id,
          date: new Date().toISOString().split('T')[0],
          time: '05:00 PM',
          remarks: `[${followUpForm.type}] ${followUpForm.note.trim()}`,
          nextFollowUp: followUpForm.date,
        }).catch(() => {});
      }
    } catch {}

    const updated = [created, ...tasks];
    setTasks(updated);
    try {
      localStorage.setItem(`smartcrm_tasks_${contactStorageKey}`, JSON.stringify(updated));
      const globalTasks = JSON.parse(localStorage.getItem('smartcrm_all_tasks') || '[]');
      localStorage.setItem(
        'smartcrm_all_tasks',
        JSON.stringify([
          {
            _id: newId,
            customerId: contact?.id,
            customerName: contactName,
            phone: contactPhone,
            type: followUpForm.type,
            category: followUpForm.type,
            date: followUpForm.date || 'Today, 05:00 PM',
            remarks: followUpForm.note.trim(),
            status: 'pending',
            assignedTo: leadOwner || user?.name || 'Agent',
            createdAt: new Date().toISOString(),
          },
          ...globalTasks,
        ])
      );
    } catch {}

    setIsAddFollowUpOpen(false);
    setFollowUpForm({ type: 'REMINDER', note: '', date: 'Today, 05:00 PM' });
    addToast('Follow up task added successfully!', 'success');
  };

  // Add Note handler
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const noteId = Date.now();
    const note = {
      id: noteId,
      text: newNoteText.trim(),
      date: 'Just now',
      author: user?.name || 'Agent',
    };

    try {
      await createNote({
        customerName: contactName,
        customerPhone: contactPhone,
        noteFull: newNoteText.trim(),
        customerId: contact?.id && contact.id.length === 24 ? contact.id : undefined,
      }).catch(() => {});
    } catch {}

    const updated = [note, ...contactNotes];
    setContactNotes(updated);
    try {
      localStorage.setItem(`smartcrm_notes_${contactStorageKey}`, JSON.stringify(updated));
    } catch {}

    setNewNoteText('');
    addToast('Note added to contact!', 'success');
  };

  // Delete Note handler
  const handleDeleteNote = async (noteId) => {
    const ok = await confirm({
      title: 'Delete Note',
      message: 'Are you sure you want to delete this note?',
      confirmText: 'Delete Note',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!ok) return;

    if (typeof noteId === 'string' && noteId.length === 24) {
      deleteNote(noteId).catch(() => {});
    }

    const updated = contactNotes.filter((n) => n.id !== noteId);
    setContactNotes(updated);
    try {
      localStorage.setItem(`smartcrm_notes_${contactStorageKey}`, JSON.stringify(updated));
    } catch {}

    addToast('Note deleted', 'info');
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Top Sub-tabs matching Reference: [Sourav] | [Call History] */}
      <div className="flex items-center gap-1 border-b border-[#e8e8e8] dark:border-dark-700">
        <button
          type="button"
          onClick={() => setActiveSubTab('contact')}
          className={`px-5 py-2 text-[14px] font-normal rounded-t-md border transition-all cursor-pointer ${
            activeSubTab === 'contact'
              ? 'bg-white dark:bg-dark-800 text-blue-600 dark:text-blue-400 border-[#d9d9d9] dark:border-dark-600 border-b-transparent -mb-[1px]'
              : 'bg-[#fafafa] dark:bg-dark-900 text-[rgba(0,0,0,0.88)] dark:text-dark-300 border-[#e8e8e8] dark:border-dark-700 hover:text-blue-600'
          }`}
        >
          {contactName}
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('call-history')}
          className={`px-5 py-2 text-[14px] font-normal rounded-t-md border transition-all cursor-pointer ${
            activeSubTab === 'call-history'
              ? 'bg-white dark:bg-dark-800 text-blue-600 dark:text-blue-400 border-[#d9d9d9] dark:border-dark-600 border-b-transparent -mb-[1px]'
              : 'bg-[#fafafa] dark:bg-dark-900 text-[rgba(0,0,0,0.88)] dark:text-dark-300 border-[#e8e8e8] dark:border-dark-700 hover:text-blue-600'
          }`}
        >
          Call History
        </button>
      </div>

      {/* Sub-tab 2: Call History */}
      {activeSubTab === 'call-history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveSubTab('contact')}
              className="inline-flex items-center gap-1.5 text-xs font-normal text-blue-600 hover:underline cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to {contactName}'s Overview</span>
            </button>
          </div>
          <TeamCallHistoryTable />
        </div>
      )}

      {/* Sub-tab 1: Contact Details Page matching Screenshots 2 & 3 */}
      {activeSubTab === 'contact' && (
        <>
          {/* Yellow Alert Box matching Reference */}
          <div className="p-3.5 rounded-md bg-[#fffbe6] dark:bg-amber-950/20 border border-[#ffe58f] dark:border-amber-900/40 text-[#d48806] dark:text-amber-200 text-[13px] text-center space-y-1">
            <p className="font-normal text-[#ad6800] dark:text-amber-200">
              Make sure the Superfone mobile app is in 'Call from Web' mode before placing this call.
            </p>
            <p className="text-[12px] font-normal text-[#d48806] dark:text-amber-300 flex items-center justify-center gap-1.5 flex-wrap">
              <span>Go to Call History on the mobile app</span>
              <span>&gt;</span>
              <span>Click on</span>
              <span className="inline-flex items-center justify-center border border-[#ffd591] dark:border-dark-600 rounded px-1 py-0.5 text-[10px] bg-white dark:bg-dark-800">
                <Phone size={10} className="text-[#d48806] dark:text-dark-200" />
              </span>
              <span>icon on the top bar</span>
              <span>&gt;</span>
              <span>Turn on the mode</span>
            </p>
          </div>

          {/* Contact Main Card matching Reference */}
          <div className="bg-white dark:bg-dark-800 rounded-lg border border-[#e8e8e8] dark:border-dark-700 p-5 shadow-2xs space-y-4">
            {/* Contact Title Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="p-1 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700 text-dark-700 dark:text-dark-300 transition-colors cursor-pointer"
                  title="Back"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="w-8 h-8 rounded-full bg-[#1890ff] text-white flex items-center justify-center font-semibold text-sm">
                  {contactName.charAt(0).toUpperCase()}
                </div>
                <h1 className="text-[16px] font-semibold text-[#1890ff] hover:underline cursor-pointer">
                  {contactName}
                </h1>
                <span className="text-[14px] font-normal text-[rgba(0,0,0,0.88)] dark:text-dark-200 ml-1">
                  +91 {contactPhone}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => addToast(`Activity log for ${contactName}: 4 calls, 1 task logged.`, 'info')}
                  className="text-[14px] font-normal text-[#1890ff] hover:underline cursor-pointer"
                >
                  View Activity
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newTag = window.prompt('Edit Tag / Remarks:', tag);
                    if (newTag && newTag.trim()) {
                      const trimmed = newTag.trim();
                      setTag(trimmed);
                      if (contact?.id && contact.id.length === 24) {
                        updateCustomer(contact.id, { tags: trimmed, interestedProduct: trimmed }).catch(() => {});
                      }
                      onUpdateContact?.({ ...contact, tag: trimmed, tags: trimmed });
                      addToast(`Tag updated to "${trimmed}"`, 'success');
                    }
                  }}
                  className="p-1 text-dark-500 hover:text-dark-800 dark:hover:text-dark-200 cursor-pointer"
                  title="Edit Contact"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Delete Contact',
                      message: `Are you sure you want to permanently delete contact "${contactName}"? All history will be removed.`,
                      confirmText: 'Delete Contact',
                      cancelText: 'Cancel',
                      type: 'danger',
                    });
                    if (!ok) return;

                    if (contact?.id && contact.id.length === 24) {
                      deleteCustomer(contact.id).catch(() => {});
                    }
                    onDeleteContact?.(contact?.id);
                    addToast('Contact deleted successfully', 'info');
                    onBack?.();
                  }}
                  className="p-1 text-dark-500 hover:text-rose-600 cursor-pointer"
                  title="Delete Contact"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Tag Badge with separate Edit Button matching Screenshot */}
            <div className="flex items-center gap-1.5">
              <div className="inline-flex items-center px-2.5 py-0.5 rounded border border-[#d9d9d9] dark:border-dark-700 text-[13px] font-inter font-normal text-[rgba(0,0,0,0.88)] dark:text-dark-300 bg-white dark:bg-dark-800">
                {isEditingTag ? (
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    onBlur={() => {
                      setIsEditingTag(false);
                      if (contact?.id && contact.id.length === 24) {
                        updateCustomer(contact.id, { tags: tag, interestedProduct: tag }).catch(() => {});
                      }
                      onUpdateContact?.({ ...contact, tag, tags: tag });
                      addToast(`Tag updated to "${tag}"`, 'success');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setIsEditingTag(false);
                        if (contact?.id && contact.id.length === 24) {
                          updateCustomer(contact.id, { tags: tag, interestedProduct: tag }).catch(() => {});
                        }
                        onUpdateContact?.({ ...contact, tag, tags: tag });
                        addToast(`Tag updated to "${tag}"`, 'success');
                      }
                    }}
                    className="w-16 bg-transparent outline-none font-inter font-normal"
                    autoFocus
                  />
                ) : (
                  <span>{tag}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsEditingTag(!isEditingTag)}
                className="p-1 rounded border border-[#d9d9d9] dark:border-dark-700 text-[rgba(0,0,0,0.45)] hover:text-[#1890ff] bg-white dark:bg-dark-800 cursor-pointer transition-colors"
                title="Edit Tag"
              >
                <Pencil size={12} />
              </button>
            </div>

            {/* 2-Column: LEAD OWNER & LEAD STAGE matching Screenshot 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#f0f0f0] dark:border-dark-700/60 pt-4">
              <div>
                <label className="block text-[12px] font-normal text-[rgba(0,0,0,0.45)] dark:text-dark-400 uppercase tracking-wider mb-1.5">
                  LEAD OWNER
                </label>
                <div className="relative">
                  <select
                    value={leadOwner}
                    onChange={async (e) => {
                      const newOwner = e.target.value;
                      if (newOwner === leadOwner) return;
                      const ok = await confirm({
                        title: 'Change Lead Owner',
                        message: `Are you sure you want to assign lead owner to "${newOwner}" for ${contactName}?`,
                        confirmText: `Assign to ${newOwner}`,
                        cancelText: 'Cancel',
                        type: 'primary',
                      });
                      if (!ok) return;
                      setLeadOwner(newOwner);
                      if (contact?.id && contact.id.length === 24) {
                        updateCustomer(contact.id, { assignedTelecaller: newOwner }).catch(() => {});
                      }
                      onUpdateContact?.({ ...contact, assignedTelecaller: newOwner });
                      addToast(`Lead Owner set to ${newOwner}`, 'success');
                    }}
                    className="w-full appearance-none px-3 py-2 text-[14px] font-normal rounded-md bg-white dark:bg-dark-900 border border-[#d9d9d9] dark:border-dark-700 text-[rgba(0,0,0,0.88)] dark:text-white focus:outline-none focus:border-[#1890ff] cursor-pointer"
                  >
                    {user?.name && <option value={user.name}>{user.name}</option>}
                    <option value="Admin">Admin</option>
                    <option value="Sales Agent">Sales Agent</option>
                    <option value="Support Agent">Support Agent</option>
                    {leadOwner && leadOwner !== user?.name && leadOwner !== 'Admin' && leadOwner !== 'Sales Agent' && leadOwner !== 'Support Agent' && (
                      <option value={leadOwner}>{leadOwner}</option>
                    )}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-3.5 text-[rgba(0,0,0,0.45)] pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-normal text-[rgba(0,0,0,0.45)] dark:text-dark-400 uppercase tracking-wider mb-1.5">
                  FOLLOW-UP STATUS
                </label>
                <div className="relative">
                  <select
                    value={leadStage}
                    onChange={async (e) => {
                      const newStage = e.target.value;
                      if (newStage === leadStage || newStage === 'Select Follow-up Status') return;
                      const ok = await confirm({
                        title: 'Update Follow-up Status',
                        message: `Are you sure you want to update ${contactName} to "${newStage}"?`,
                        confirmText: `Change to ${newStage}`,
                        cancelText: 'Cancel',
                        type: 'primary',
                      });
                      if (!ok) return;
                      setLeadStage(newStage);
                      if (contact?.id && contact.id.length === 24) {
                        updateCustomer(contact.id, { status: newStage }).catch(() => {});
                      }
                      onUpdateContact?.({ ...contact, leadStage: newStage, status: newStage });
                      addToast(`Follow-up Status set to ${newStage}`, 'success');
                    }}
                    className="w-full appearance-none px-3 py-2 text-[14px] font-normal rounded-md bg-white dark:bg-dark-900 border border-[#d9d9d9] dark:border-dark-700 text-[rgba(0,0,0,0.45)] dark:text-dark-400 focus:outline-none focus:border-[#1890ff] cursor-pointer"
                  >
                    <option value="Select Follow-up Status">Select Follow-up Status</option>
                    <option value="New Follow-up">New Follow-up</option>
                    <option value="Follow-up: Contacted">Follow-up: Contacted</option>
                    <option value="Follow-up: Interested">Follow-up: Interested</option>
                    <option value="Follow-up: In Progress">Follow-up: In Progress</option>
                    <option value="Follow-up: Meeting Scheduled">Follow-up: Meeting Scheduled</option>
                    <option value="Follow-up: Won">Follow-up: Won</option>
                    <option value="Follow-up: Lost">Follow-up: Lost</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-3.5 text-[rgba(0,0,0,0.45)] pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Centered Actions matching Screenshot: Notes | Click To Call | Message */}
            <div className="flex items-center justify-center gap-16 py-3 border-t border-[#f0f0f0] dark:border-dark-700/60">
              {/* Notes */}
              <button
                type="button"
                onClick={() => setIsNotesModalOpen(true)}
                className="flex flex-col items-center gap-1 text-[rgba(0,0,0,0.65)] dark:text-dark-300 hover:text-[#1890ff] cursor-pointer group"
              >
                <div className="p-2 rounded-full hover:bg-dark-100 dark:hover:bg-dark-700">
                  <SlidersHorizontal size={20} className="text-[rgba(0,0,0,0.65)] dark:text-dark-300 group-hover:text-[#1890ff]" />
                </div>
                <span className="text-[12px] font-normal text-[rgba(0,0,0,0.65)] dark:text-dark-300">Notes</span>
              </button>

              {/* Click To Call */}
              <button
                type="button"
                onClick={handleTriggerCall}
                className="flex items-center gap-2 px-6 h-10 rounded-md bg-[#1890ff] hover:bg-[#40a9ff] text-white font-normal text-[14px] shadow-sm transition-colors cursor-pointer"
              >
                <PhoneCall size={16} />
                <span>Click To Call</span>
              </button>

              {/* Message */}
              <button
                type="button"
                onClick={() => setIsMessageModalOpen(true)}
                className="flex flex-col items-center gap-1 text-[rgba(0,0,0,0.65)] dark:text-dark-300 hover:text-emerald-600 cursor-pointer group"
              >
                <div className="p-2 rounded-full hover:bg-dark-100 dark:hover:bg-dark-700">
                  <MessageCircle size={20} className="text-[#25d366]" />
                </div>
                <span className="text-[12px] font-normal text-[rgba(0,0,0,0.65)] dark:text-dark-300">Message</span>
              </button>
            </div>
          </div>

          {/* RECENT TASK Section */}
          <div className="space-y-2 mt-4 font-inter">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-semibold uppercase tracking-wider text-[rgba(0,0,0,0.45)] dark:text-dark-400 text-[12px]">
                RECENT TASK
              </span>
              <span className="font-normal text-[rgba(0,0,0,0.65)] dark:text-dark-300 text-[13px] font-inter">
                Lead Tasks
              </span>
              <button
                type="button"
                onClick={() => setIsAddFollowUpOpen(true)}
                className="font-normal text-[13px] text-[#1890ff] hover:underline cursor-pointer"
              >
                Add Follow Up
              </button>
            </div>

            {/* Task Card with left bar */}
            {tasks.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#d9d9d9] dark:border-dark-700 bg-[#fafafa] dark:bg-dark-800/40 p-5 text-center text-[13px] text-[rgba(0,0,0,0.45)] dark:text-dark-400">
                No follow-up tasks scheduled. Click &quot;Add Follow Up&quot; to create one.
              </div>
            ) : (
              tasks.map((task) => (
              <div
                key={task.id}
                className="relative rounded-md border border-[#e8e8e8] dark:border-dark-700 bg-[#fafafa] dark:bg-dark-800 p-4 space-y-3 font-inter"
              >
                {/* Blue vertical accent bar */}
                <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#1890ff] rounded-r" />

                <div className="pl-2">
                  <div className="flex items-center justify-between font-inter">
                    <span className="font-semibold text-[13px] uppercase tracking-wider text-[rgba(0,0,0,0.85)] dark:text-white font-inter">
                      | {task.type}
                    </span>
                    <div className="flex items-center gap-3 text-[rgba(0,0,0,0.65)] dark:text-dark-300 font-inter">
                      <span className="text-[12px] font-semibold text-[rgba(0,0,0,0.65)] dark:text-dark-200 font-inter">
                        {task.date}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddFollowUpOpen(true)}
                        className="hover:text-[#1890ff] p-0.5 cursor-pointer text-[rgba(0,0,0,0.45)] dark:text-dark-400"
                        title="Edit Task"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="hover:text-rose-600 p-0.5 cursor-pointer text-[rgba(0,0,0,0.45)] dark:text-dark-400"
                        title="Delete Task"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 font-inter text-[14px] leading-[22px]">
                    <p className="text-[11px] font-normal text-[rgba(0,0,0,0.45)] dark:text-dark-400 uppercase tracking-wider font-inter">NOTE</p>
                    <p className="font-normal text-[14px] leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-white mt-0.5 font-inter">{task.note}</p>
                    <p className="text-[12px] leading-[20px] font-normal text-[rgba(0,0,0,0.45)] dark:text-dark-400 mt-1 font-inter">{task.createdAgo}</p>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleCompleteTask(task.id)}
                      className={`h-8 px-4 rounded text-[13px] font-inter font-normal cursor-pointer transition-colors ${
                        task.completed
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-[#1890ff] hover:bg-[#40a9ff] text-white'
                      }`}
                    >
                      {task.completed ? 'Completed ✓' : 'Mark as Complete'}
                    </button>
                  </div>
                </div>
              </div>
            )))}
          </div>

          {/* RECENT CALLS Section matching Screenshot 3 */}
          <div className="space-y-3 mt-6">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-semibold uppercase tracking-wider text-[rgba(0,0,0,0.45)] dark:text-dark-400 text-[12px]">
                RECENT CALLS
              </span>
              <button
                type="button"
                onClick={() => setActiveSubTab('call-history')}
                className="font-normal text-[13px] text-[#1890ff] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="divide-y divide-[#f0f0f0] dark:divide-dark-700/60 font-inter text-[14px] leading-[22px] bg-white dark:bg-dark-800 rounded-md border border-[#e8e8e8] dark:border-dark-700 p-2">
              {recentCalls.length === 0 ? (
                <div className="py-6 text-center text-[13px] text-[rgba(0,0,0,0.45)] dark:text-dark-400">
                  No call records found for this contact.
                </div>
              ) : (
                recentCalls.map((c) => {
                  const isPlaying = playingCallId === c.id && isAudioPlaying;

                  return (
                    <div
                      key={c.id}
                      className="py-2.5 flex items-center justify-between hover:bg-dark-50/50 dark:hover:bg-dark-700/30 px-3 rounded-md transition-colors font-inter"
                    >
                      {/* Left: Phone icon + Time + Agent Avatar + Agent Name */}
                      <div className="flex items-center gap-3 font-inter">
                        <Phone size={14} className="text-[rgba(0,0,0,0.65)] dark:text-dark-200 flex-shrink-0" />
                        <span className="text-[rgba(0,0,0,0.88)] dark:text-dark-200 font-normal text-[14px] font-inter">{c.time}</span>
                        <div className="flex items-center gap-1.5 ml-2">
                          <div className="w-5 h-5 rounded-full bg-[#831843] text-white flex items-center justify-center text-[10px] font-semibold uppercase">
                            {c.agent ? c.agent.charAt(0) : 'A'}
                          </div>
                          <span className="font-normal text-[13px] text-[rgba(0,0,0,0.65)] dark:text-dark-300 font-inter">{c.agent}</span>
                        </div>
                      </div>

                      {/* Right: Duration + Audio Play/Mute icon + Copy Icon + AI Summary */}
                      <div className="flex items-center gap-4 font-inter">
                        <span className="font-mono text-[rgba(0,0,0,0.45)] dark:text-dark-400 w-8 text-right text-[13px]">
                          {c.duration}
                        </span>

                        {c.hasRecording ? (
                          <button
                            type="button"
                            onClick={() => handleTogglePlayCall(c)}
                            className={`p-1 rounded-full transition-colors cursor-pointer ${
                              isPlaying
                                ? 'text-[#1890ff] bg-blue-50 dark:bg-blue-950'
                                : 'text-[rgba(0,0,0,0.65)] dark:text-dark-300 hover:text-[#1890ff]'
                            }`}
                            title={isPlaying ? 'Pause' : 'Play recording'}
                          >
                            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                          </button>
                        ) : (
                          <span className="p-1 text-[rgba(0,0,0,0.25)] dark:text-dark-500 opacity-60" title="No recording">
                            <VolumeX size={14} />
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(c.aiSummary?.summary || `Call record with ${c.agent || 'Agent'}`);
                            addToast('Call log details copied to clipboard', 'success');
                          }}
                          className="text-[rgba(0,0,0,0.45)] dark:text-dark-400 hover:text-[rgba(0,0,0,0.88)] dark:hover:text-dark-200 p-1 cursor-pointer transition-colors"
                          title="Copy record"
                        >
                        <FileText size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenAiSummary(c)}
                        className="text-[13px] font-normal text-[#1890ff] hover:underline cursor-pointer font-inter"
                      >
                        AI Summary
                      </button>
                    </div>
                  </div>
                );
              }))}
            </div>
          </div>
        </>
      )}

      {/* Modal: Add Follow Up Task */}
      {isAddFollowUpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleAddFollowUp}
            className="bg-white dark:bg-dark-800 rounded-lg max-w-sm w-full border border-[#d9d9d9] dark:border-dark-700 p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0] dark:border-dark-700">
              <h3 className="text-[16px] font-semibold text-[rgba(0,0,0,0.88)] dark:text-white">Add Follow Up</h3>
              <button
                type="button"
                onClick={() => setIsAddFollowUpOpen(false)}
                className="text-[rgba(0,0,0,0.45)] hover:text-[rgba(0,0,0,0.88)] text-base font-normal cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-[13px] font-normal text-[rgba(0,0,0,0.65)] dark:text-dark-300 mb-1">
                Task Type
              </label>
              <select
                value={followUpForm.type}
                onChange={(e) => setFollowUpForm({ ...followUpForm, type: e.target.value })}
                className="w-full px-3 py-2 text-[14px] font-normal rounded-md bg-white dark:bg-dark-900 border border-[#d9d9d9] dark:border-dark-700 text-[rgba(0,0,0,0.88)] dark:text-white focus:outline-none focus:border-[#1890ff] cursor-pointer"
              >
                <option value="REMINDER">REMINDER</option>
                <option value="FIRST CALL">FIRST CALL</option>
                <option value="FOLLOW UP">FOLLOW UP</option>
                <option value="PAYMENT COLLECTION">PAYMENT COLLECTION</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-normal text-[rgba(0,0,0,0.65)] dark:text-dark-300 mb-1">
                Due Date &amp; Time
              </label>
              <input
                type="text"
                value={followUpForm.date}
                onChange={(e) => setFollowUpForm({ ...followUpForm, date: e.target.value })}
                placeholder="e.g. 26 MAR 01:09 PM"
                className="w-full px-3 py-2 text-[14px] font-normal rounded-md bg-white dark:bg-dark-900 border border-[#d9d9d9] dark:border-dark-700 text-[rgba(0,0,0,0.88)] dark:text-white focus:outline-none focus:border-[#1890ff]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-normal text-[rgba(0,0,0,0.65)] dark:text-dark-300 mb-1">
                Task Note / Remarks *
              </label>
              <textarea
                required
                rows={3}
                value={followUpForm.note}
                onChange={(e) => setFollowUpForm({ ...followUpForm, note: e.target.value })}
                placeholder="e.g. DD collection"
                className="w-full px-3 py-2 text-[14px] leading-[22px] font-inter font-normal rounded-md bg-white dark:bg-dark-900 border border-[#d9d9d9] dark:border-dark-700 text-[rgba(0,0,0,0.88)] dark:text-white focus:outline-none focus:border-[#1890ff] resize-none"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddFollowUpOpen(false)}
                className="px-3.5 py-1.5 text-[14px] font-normal rounded-md border border-[#d9d9d9] dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer text-[rgba(0,0,0,0.88)] dark:text-dark-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-[14px] font-normal text-white bg-[#1890ff] hover:bg-[#40a9ff] rounded-md shadow-xs cursor-pointer font-inter"
              >
                Add Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Notes */}
      {isNotesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-dark-800 rounded-lg max-w-lg w-full border border-[#d9d9d9] dark:border-dark-700 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0] dark:border-dark-700">
              <h3 className="text-[16px] font-semibold text-[rgba(0,0,0,0.88)] dark:text-white">
                Contact Notes: {contactName}
              </h3>
              <button
                type="button"
                onClick={() => setIsNotesModalOpen(false)}
                className="text-[rgba(0,0,0,0.45)] hover:text-[rgba(0,0,0,0.88)] text-base font-normal cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Existing notes list */}
            <div className="space-y-2 max-h-60 overflow-y-auto font-inter">
              {contactNotes.length === 0 ? (
                <div className="py-6 text-center text-xs text-dark-400">
                  No notes recorded yet. Add the first note below!
                </div>
              ) : (
                contactNotes.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-md bg-[#fafafa] dark:bg-dark-900 border border-[#e8e8e8] dark:border-dark-700 text-[13px] leading-[22px] space-y-1 font-inter group"
                  >
                    <p className="text-[rgba(0,0,0,0.88)] dark:text-dark-200 font-normal font-inter">{n.text}</p>
                    <div className="flex items-center justify-between text-[11px] text-[rgba(0,0,0,0.45)] dark:text-dark-400 font-inter pt-1">
                      <span>{n.author}</span>
                      <div className="flex items-center gap-2">
                        <span>{n.date}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(n.id)}
                          className="text-dark-400 hover:text-rose-600 p-0.5 cursor-pointer opacity-70 group-hover:opacity-100 transition-opacity"
                          title="Delete note"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add note input */}
            <form onSubmit={handleAddNote} className="space-y-2 pt-2">
              <textarea
                rows={2}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Type a new note..."
                className="w-full px-3 py-2 text-[14px] leading-[22px] font-inter font-normal rounded-md bg-white dark:bg-dark-900 border border-[#d9d9d9] dark:border-dark-700 text-[rgba(0,0,0,0.88)] dark:text-white focus:outline-none focus:border-[#1890ff] resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={!newNoteText.trim()}
                  className="px-4 py-1.5 rounded-md text-[14px] font-normal text-white bg-[#1890ff] hover:bg-[#40a9ff] disabled:opacity-50 cursor-pointer shadow-xs font-inter"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Message (WhatsApp) */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-dark-800 rounded-lg max-w-sm w-full border border-[#d9d9d9] dark:border-dark-700 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0] dark:border-dark-700">
              <div className="flex items-center gap-2">
                <MessageCircle size={18} className="text-[#25d366]" />
                <h3 className="text-[16px] font-semibold text-[rgba(0,0,0,0.88)] dark:text-white">WhatsApp Message</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMessageModalOpen(false)}
                className="text-[rgba(0,0,0,0.45)] dark:text-dark-400 hover:text-[rgba(0,0,0,0.88)] dark:hover:text-white text-base font-normal cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[13px] font-normal text-[rgba(0,0,0,0.65)] dark:text-dark-300 font-inter">
              Send a direct WhatsApp message to <span className="font-semibold text-[rgba(0,0,0,0.88)] dark:text-dark-200 font-inter">{contactName}</span> (+91 {contactPhone}):
            </p>

            <div className="space-y-2 font-inter">
              <button
                type="button"
                onClick={() => {
                  window.open(`https://wa.me/91${contactPhone.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(contactName)},%20following%20up%20on%20our%20recent%20discussion.`, '_blank');
                  setIsMessageModalOpen(false);
                  addToast('Opening WhatsApp Chat...', 'success');
                }}
                className="w-full flex items-center justify-between p-3 rounded-md border border-[#b7eb8f] bg-[#f6ffed] hover:bg-[#d9f7be] text-[#389e0d] text-[13px] leading-[20px] font-inter font-normal cursor-pointer transition-colors"
              >
                <span>Follow-up Greeting Template</span>
                <Send size={13} />
              </button>

              <button
                type="button"
                onClick={() => {
                  window.open(`https://wa.me/91${contactPhone.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(contactName)},%20here%20is%20the%20official%20quote.`, '_blank');
                  setIsMessageModalOpen(false);
                  addToast('Opening WhatsApp Chat...', 'success');
                }}
                className="w-full flex items-center justify-between p-3 rounded-md border border-[#d9d9d9] dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-700 text-[rgba(0,0,0,0.88)] dark:text-dark-200 text-[13px] leading-[20px] font-inter font-normal cursor-pointer transition-colors"
              >
                <span>Share Official Quote</span>
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full AI Call Recording Modal */}
      <CallRecordingModal
        isOpen={isRecordingModalOpen}
        onClose={() => setIsRecordingModalOpen(false)}
        call={selectedCallForModal}
      />
    </div>
  );
}
