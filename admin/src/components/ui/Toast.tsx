import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toasts: Toast[] = [];
let toastId = 0;
let setToastsCallback: ((toasts: Toast[]) => void) | null = null;

export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  const toast: Toast = {
    id: ++toastId,
    message,
    type,
  };

  toasts = [...toasts, toast];
  setToastsCallback?.(toasts);

  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== toast.id);
    setToastsCallback?.(toasts);
  }, 3000);
};

export const Toaster: React.FC = () => {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setToastsCallback = setCurrentToasts;
    return () => {
      setToastsCallback = null;
    };
  }, []);

  const removeToast = (id: number) => {
    toasts = toasts.filter(t => t.id !== id);
    setCurrentToasts(toasts);
  };

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-cyan-500" />;
    }
  };

  const getToastColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-900 border-emerald-500';
      case 'error':
        return 'bg-red-900 border-red-500';
      default:
        return 'bg-cyan-900 border-cyan-500';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2" role="status" aria-live="polite" aria-atomic="true">
      {currentToasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 p-4 rounded-lg border ${getToastColor(toast.type)} text-white shadow-lg transition-all duration-300 max-w-sm`}
        >
          {getToastIcon(toast.type)}
          <span className="flex-1 text-sm">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
