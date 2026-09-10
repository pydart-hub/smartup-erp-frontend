"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Phone, Loader2, Send, FileText, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/formatters";

export interface ReceiptItemOption {
  type: "invoice" | "payment";
  id: string;
  amount: number;
  date?: string;
  mode?: string;
  label?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Fallback single invoice if availableItems is not provided */
  invoice?: {
    name: string;
    grand_total: number;
  };
  availableItems?: ReceiptItemOption[];
  initialSelectedItem?: {
    type: "invoice" | "payment";
    id: string;
  };
  defaultEmail: string;
  defaultPhone: string;
}

export function SendReceiptModal({
  isOpen,
  onClose,
  invoice,
  availableItems = [],
  initialSelectedItem,
  defaultEmail,
  defaultPhone,
}: Props) {
  // Build unified item list
  const items: ReceiptItemOption[] = React.useMemo(() => {
    if (availableItems.length > 0) return availableItems;
    if (invoice) {
      return [
        {
          type: "invoice",
          id: invoice.name,
          amount: invoice.grand_total,
        },
      ];
    }
    return [];
  }, [availableItems, invoice]);

  const [selectedKey, setSelectedKey] = useState<string>("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsapp, setSendWhatsapp] = useState(true);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail(defaultEmail || "");
      setPhone(defaultPhone || "");
      setSendEmail(true);
      setSendWhatsapp(Boolean(defaultPhone));

      if (initialSelectedItem) {
        setSelectedKey(`${initialSelectedItem.type}:${initialSelectedItem.id}`);
      } else if (items.length > 0) {
        setSelectedKey(`${items[0].type}:${items[0].id}`);
      }
    }
  }, [isOpen, defaultEmail, defaultPhone, initialSelectedItem, items]);

  const selectedItem = items.find((it) => `${it.type}:${it.id}` === selectedKey) || items[0];

  const handleSend = async () => {
    if (!selectedItem) {
      toast.error("Please select an invoice or payment entry.");
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!sendEmail && !sendWhatsapp) {
      toast.error("Please select at least one channel (Email or WhatsApp).");
      return;
    }

    if (sendEmail && !trimmedEmail) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (sendWhatsapp && !trimmedPhone) {
      toast.error("Please enter a valid mobile number for WhatsApp.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payments/send-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: selectedItem.type === "invoice" ? selectedItem.id : undefined,
          payment_entry_id: selectedItem.type === "payment" ? selectedItem.id : undefined,
          send_email: sendEmail,
          send_whatsapp: sendWhatsapp,
          email: trimmedEmail || undefined,
          phone: trimmedPhone || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Failed to send receipt.");
        return;
      }

      if (data.emailSent && data.whatsappSent) {
        toast.success(`Receipt sent via Email & WhatsApp!`);
      } else if (data.emailSent) {
        toast.success(`Receipt sent via Email to ${data.recipient || trimmedEmail}`);
      } else if (data.whatsappSent) {
        toast.success(`Receipt sent via WhatsApp to ${data.recipientPhone || trimmedPhone}`);
      } else {
        toast.success(`Receipt request processed`);
      }
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
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-text-primary">
                  Send Payment Receipt
                </h3>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Select a paid invoice or payment entry to dispatch via Email / WhatsApp
                </p>
              </div>
              <button
                onClick={() => !loading && onClose()}
                className="text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Document Selection */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Select Paid Document
              </label>
              {items.length > 1 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 border border-border-light rounded-xl p-2 bg-app-bg">
                  {items.map((item) => {
                    const key = `${item.type}:${item.id}`;
                    const isSelected = selectedKey === key;
                    return (
                      <div
                        key={key}
                        onClick={() => setSelectedKey(key)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-xs transition-all ${
                          isSelected
                            ? "bg-white border-primary shadow-xs"
                            : "bg-surface/50 border-border-light hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="radio"
                            name="receipt_doc"
                            checked={isSelected}
                            onChange={() => setSelectedKey(key)}
                            className="text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <div className="min-w-0">
                            <p className="font-mono font-medium text-text-primary truncate">
                              {item.id}
                            </p>
                            <p className="text-[10px] text-text-tertiary">
                              {item.type === "invoice" ? "Sales Invoice" : "Payment Entry"}
                              {item.date ? ` • ${item.date}` : ""}
                              {item.mode ? ` • ${item.mode}` : ""}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-success ml-2 shrink-0">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : selectedItem ? (
                <div className="bg-app-bg border border-border-light rounded-xl p-3.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-tertiary flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      {selectedItem.type === "invoice" ? "Sales Invoice" : "Payment Entry"}
                    </span>
                    <span className="font-mono font-semibold text-text-primary">
                      {selectedItem.id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-border-light">
                    <span className="text-text-tertiary">Amount Paid</span>
                    <span className="font-bold text-success">
                      {formatCurrency(selectedItem.amount)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-tertiary">No paid records found.</p>
              )}
            </div>

            {/* Channel Options */}
            <div className="space-y-4 mb-6">
              <div className="border border-border-light rounded-xl p-3 bg-slate-50/50 space-y-3">
                <p className="text-xs font-semibold text-text-secondary">Dispatch Channels</p>

                {/* Email Option */}
                <div>
                  <label
                    onClick={() => setSendEmail(!sendEmail)}
                    className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-primary select-none mb-1.5"
                  >
                    {sendEmail ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-text-tertiary" />
                    )}
                    Send via Email (with PDF attachment)
                  </label>

                  {sendEmail && (
                    <div className="relative pl-6">
                      <span className="absolute left-9 top-2.5 text-text-tertiary">
                        <Mail className="h-3.5 w-3.5" />
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="parent@example.com"
                        disabled={loading}
                        className="w-full h-8 rounded-lg border border-border-input pl-8 pr-3 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-app-bg"
                      />
                    </div>
                  )}
                </div>

                {/* WhatsApp Option */}
                <div>
                  <label
                    onClick={() => setSendWhatsapp(!sendWhatsapp)}
                    className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-primary select-none mb-1.5"
                  >
                    {sendWhatsapp ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-text-tertiary" />
                    )}
                    Send via WhatsApp (Meta verified template)
                  </label>

                  {sendWhatsapp && (
                    <div className="relative pl-6">
                      <span className="absolute left-9 top-2.5 text-text-tertiary">
                        <Phone className="h-3.5 w-3.5" />
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 99999 99999"
                        disabled={loading}
                        className="w-full h-8 rounded-lg border border-border-input pl-8 pr-3 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-app-bg"
                      />
                    </div>
                  )}
                </div>
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
                disabled={loading || !selectedItem || (!sendEmail && !sendWhatsapp)}
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
