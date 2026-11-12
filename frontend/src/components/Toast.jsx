import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, toast.duration || 4500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const typeConfig = {
    success: {
      icon: CheckCircle2,
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-950/80',
      text: 'text-emerald-300',
      iconColor: 'text-emerald-400',
    },
    error: {
      icon: AlertCircle,
      border: 'border-rose-500/40',
      bg: 'bg-rose-950/80',
      text: 'text-rose-300',
      iconColor: 'text-rose-400',
    },
    info: {
      icon: Info,
      border: 'border-purple-500/40',
      bg: 'bg-purple-950/80',
      text: 'text-purple-300',
      iconColor: 'text-purple-400',
    },
  }[toast.type || 'info'];

  const Icon = typeConfig.icon;

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl backdrop-blur-xl border ${typeConfig.border} ${typeConfig.bg} shadow-2xl transition-all duration-300 transform translate-y-0 opacity-100`}
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${typeConfig.iconColor}`} />
      <div className="flex-1 text-sm">
        {toast.title && <div className="font-semibold text-white mb-0.5">{toast.title}</div>}
        <div className={typeConfig.text}>{toast.message}</div>
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
