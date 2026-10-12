import { useEffect } from 'react';
import { LogOut, X, AlertTriangle, Loader2 } from 'lucide-react';

export default function LogoutModal({
  isOpen,
  onClose,
  onConfirm,
  user,
  isLoading = false,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={isLoading ? undefined : onClose}
      />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        className="relative bg-white dark:bg-dark-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-dark-200 dark:border-dark-700 space-y-5 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header: Icon, Titles, Close Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0 border border-red-100 dark:border-red-900/40 shadow-2xs">
              <LogOut size={22} className="translate-x-0.5" />
            </div>
            <div>
              <h3
                id="logout-modal-title"
                className="text-base font-bold text-dark-900 dark:text-white"
              >
                Log Out of Smart CRM?
              </h3>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                Confirm ending your current session
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-dark-400 hover:text-dark-700 dark:hover:text-white hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Info & Confirmation Message */}
        <div className="space-y-3">
          {user && (
            <div className="p-3 rounded-xl bg-dark-50 dark:bg-dark-800/60 border border-dark-100 dark:border-dark-700/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs">
                {user.avatar || (user.name ? user.name[0].toUpperCase() : 'U')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-dark-900 dark:text-white truncate">
                  {user.name || 'Current User'}
                </p>
                <p className="text-[11px] text-dark-500 dark:text-dark-400 truncate">
                  {user.email || ''}
                </p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {user.role || 'User'}
              </span>
            </div>
          )}

          <div className="text-xs sm:text-sm text-dark-600 dark:text-dark-300 leading-relaxed bg-amber-50/70 dark:bg-amber-950/20 p-3.5 rounded-xl border border-amber-200/60 dark:border-amber-900/30 flex items-start gap-2.5">
            <AlertTriangle
              size={16}
              className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
            />
            <p className="text-xs text-amber-900 dark:text-amber-200">
              Are you sure you want to log out? You will need to enter your email and password again to sign back in.
            </p>
          </div>
        </div>

        {/* Footer Actions: Cancel and Logout Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-dark-700 dark:text-dark-200 border border-dark-200 dark:border-dark-700 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Logging out...</span>
              </>
            ) : (
              <>
                <LogOut size={14} />
                <span>Logout</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
