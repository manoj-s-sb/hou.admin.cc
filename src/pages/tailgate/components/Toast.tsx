import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'danger';
  onDismiss: () => void;
}

const Toast = ({ message, type, onDismiss }: ToastProps) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const bg = type === 'success' ? '#15803d' : '#b91c1c';
  const prefix = type === 'success' ? '✓' : '⚠';

  return (
    <div
      className="fixed bottom-7 right-7 z-[100] flex items-center gap-3 rounded-xl px-5 py-3.5 text-[13px] font-semibold text-white shadow-2xl"
      style={{ background: bg }}
    >
      <span>{prefix} {message}</span>
      <button
        className="ml-2 text-white/70 hover:text-white"
        type="button"
        onClick={onDismiss}
      >
        ✕
      </button>
    </div>
  );
};

export default Toast;
