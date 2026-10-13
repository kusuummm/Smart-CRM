import { useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';

export function useToast() {
  const addToast = useCallback((message, type = 'success') => {
    if (!message) return;
    const msgStr = String(message).toLowerCase().trim();
    // Suppress filter/view/tab click notifications that spam the top right corner
    if (
      msgStr.startsWith('filtered') ||
      msgStr.startsWith('showing all') ||
      msgStr.startsWith('filter by') ||
      msgStr.startsWith('sort/filter') ||
      msgStr.includes('filter reset') ||
      msgStr.includes('filters reset') ||
      msgStr.includes('period reset') ||
      msgStr.includes('date filter reset') ||
      msgStr.includes('filters cleared')
    ) {
      return;
    }

    switch (type) {
      case 'success': toast.success(message); break;
      case 'error': toast.error(message); break;
      case 'warning': toast(message, { icon: '⚠️' }); break;
      default: toast(message); break;
    }
  }, []);

  return useMemo(() => ({ addToast }), [addToast]);
}
