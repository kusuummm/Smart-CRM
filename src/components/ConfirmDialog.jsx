import { useEffect } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmation Required',
  message = 'Are you sure you want to proceed with this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning', // 'danger' | 'warning' | 'primary' | 'info'
  icon = null,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const colorStyles = {
    danger: {
      badge: 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
      btn: 'bg-rose-600 hover:bg-rose-700 text-white',
      icon: AlertTriangle,
    },
    warning: {
      badge: 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white',
      icon: AlertCircle,
    },
    primary: {
      badge: 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
      btn: 'bg-blue-600 hover:bg-blue-700 text-white',
      icon: CheckCircle2,
    },
    info: {
      badge: 'bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400',
      btn: 'bg-sky-600 hover:bg-sky-700 text-white',
      icon: Info,
    },
  };

  const style = colorStyles[type] || colorStyles.warning;
  const IconComponent = icon || style.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white dark:bg-dark-900 rounded-lg shadow-xl w-full max-w-md p-6 border border-[#d9d9d9] dark:border-dark-700 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${style.badge}`}>
              <IconComponent size={20} />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[rgba(0,0,0,0.88)] dark:text-white">
                {title}
              </h3>
              <span className="text-[12px] font-normal text-[rgba(0,0,0,0.45)] dark:text-dark-400 uppercase tracking-wider">
                Action Confirmation
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[rgba(0,0,0,0.45)] dark:text-dark-400 hover:text-[rgba(0,0,0,0.88)] dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="text-[14px] text-[rgba(0,0,0,0.88)] dark:text-dark-300 leading-relaxed bg-[#fafafa] dark:bg-dark-800/60 p-3.5 rounded-md border border-[#f0f0f0] dark:border-dark-700/60 font-normal">
          {message}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-[14px] font-normal text-[rgba(0,0,0,0.88)] dark:text-dark-300 border border-[#d9d9d9] dark:border-dark-700 hover:bg-dark-50 dark:bg-dark-800 dark:hover:bg-dark-700 transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm?.();
              onClose();
            }}
            className={`px-4 py-1.5 rounded-md text-[14px] font-normal shadow-xs transition-all cursor-pointer ${style.btn}`}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
