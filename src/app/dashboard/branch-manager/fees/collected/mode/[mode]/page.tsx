"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  IndianRupee,
  Hash,
  Banknote,
  Smartphone,
  Landmark,
  FileText,
  Wifi,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/formatters";
import { useAuth } from "@/lib/hooks/useAuth";

interface PaymentRow {
  name: string;
  party_name: string;
  paid_amount: number;
  posting_date: string;
  reference_no: string;
  mode_of_payment: string;
}

const MODE_ICONS: Record<string, React.ReactNode> = {
  Cash:            <Banknote className="h-3.5 w-3.5" />,
  UPI:             <Smartphone className="h-3.5 w-3.5" />,
  "Bank Transfer": <Landmark className="h-3.5 w-3.5" />,
  Cheque:          <FileText className="h-3.5 w-3.5" />,
  Online:          <Wifi className="h-3.5 w-3.5" />,
};

export default function ModeDetailPage() {
  const params = useParams();
  const mode = decodeURIComponent(params.mode as string);
  const { defaultCompany } = useAuth();

  const [entries, setEntries] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ mode });
    if (defaultCompany) qs.set("company", defaultCompany);

    fetch(`/api/fees/collected-by-mode?${qs}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Failed to load");
        return r.json();
      })
      .then((data) => {
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [mode, defaultCompany]);

  const icon = MODE_ICONS[mode] ?? <Banknote className="h-3.5 w-3.5" />;

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Link href="/dashboard/branch-manager/fees/collected">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {mode} Payments
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            All payments received via {mode}
          </p>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-error">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-semibold">Failed to load data</p>
            <p className="text-sm mt-1 text-text-secondary">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <Card className="border-l-4 border-l-success">
              <CardContent className="py-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-text-tertiary font-medium uppercase tracking-wide">
                    Total {mode}
                  </p>
                  <p className="text-xl font-bold text-text-primary">
                    {formatCurrency(total)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-info">
              <CardContent className="py-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
                  <Hash className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-xs text-text-tertiary font-medium uppercase tracking-wide">
                    Entries
                  </p>
                  <p className="text-xl font-bold text-text-primary">
                    {entries.length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payments Table */}
          {entries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-text-secondary">
                No {mode} payments found.
              </CardContent>
            </Card>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-light bg-app-bg">
                          <th className="text-left px-4 py-3 font-semibold text-text-secondary">Student</th>
                          <th className="text-right px-4 py-3 font-semibold text-text-secondary">Amount</th>
                          <th className="text-left px-4 py-3 font-semibold text-text-secondary">Date</th>
                          <th className="text-left px-4 py-3 font-semibold text-text-secondary">Reference No</th>
                          <th className="text-left px-4 py-3 font-semibold text-text-secondary">Entry</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((pe, idx) => (
                          <motion.tr
                            key={pe.name}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.02 }}
                            className="border-b border-border-light last:border-0 hover:bg-brand-wash/30 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <p className="font-medium text-text-primary">{pe.party_name}</p>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-bold text-success">
                                {formatCurrency(pe.paid_amount)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-text-secondary">
                              {new Date(pe.posting_date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="px-4 py-3">
                              {pe.reference_no ? (
                                <span className="text-xs font-mono text-text-secondary bg-app-bg px-2 py-0.5 rounded">
                                  {pe.reference_no}
                                </span>
                              ) : (
                                <span className="text-text-tertiary">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-[10px] gap-1">
                                {icon} {pe.name}
                              </Badge>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
