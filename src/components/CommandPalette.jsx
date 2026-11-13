import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Home,
  Users,
  Phone,
  MessageSquare,
  Calendar,
  Wallet,
  Settings,
  Shield,
  ArrowRight,
  Clock,
  Plus,
  PhoneCall,
  Moon,
  Sun,
  FileText,
  X,
  LayoutGrid,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { isAdminOrOwner } from '../utils/permissions';

export default function CommandPalette({ isOpen, onClose, onNavigate }) {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useApp();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const isAdmin = isAdminOrOwner(user);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items = [
    // Pages
    { id: 'home', title: 'Dashboard Overview', category: 'Navigation', icon: Home, shortcut: 'G H', action: () => onNavigate?.('home') },
    { id: 'whatsapp', title: 'WhatsApp Business Hub', category: 'Navigation', icon: MessageSquare, shortcut: 'G W', action: () => onNavigate?.('whatsapp') },
    { id: 'leads', title: 'Leads & Pipeline', category: 'Navigation', icon: LayoutGrid, shortcut: 'G L', action: () => onNavigate?.('leads') },
    { id: 'contacts', title: 'Contacts & Customers', category: 'Navigation', icon: Users, shortcut: 'G C', action: () => onNavigate?.('contacts') },
    { id: 'calls', title: 'Call History & Logs', category: 'Navigation', icon: Phone, shortcut: 'G A', action: () => onNavigate?.('call-history') },
    { id: 'todos', title: 'Tasks & Follow-ups', category: 'Navigation', icon: Clock, shortcut: 'G T', action: () => onNavigate?.('todos') },
    { id: 'reports', title: 'Caller Reports & Performance', category: 'Navigation', icon: FileText, shortcut: 'G R', action: () => onNavigate?.('reports') },
    { id: 'automations', title: 'Workflows & Automations', category: 'Navigation', icon: Sparkles, shortcut: 'G U', action: () => onNavigate?.('automations') },
    { id: 'wallet', title: 'Wallet & SMS Credits', category: 'Navigation', icon: Wallet, shortcut: 'G $', action: () => onNavigate?.('wallet') },
    { id: 'settings', title: 'System Settings', category: 'Navigation', icon: Settings, shortcut: 'G S', action: () => onNavigate?.('settings') },
    ...(isAdmin ? [{ id: 'admin', title: 'Admin & System Control Panel', category: 'Navigation', icon: Shield, shortcut: 'G P', action: () => onNavigate?.('admin-panel') }] : []),

    // Quick Actions
    { id: 'new-lead', title: 'Assign Customer to Lead', category: 'Quick Actions', icon: Plus, action: () => onNavigate?.('leads') },
    { id: 'new-whatsapp', title: 'Send WhatsApp Direct Message', category: 'Quick Actions', icon: MessageSquare, action: () => onNavigate?.('whatsapp') },
    { id: 'make-call', title: 'Open Softphone / Call Dialer', category: 'Quick Actions', icon: PhoneCall, action: () => onNavigate?.('call-history') },
    { id: 'theme-toggle', title: darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode', category: 'Quick Actions', icon: darkMode ? Sun : Moon, action: () => toggleDarkMode() },
  ];

  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query)
    );
  });

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredItems[selectedIndex];
      if (current) {
        current.action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-24 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-dark-900 rounded-2xl shadow-2xl border border-dark-200 dark:border-dark-700 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-dark-200 dark:border-dark-700 bg-dark-50/50 dark:bg-dark-800/40">
          <Search size={18} className="text-primary-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search pages, actions, commands... (Type to filter)"
            className="w-full bg-transparent border-0 text-sm font-medium text-dark-900 dark:text-white placeholder:text-dark-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-dark-400 hover:text-dark-700 dark:hover:text-dark-200 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-transparent">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-dark-400">
              No results found for &ldquo;<strong className="text-dark-700 dark:text-dark-200">{search}</strong>&rdquo;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300'
                      : 'text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-primary-600 text-white'
                          : 'bg-dark-100 dark:bg-dark-800 text-dark-500 dark:text-dark-400'
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-tight">{item.title}</p>
                      <p className="text-[10px] text-dark-400">{item.category}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.shortcut && (
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-dark-100 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-500">
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && <ArrowRight size={14} className="text-primary-600" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-dark-200 dark:border-dark-700 bg-dark-50/60 dark:bg-dark-800/40 flex items-center justify-between text-[11px] text-dark-400">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="font-mono text-[10px]">Smart CRM Command Hub</span>
        </div>
      </div>
    </div>
  );
}
