'use client';

import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Bestätigen',
  cancelText = 'Abbrechen',
  type = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const colors = {
    danger: 'border-red-500/30 bg-red-500/10',
    warning: 'border-yellow-500/30 bg-yellow-500/10',
    info: 'border-blue-500/30 bg-blue-500/10',
  };

  const buttonColors = {
    danger: 'bg-red-600 hover:bg-red-500 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-500 text-white',
    info: 'bg-blue-600 hover:bg-blue-500 text-white',
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[99] backdrop-blur-sm animate-in fade-in-0"
        onClick={onCancel}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-md animate-in zoom-in-95 fade-in-0">
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
          <div className={`px-4 py-3 border-b ${colors[type]}`}>
            <div className="flex items-center gap-3">
              <AlertTriangle
                className={`w-5 h-5 ${
                  type === 'danger'
                    ? 'text-red-400'
                    : type === 'warning'
                      ? 'text-yellow-400'
                      : 'text-blue-400'
                }`}
              />
              <h3 className="font-semibold text-slate-200">{title}</h3>
            </div>
          </div>
          <div className="px-4 py-4">
            <p className="text-sm text-slate-300">{message}</p>
          </div>
          <div className="px-4 py-3 bg-slate-800/50 border-t border-slate-700 flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-slate-200 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${buttonColors[type]}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
