"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  IndianRupee,
  Users,
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

interface StudentRow {
  customer: string;
  customer_name: string;
  total_paid: number;
  total_invoiced: number;
  last_mode: string;
  last_date: string;
  last_reference: string;
}

const MODE_ICONS: Record<string, React.ReactNode> = {
  Cash:            <Banknote className="h-3 w-3" />,
  UPI:             <Smartphone className="h-3 w-3" />,
  "Bank Transfer": <Landmark className="h-3 w-3" />,
  Cheque:          <FileText className="h-3 w-3" />,
  Online:          <Wifi className="h-3 w-3" />,
};

export default function ClassDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const itemCode = decodeURIComponent(params.itemCode as string);
  const className = searchParams.get("name") || itemCode;
  const { defaultCompany } = useAuth();

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [totalCollected, setTotalCollected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ item_code: itemCode });
    if (defaultCompany) qs.set("company", defaultCompany);

    fetch(`/api/fees/collected-by-class?${qs}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Failed to load");
        return r.json();
      })
      .then((data) => {
        setStudents(data.students ?? []);
        setTotalCollected(data.total_collected ?? 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [itemCode, defaultCompany]);

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
          <h1 className="text-2xl font-bold text-text-primary">{className}</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Student-wise collected payments
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
                    {formatCurrency(totalCollected)}
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
                    {students.length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Student Table */}
          {students.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-text-secondary">
                No payments found for this class.
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
                          <th className="text-right px-4 py-3 font-semibold text-text-secondary">Total Paid</th>
                          <th className="text-right px-4 py-3 font-semibold text-text-secondary">Invoiced</th>
                          <th className="text-left px-4 py-3 font-semibold text-text-secondary">Last Mode</th>
                          <th className="text-left px-4 py-3 font-semibold text-text-secondary">Last Date</th>
                          <th className="text-left px-4 py-3 font-semibold text-text-secondary">Last Ref</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s, idx) => (
                          <motion.tr
                            key={s.customer}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.02 }}
                            className="border-b border-border-light last:border-0 hover:bg-brand-wash/30 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <p className="font-medium text-text-primary">{s.customer_name}</p>
                              <p className="text-xs text-text-tertiary">{s.customer}</p>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-bold text-success">
                                {formatCurrency(s.total_paid)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-text-secondary">
                              {formatCurrency(s.total_invoiced)}
                            </td>
                            <td className="px-4 py-3">
                              {s.last_mode ? (
                                <Badge variant="outline" className="text-[10px] gap-1">
                                  {MODE_ICONS[s.last_mode] ?? null} {s.last_mode}
                                </Badge>
                              ) : (
                                <span className="text-text-tertiary">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-text-secondary">
                              {s.last_date
                                ? new Date(s.last_date).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </td>
                            <td className="px-4 py-3">
                              {s.last_reference ? (
                                <span className="text-xs font-mono text-text-secondary bg-app-bg px-2 py-0.5 rounded">
                                  {s.last_reference}
                                </span>
                              ) : (
                                <span className="text-text-tertiary">—</span>
                              )}
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
