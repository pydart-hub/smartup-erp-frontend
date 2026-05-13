"use client";

import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel, loading]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={!loading ? onCancel : undefined}
          />

          {/* Dialog panel */}
          <motion.div
            className="relative z-10 w-full max-w-[400px] rounded-2xl bg-white shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.8 }}
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              disabled={loading}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Body */}
            <div className="flex flex-col items-center text-center px-8 pt-10 pb-7 gap-4">
              {/* Animated icon ring */}
              <motion.div
                className="w-16 h-16 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 20, delay: 0.05 }}
              >
                <AlertTriangle className="h-7 w-7 text-red-500" strokeWidth={2.2} />
              </motion.div>

              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.2 }}
              >
                <h2 className="text-[15px] font-semibold text-gray-900 leading-tight">{title}</h2>
                <p className="text-sm text-gray-500 leading-relaxed max-w-[280px] mx-auto">{message}</p>
              </motion.div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100" />

            {/* Actions */}
            <motion.div
              className="grid grid-cols-2 gap-3 px-6 py-5"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.2 }}
            >
              <Button
                variant="outline"
                className="w-full h-10"
                onClick={onCancel}
                disabled={loading}
              >
                {cancelLabel}
              </Button>
              <Button
                variant="danger"
                className="w-full h-10"
                onClick={onConfirm}
                loading={loading}
              >
                {loading ? "Deleting…" : confirmLabel}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
