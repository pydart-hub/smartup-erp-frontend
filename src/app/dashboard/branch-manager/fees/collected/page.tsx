"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  Users,
  IndianRupee,
  Loader2,
  AlertTriangle,
  Search,
  Banknote,
  Smartphone,
  Landmark,
  FileText,
  Wifi,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils/formatters";
import { useAuth } from "@/lib/hooks/useAuth";

interface ClassCollected {
  item_code: string;
  student_count: number;
  total_collected: number;
}

const MODE_CONFIG: Record<string, { icon: React.ReactNode; color: string; border: string }> = {
  Cash:            { icon: <Banknote className="h-5 w-5" />,    color: "text-green-600 bg-green-50",   border: "border-l-green-500" },
  UPI:             { icon: <Smartphone className="h-5 w-5" />,  color: "text-violet-600 bg-violet-50", border: "border-l-violet-500" },
  "Bank Transfer": { icon: <Landmark className="h-5 w-5" />,    color: "text-blue-600 bg-blue-50",     border: "border-l-blue-500" },
  Cheque:          { icon: <FileText className="h-5 w-5" />,    color: "text-amber-600 bg-amber-50",   border: "border-l-amber-500" },
  Online:          { icon: <Wifi className="h-5 w-5" />,        color: "text-indigo-600 bg-indigo-50", border: "border-l-indigo-500" },
};

export default function CollectedFeesPage() {
  const { defaultCompany } = useAuth();
  const [byClass, setByClass] = useState<ClassCollected[]>([]);
  const [byMode, setByMode] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(
      `/api/fees/collected-summary${defaultCompany ? `?company=${encodeURIComponent(defaultCompany)}` : ""}`,
      { credentials: "include" },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Failed to load");
        return r.json();
      })
      .then((data) => {
        setByClass(data.by_class ?? []);
        setByMode(data.by_mode ?? {});
        setTotal(data.total ?? 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [defaultCompany]);

  const totalStudents = useMemo(
    () => byClass.reduce((s, c) => s + c.student_count, 0),
    [byClass],
  );

  const filtered = useMemo(() => {
    if (!search) return byClass;
    const q = search.toLowerCase();
    return byClass.filter((c) => c.item_code.toLowerCase().includes(q));
  }, [byClass, search]);

  // Sort modes: show ones with value first, in a fixed order
  const modeOrder = ["Cash", "UPI", "Bank Transfer", "Cheque", "Online"];
  const sortedModes = modeOrder
    .filter((m) => (byMode[m] ?? 0) > 0)
    .concat(Object.keys(byMode).filter((m) => !modeOrder.includes(m) && byMode[m] > 0));

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Link href="/dashboard/branch-manager/fees">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Collected Payments
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Class-wise and mode-wise collection breakdown
            </p>
          </div>
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
          {/* Summary strip */}
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
                    Total Collected
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
                  <Users className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-xs text-text-tertiary font-medium uppercase tracking-wide">
                    Students Paid
                  </p>
                  <p className="text-xl font-bold text-text-primary">
                    {totalStudents}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Mode-wise breakdown cards */}
          {sortedModes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">
                By Payment Method
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {sortedModes.map((mode) => {
                  const cfg = MODE_CONFIG[mode] ?? MODE_CONFIG.Cash;
                  return (
                    <Link
                      key={mode}
                      href={`/dashboard/branch-manager/fees/collected/mode/${encodeURIComponent(mode)}`}
                    >
                      <Card className={`border-l-4 ${cfg.border} cursor-pointer hover:shadow-md transition-all group`}>
                        <CardContent className="py-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${cfg.color}`}>
                              {cfg.icon}
                            </div>
                            <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">{mode}</span>
                          </div>
                          <p className="text-lg font-bold text-text-primary">
                            {formatCurrency(byMode[mode])}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Search */}
          <div>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search class..."
                className="pl-9"
              />
            </div>
          </div>

          {/* Class-wise collected table */}
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-text-secondary">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-text-tertiary" />
                No collected payments found.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((cls, idx) => (
                <motion.div
                  key={cls.item_code}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Link href={`/dashboard/branch-manager/fees/collected/class/${encodeURIComponent(cls.item_code)}?name=${encodeURIComponent(cls.item_code)}`}>
                  <Card className="hover:shadow-md hover:border-success/30 transition-all cursor-pointer">
                    <CardContent className="py-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                            <GraduationCap className="h-5 w-5 text-success" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-text-primary">
                              {cls.item_code}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Users className="h-3 w-3 text-text-tertiary" />
                              <span className="text-xs text-text-tertiary">
                                {cls.student_count} student{cls.student_count !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border-light">
                        <span className="text-xs font-medium text-text-tertiary uppercase">
                          Collected
                        </span>
                        <span className="text-lg font-bold text-success">
                          {formatCurrency(cls.total_collected)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
