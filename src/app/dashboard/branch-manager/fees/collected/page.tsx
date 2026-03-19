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

export default function CollectedFeesPage() {
  const { defaultCompany } = useAuth();
  const [byClass, setByClass] = useState<ClassCollected[]>([]);
  const [offlineTotal, setOfflineTotal] = useState(0);
  const [razorpayTotal, setRazorpayTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [studentsPaid, setStudentsPaid] = useState(0);
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
        setOfflineTotal(data.offline_total ?? 0);
        setRazorpayTotal(data.razorpay_total ?? 0);
        setTotal(data.total ?? 0);
        setStudentsPaid(data.students_paid ?? 0);
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
                    {studentsPaid}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payment Type: Offline & Razorpay */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">
              By Payment Method
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/dashboard/branch-manager/fees/collected/offline">
                <Card className="border-l-4 border-l-green-500 cursor-pointer hover:shadow-md transition-all group">
                  <CardContent className="py-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
                        <Banknote className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-text-primary group-hover:text-green-700 transition-colors">
                          Offline
                        </p>
                        <p className="text-xs text-text-tertiary">
                          Cash, UPI, Cheque, Bank Transfer &amp; more
                        </p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-text-primary">
                      {formatCurrency(offlineTotal)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/dashboard/branch-manager/fees/collected/mode/Online">
                <Card className="border-l-4 border-l-indigo-500 cursor-pointer hover:shadow-md transition-all group">
                  <CardContent className="py-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <Wifi className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-text-primary group-hover:text-indigo-700 transition-colors">
                          Razorpay
                        </p>
                        <p className="text-xs text-text-tertiary">
                          Online payments via Razorpay gateway
                        </p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-text-primary">
                      {formatCurrency(razorpayTotal)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </motion.div>

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
