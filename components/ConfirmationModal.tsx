'use client';

import { useEffect } from 'react';

type Props = {
  open: boolean;
  message: string;
  confirmText: string;
  cancelText: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export default function ConfirmationModal({
  open,
  message,
  confirmText,
  cancelText,
  loading = false,
  onConfirm,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (!loading) onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, loading]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] pointer-events-auto flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={() => {
        if (!loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-lg bg-white border border-gray-200 shadow-xl p-4 text-gray-900 dark:bg-[#252525] dark:border-[#3f3f3f] dark:text-[#f0efed]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base font-semibold">{message}</p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="w-full rounded-md border border-[#e56458] px-3 py-2 text-sm font-medium text-[#e56458] transition-colors hover:bg-[#e56458]/10 disabled:opacity-60 dark:hover:bg-[#e56458]/15"
          >
            {confirmText}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full rounded-md border border-[#f0efed] px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-[#f0efed] disabled:opacity-60 dark:border-[#3f3f3f] dark:text-[#f0efed] dark:hover:bg-[#3f3f3f]"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}

