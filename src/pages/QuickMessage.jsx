import { useState, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  Plus,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  ChevronDown,
  X,
  Upload,
  Paperclip,
  CheckCircle2,
  FileText,
  Sparkles,
  Info,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../context/ConfirmContext';

export default function QuickMessage({ onNavigate }) {
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // Active sub-tab: 'active' | 'hidden'
  const [activeTab, setActiveTab] = useState('active');

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Selected organization
  const [selectedOrg, setSelectedOrg] = useState('Main Organization');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);

  // Create Modal Tab: 'normal' | 'interactive'
  const [modalTab, setModalTab] = useState('normal');

  // New Message Form state matching Screenshots 2 & 3
  const [createForm, setCreateForm] = useState({
    title: '',
    message: '',
    headerText: '',
    attachedFile: null,
  });

  // Edit Message Form state matching Screenshot 4
  const [editForm, setEditForm] = useState({
    id: '',
    title: '',
    message: '',
    attachedFile: null,
  });

  // Quick Messages list matching Screenshots 1 & 4
  const [messages, setMessages] = useState([
    {
      id: 'qm_1',
      title: 'After Call Note Not Set',
      body: 'Hi #agent_name,\nAapka call #customer_name ke saath complete ho gaya hai, lekin after-call note abhi tak set nahi ki gayi hai.\n\nKripya call ke baad ka note jaldi se update karein taaki customer',
      type: 'normal',
      isHidden: false,
    },
  ]);

  // Handle Hide / Unhide
  const handleToggleHide = async (id) => {
    const target = messages.find((m) => m.id === id);
    if (!target) return;
    const willHide = !target.isHidden;
    const ok = await confirm({
      title: willHide ? 'Hide Quick Message' : 'Unhide Quick Message',
      message: `Are you sure you want to ${willHide ? 'hide' : 'unhide'} template "${target.title}"?`,
      confirmText: willHide ? 'Hide Template' : 'Unhide Template',
      cancelText: 'Cancel',
      type: willHide ? 'warning' : 'primary',
    });
    if (!ok) return;

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          addToast(
            willHide
              ? `Message moved to Hidden templates`
              : `Message unhidden and restored to Active`,
            'info'
          );
          return { ...m, isHidden: willHide };
        }
        return m;
      })
    );
  };

  // Handle Delete
  const handleDelete = async (id, title) => {
    const ok = await confirm({
      title: 'Delete Quick Message',
      message: `Are you sure you want to permanently delete template "${title}"?`,
      confirmText: 'Delete Template',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!ok) return;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    addToast('Quick message template deleted', 'info');
  };

  // Open Edit Modal with exact values matching Screenshot 4
  const handleOpenEdit = (msg) => {
    setEditForm({
      id: msg.id,
      title: msg.title,
      message: msg.body,
      attachedFile: null,
    });
    setEditingMessage(msg);
  };

  // Save New Quick Message
  const handleSaveNew = (e) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.message.trim()) {
      addToast('Please enter both title and message', 'error');
      return;
    }

    const newMsg = {
      id: `qm_${Date.now()}`,
      title: createForm.title.trim(),
      body: createForm.message.trim(),
      type: modalTab,
      isHidden: false,
    };

    setMessages([newMsg, ...messages]);
    setIsCreateModalOpen(false);
    setCreateForm({ title: '', message: '', headerText: '', attachedFile: null });
    addToast('New quick message template created!', 'success');
  };

  // Save Edited Quick Message
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editForm.title.trim() || !editForm.message.trim()) {
      addToast('Please enter both title and message', 'error');
      return;
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === editForm.id
          ? { ...m, title: editForm.title.trim(), body: editForm.message.trim() }
          : m
      )
    );

    setEditingMessage(null);
    addToast('Quick message template updated!', 'success');
  };

  // Insert variable helper
  const insertVariable = (varName, isEdit = false) => {
    if (isEdit) {
      setEditForm((prev) => ({
        ...prev,
        message: `${prev.message} #${varName} `,
      }));
    } else {
      setCreateForm((prev) => ({
        ...prev,
        message: `${prev.message} #${varName} `,
      }));
    }
  };

  // Filter messages
  const activeMessages = useMemo(
    () => messages.filter((m) => !m.isHidden),
    [messages]
  );
  const hiddenMessages = useMemo(
    () => messages.filter((m) => m.isHidden),
    [messages]
  );

  const displayedList = activeTab === 'active' ? activeMessages : hiddenMessages;

  const filteredMessages = useMemo(() => {
    return displayedList.filter(
      (m) =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.body.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [displayedList, searchQuery]);

  return (
    <div className="space-y-4">
      {/* =========================================================================
          TOP HEADER ROW matching Screenshot 1
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Icon + Title + Subtitle */}
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
              <MessageSquare size={16} />
            </div>
            <h1 className="text-xl font-bold text-dark-900 dark:text-white">Quick Messages</h1>
          </div>
          <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
            Save templates you reuse often and send them in a tap.
          </p>
        </div>

        {/* Right: Org Dropdown + Add quick message button */}
        <div className="flex items-center gap-3">
          <div className="relative min-w-[130px]">
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="w-full appearance-none pl-3 pr-7 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Main Organization">Main Organization</option>
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none"
            />
          </div>

          <button
            onClick={() => {
              setModalTab('normal');
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Plus size={15} />
            <span>Add quick message</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SUB-TABS & SEARCH BAR matching Screenshot 1
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        {/* Sub-tabs: Active & Hidden */}
        <div className="flex items-center gap-6 border-b border-dark-200 dark:border-dark-700">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-2.5 text-xs sm:text-sm font-semibold transition-all relative flex items-center gap-1.5 ${
              activeTab === 'active'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-dark-500 hover:text-dark-900 dark:hover:text-white'
            }`}
          >
            <span>Active</span>
            <span className="text-xs text-dark-400">{activeMessages.length}</span>
            {activeTab === 'active' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('hidden')}
            className={`pb-2.5 text-xs sm:text-sm font-semibold transition-all relative flex items-center gap-1.5 ${
              activeTab === 'hidden'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-dark-500 hover:text-dark-900 dark:hover:text-white'
            }`}
          >
            <EyeOff size={14} className="text-dark-400" />
            <span>Hidden</span>
            <span className="text-xs text-dark-400">{hiddenMessages.length}</span>
            {activeTab === 'hidden' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Search input matching Screenshot 1 */}
        <div className="relative min-w-[240px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or body"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* =========================================================================
          QUICK MESSAGES CARDS LIST matching Screenshot 1
          ========================================================================= */}
      <div className="space-y-3 pt-1">
        {filteredMessages.length === 0 ? (
          <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-12 text-center text-xs text-dark-400 shadow-2xs">
            {activeTab === 'active'
              ? 'No active quick messages found'
              : 'No hidden quick messages'}
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-4 shadow-2xs flex items-center justify-between gap-4 hover:shadow-xs transition-shadow"
            >
              {/* Left Content */}
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-dark-900 dark:text-white truncate">
                    {msg.title}
                  </h3>
                  <p className="text-xs text-dark-500 dark:text-dark-400 truncate mt-0.5 max-w-xl">
                    {msg.body.split('\n')[0]}
                  </p>
                </div>
              </div>

              {/* Right Action Icons: Hide + Pencil + Trash matching Screenshot 1 */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleHide(msg.id)}
                  className="flex items-center gap-1 text-xs font-semibold text-dark-500 hover:text-dark-800 dark:hover:text-white transition-colors"
                >
                  {msg.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                  <span>{msg.isHidden ? 'Unhide' : 'Hide'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(msg)}
                  className="p-1 text-dark-400 hover:text-dark-700 dark:hover:text-dark-200 transition-colors"
                  title="Edit Template"
                >
                  <Pencil size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(msg.id, msg.title)}
                  className="p-1 text-dark-400 hover:text-rose-600 transition-colors"
                  title="Delete Template"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* =========================================================================
          MODAL 1: ADD QUICK MESSAGE matching Screenshots 2 & 3
          ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleSaveNew}
            className="bg-white dark:bg-dark-800 rounded-2xl max-w-lg w-full border border-dark-200 dark:border-dark-700 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Title & Close */}
            <div className="flex items-start justify-between pb-1">
              <div>
                <h3 className="text-base font-bold text-dark-900 dark:text-white">
                  New quick message
                </h3>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                  Save a reusable message you can send in a tap.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-dark-400 hover:text-dark-600 dark:hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-tabs: Normal | Interactive matching Screenshots 2 & 3 */}
            <div className="flex items-center gap-6 border-b border-dark-200 dark:border-dark-700">
              <button
                type="button"
                onClick={() => setModalTab('normal')}
                className={`pb-2 text-xs font-bold transition-all relative ${
                  modalTab === 'normal'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-dark-500 hover:text-dark-800'
                }`}
              >
                <span>Normal</span>
                {modalTab === 'normal' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab('interactive')}
                className={`pb-2 text-xs font-bold transition-all relative ${
                  modalTab === 'interactive'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-dark-500 hover:text-dark-800'
                }`}
              >
                <span>Interactive</span>
                {modalTab === 'interactive' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            </div>

            {/* Title Field */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-dark-400 uppercase tracking-wider">
                TITLE (FOR YOUR REFERENCE)
              </label>
              <input
                type="text"
                required
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="Add title"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Interactive Header Media Field (Only in Interactive Tab: Screenshot 3) */}
            {modalTab === 'interactive' && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-dark-400 uppercase tracking-wider">
                  HEADER MEDIA (IMAGE, VIDEO OR DOCUMENT)
                </label>
                <div
                  onClick={() => addToast('File selector opened (Max 25MB)', 'info')}
                  className="border-2 border-dashed border-blue-200 dark:border-blue-900 rounded-xl p-5 text-center cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                >
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5">
                    <Plus size={15} /> ATTACH FILE
                  </p>
                  <p className="text-[11px] text-dark-400 mt-1">Maximum upload size is 25MB</p>
                </div>
                <p className="text-[11px] text-dark-400 leading-tight">
                  JPG, PNG, MP4, PDF, Word, Excel or PowerPoint. Sent as the message header on
                  WhatsApp.
                </p>

                <div className="space-y-1 pt-1">
                  <label className="block text-[11px] font-bold text-dark-400 uppercase tracking-wider">
                    HEADER TEXT
                  </label>
                  <input
                    type="text"
                    value={createForm.headerText}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, headerText: e.target.value })
                    }
                    placeholder="Add header text"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Message Body Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-dark-400 uppercase tracking-wider">
                  {modalTab === 'interactive' ? 'BODY TEXT' : 'MESSAGE'}
                </label>
                {/* Variable insertion buttons */}
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-dark-400">Insert:</span>
                  {['agent_name', 'customer_name'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v, false)}
                      className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-100"
                    >
                      #{v}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={4}
                required
                value={createForm.message}
                onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                placeholder="Type # to add variable"
                className="w-full p-3 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
              <p className="text-[11px] text-dark-400">Type # to insert a variable.</p>
            </div>

            {/* Attach Media Field (Normal Tab: Screenshot 2) */}
            {modalTab === 'normal' && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-dark-400 uppercase tracking-wider">
                  ATTACH MEDIA
                </label>
                <div
                  onClick={() => addToast('File selector opened (Max 25MB)', 'info')}
                  className="border-2 border-dashed border-blue-200 dark:border-blue-900 rounded-xl p-4 text-center cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                >
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5">
                    <Plus size={15} /> ATTACH FILE
                  </p>
                  <p className="text-[11px] text-dark-400 mt-0.5">Maximum upload size is 25MB</p>
                </div>
              </div>
            )}

            {/* Modal Bottom Buttons matching Screenshots 2 & 3 */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-100 dark:border-dark-700">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-dark-600 hover:bg-dark-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: EDIT QUICK MESSAGE matching Screenshot 4
          ========================================================================= */}
      {editingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white dark:bg-dark-800 rounded-2xl max-w-lg w-full border border-dark-200 dark:border-dark-700 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Header with Title & Close button */}
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-base font-bold text-dark-900 dark:text-white">
                Title (only for your reference)
              </h3>
              <button
                type="button"
                onClick={() => setEditingMessage(null)}
                className="text-dark-400 hover:text-dark-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Title Input */}
            <div>
              <input
                type="text"
                required
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            {/* Message Body Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300">
                  Message
                </label>
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-dark-400">Insert:</span>
                  {['agent_name', 'customer_name'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v, true)}
                      className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-100"
                    >
                      #{v}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={5}
                required
                value={editForm.message}
                onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                className="w-full p-3 text-xs rounded-xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-mono"
              />
              <p className="text-[11px] text-dark-400">Type # to add variable</p>
            </div>

            {/* Add media attachment field matching Screenshot 4 */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300">
                Add media
              </label>
              <div
                onClick={() => addToast('File selector opened (Max 25MB)', 'info')}
                className="border-2 border-dashed border-blue-200 dark:border-blue-900 rounded-xl p-4 text-center cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
              >
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5">
                  <Plus size={15} /> ATTACH FILE
                </p>
                <p className="text-[11px] text-dark-400 mt-0.5">Maximum upload size is 25MB</p>
              </div>
            </div>

            {/* Bottom Buttons: Cancel & Submit matching Screenshot 4 */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-100 dark:border-dark-700">
              <button
                type="button"
                onClick={() => setEditingMessage(null)}
                className="px-4 py-2 text-xs font-semibold text-dark-600 hover:bg-dark-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
