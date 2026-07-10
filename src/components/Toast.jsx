import { toast } from 'react-hot-toast';

export function useToast() {
  const addToast = (message, type = 'success') => {
    switch (type) {
      case 'success': toast.success(message); break;
      case 'error': toast.error(message); break;
      case 'warning': toast(message, { icon: '⚠️' }); break;
      default: toast(message); break;
    }
  };
  return { addToast };
}
