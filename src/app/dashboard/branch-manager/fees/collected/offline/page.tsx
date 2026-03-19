"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  IndianRupee,
  Hash,
  Loader2,
  AlertTriangle,
  Banknote,
  Smartphone,
  Landmark,
  FileText,
  CreditCard,
  ArrowLeftRight,
  Receipt,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/formatters";
import { useAuth } from "@/lib/hooks/useAuth";

const MODE_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; border: string }
> = {
  Cash: {
    icon: <Banknote className="h-5 w-5" />,
    color: "text-green-600 bg-green-50",
    border: "border-l-green-500",
  },
  UPI: {
    icon: <Smartphone className="h-5 w-5" />,
    color: "text-violet-600 bg-violet-50",
    border: "border-l-violet-500",
  },
  "Bank Transfer": {
    icon: <Landmark className="h-5 w-5" />,
    color: "text-blue-600 bg-blue-50",
    border: "border-l-blue-500",
  },
  Cheque: {
    icon: <FileText className="h-5 w-5" />,
    color: "text-amber-600 bg-amber-50",
    border: "border-l-amber-500",
  },
  "Credit Card": {
    icon: <CreditCard className="h-5 w-5" />,
    color: "text-rose-600 bg-rose-50",
    border: "border-l-rose-500",
  },
  "Wire Transfer": {
    icon: <ArrowLeftRight className="h-5 w-5" />,
    color: "text-cyan-600 bg-cyan-50",
    border: "border-l-cyan-500",
  },
  "Bank Draft": {
    icon: <Receipt className="h-5 w-5" />,
    color: "text-teal-600 bg-teal-50",
    border: "border-l-teal-500",
  },
};

const DEFAULT_CFG = {
  icon: <Banknote className="h-5 w-5" />,
  color: "text-gray-600 bg-gray-50",
  border: "border-l-gray-500",
};

const MODE_ORDER = [
  "Cash",
  "UPI",
  "Bank Transfer",
  "Cheque",
  "Credit Card",
  "Wire Transfer",
  "Bank Draft",
];

export default function OfflineBreakdownPage() {
  const { defaultCompany } = useAuth();
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [offlineTotal, setOfflineTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(
      `/api/fees/collected-summary${defaultCompany ? `?company=${encodeURIComponent(defaultCompany)}` : ""}`,
      { credentials: "include" },
    )
      .then(async (r) => {
        if (!r.ok)
          throw new Error(
            (await r.json().catch(() => ({}))).error || "Failed to load",
          );
        return r.json();
      })
      .then((data) => {
        setBreakdown(data.offline_breakdown ?? {});
        setOfflineTotal(data.offline_total ?? 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [defaultCompany]);

  // Show modes with amounts first (in order), then any extras
  const modesWithValue = MODE_ORDER.filter((m) => (breakdown[m] ?? 0) > 0).concat(
    Object.keys(breakdown).filter(
      (m) => !MODE_ORDER.includes(m) && breakdown[m] > 0,
    ),
  );
  const modesWithoutValue = MODE_ORDER.filter(
    (m) => !modesWithValue.includes(m),
  );
  const allModes = [...modesWithValue, ...modesWithoutValue];

  const modeCount = modesWithValue.length;

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
            Offline Payments
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Breakdown by payment method
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
                    Total Offline
                  </p>
                  <p className="text-xl font-bold text-text-primary">
                    {formatCurrency(offlineTotal)}
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
                    Active Methods
                  </p>
                  <p className="text-xl font-bold text-text-primary">
                    {modeCount}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Mode cards grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {allModes.map((mode, idx) => {
              const cfg = MODE_CONFIG[mode] ?? DEFAULT_CFG;
              const amount = breakdown[mode] ?? 0;
              const hasValue = amount > 0;

              return (
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  {hasValue ? (
                    <Link
                      href={`/dashboard/branch-manager/fees/collected/mode/${encodeURIComponent(mode)}`}
                    >
                      <Card
                        className={`border-l-4 ${cfg.border} cursor-pointer hover:shadow-md transition-all group`}
                      >
                        <CardContent className="py-5">
                          <div className="flex items-center gap-2 mb-3">
                            <div
                              className={`h-9 w-9 rounded-lg flex items-center justify-center ${cfg.color}`}
                            >
                              {cfg.icon}
                            </div>
                            <span className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                              {mode}
                            </span>
                          </div>
                          <p className="text-xl font-bold text-text-primary">
                            {formatCurrency(amount)}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ) : (
                    <Card className="border-l-4 border-l-gray-200 opacity-50">
                      <CardContent className="py-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-gray-50 text-gray-400">
                            {cfg.icon}
                          </div>
                          <span className="text-sm font-medium text-text-tertiary">
                            {mode}
                          </span>
                        </div>
                        <p className="text-xl font-bold text-text-tertiary">
                          {formatCurrency(0)}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
