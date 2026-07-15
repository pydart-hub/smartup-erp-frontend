"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Phone, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/formatters";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    name: string;
    grand_total: number;
  };
  defaultEmail: string;
  defaultPhone: string;
}

export function SendReceiptModal({ isOpen, onClose, invoice, defaultEmail, defaultPhone }: Props) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail(defaultEmail || "");
      setPhone(defaultPhone || "");
    }
  }, [isOpen, defaultEmail, defaultPhone]);

  const handleSend = async () => {
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedEmail) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payments/send-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoice.name,
          email: trimmedEmail,
          phone: trimmedPhone || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Failed to send receipt.");
        return;
      }

      toast.success(`Receipt successfully sent to ${data.recipient || trimmedEmail}`);
      onClose();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !loading && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-text-primary">
                  Send Invoice Receipt
                </h3>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Confirm recipient details for the latest paid invoice
                </p>
              </div>
              <button
                onClick={() => !loading && onClose()}
                className="text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-app-bg border border-border-light rounded-xl p-4 mb-5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-tertiary">Invoice ID</span>
                <span className="font-mono font-semibold text-text-primary">{invoice.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs mt-2">
                <span className="text-text-tertiary">Amount Paid</span>
                <span className="font-bold text-success">{formatCurrency(invoice.grand_total)}</span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Parent / Guardian Email
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-text-tertiary">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="parent@example.com"
                    disabled={loading}
                    className="w-full h-9 rounded-lg border border-border-input pl-9 pr-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-app-bg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Parent / Guardian Mobile (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-text-tertiary">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 99999 99999"
                    disabled={loading}
                    className="w-full h-9 rounded-lg border border-border-input pl-9 pr-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-app-bg"
                  />
                </div>
                <p className="text-[10px] text-text-tertiary mt-1">
                  If provided, a receipt message will also be sent via WhatsApp.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSend}
                disabled={loading}
                className="flex-1 gap-1.5"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Confirm & Send
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
