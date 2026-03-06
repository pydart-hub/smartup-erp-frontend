"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw, IndianRupee, BookOpen } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getFeeStructure } from "@/lib/api/fees";
import { formatCurrency } from "@/lib/utils/formatters";
import type { FeeStructure } from "@/lib/types/fee";

interface FeeComponentFull {
  fees_category: string;
  item?: string;
  amount: number;
  discount?: number;
  total?: number;
}

export default function FeeStructureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const decodedId = decodeURIComponent(id);

  const [structure, setStructure] = useState<FeeStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    getFeeStructure(decodedId)
      .then((res) => setStructure(res.data))
      .catch(() => setError("Failed to load fee structure details."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [decodedId]);

  const components = (structure?.components ?? []) as FeeComponentFull[];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Back */}
      <Link
        href="/dashboard/branch-manager/fees/structure"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Fee Structures
      </Link>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <p className="text-error text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={load}>Retry</Button>
        </div>
      )}

      {structure && !loading && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{structure.name}</h1>
              <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-text-secondary">
                {structure.program && (
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {structure.program}
                  </span>
                )}
                {structure.academic_year && (
                  <Badge variant="outline">{structure.academic_year}</Badge>
                )}
                {structure.academic_term && (
                  <Badge variant="outline">{structure.academic_term}</Badge>
                )}
              </div>
            </div>
            <Button variant="outline" size="md" onClick={load} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-text-secondary">Total Fee</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {formatCurrency(structure.total_amount)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-text-secondary">Components</p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  {components.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-text-secondary">Receivable Account</p>
                <p className="text-sm font-semibold text-text-primary mt-1 truncate">
                  {structure.receivable_account || "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Components table */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-primary" />
                <CardTitle>Fee Components</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {components.length === 0 ? (
                <p className="text-center text-text-secondary text-sm py-8">
                  No components defined.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-light">
                        <th className="text-left pb-3 font-semibold text-text-secondary w-8">#</th>
                        <th className="text-left pb-3 font-semibold text-text-secondary">Fee Category</th>
                        <th className="text-right pb-3 font-semibold text-text-secondary">Amount</th>
                        <th className="text-right pb-3 font-semibold text-text-secondary">Discount</th>
                        <th className="text-right pb-3 font-semibold text-text-secondary">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {components.map((c, i) => (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.04 }}
                          className="border-b border-border-light hover:bg-brand-wash/30 transition-colors"
                        >
                          <td className="py-3 text-text-tertiary">{i + 1}</td>
                          <td className="py-3 font-medium text-text-primary">
                            {c.fees_category}
                            {c.item && c.item !== c.fees_category && (
                              <span className="ml-1.5 text-xs text-text-tertiary">({c.item})</span>
                            )}
                          </td>
                          <td className="py-3 text-right text-text-secondary">
                            {formatCurrency(c.amount)}
                          </td>
                          <td className="py-3 text-right text-text-secondary">
                            {c.discount ? formatCurrency(c.discount) : "—"}
                          </td>
                          <td className="py-3 text-right font-semibold text-text-primary">
                            {formatCurrency(c.total ?? c.amount)}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border-light">
                        <td colSpan={4} className="pt-3 font-bold text-text-primary text-right pr-4">
                          Grand Total
                        </td>
                        <td className="pt-3 text-right font-bold text-primary text-base">
                          {formatCurrency(structure.total_amount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </motion.div>
  );
}
