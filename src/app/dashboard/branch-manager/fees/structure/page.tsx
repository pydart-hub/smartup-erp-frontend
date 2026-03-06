"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, FileText, Loader2, RefreshCw, Search, IndianRupee } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getFeeStructures } from "@/lib/api/fees";
import { getAcademicYears } from "@/lib/api/enrollment";
import { formatCurrency } from "@/lib/utils/formatters";
import { useAcademicYearStore } from "@/lib/stores/academicYearStore";
import type { FeeStructure } from "@/lib/types/fee";

export default function FeeStructurePage() {
  const { selectedYear } = useAcademicYearStore();

  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [filterYear, setFilterYear] = useState(selectedYear || "");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load(year?: string) {
    setLoading(true);
    setError(null);
    getFeeStructures({ academic_year: year || undefined })
      .then((res) => setStructures(res.data))
      .catch(() => setError("Failed to load fee structures."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    getAcademicYears()
      .then((res) => {
        const names = res.map((y) => (typeof y === "string" ? y : (y as { name: string }).name));
        setYears(names);
        const initial = selectedYear || names[0] || "";
        setFilterYear(initial);
        load(initial);
      })
      .catch(() => load(selectedYear || ""));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleYearChange(y: string) {
    setFilterYear(y);
    load(y);
  }

  // Filter by search
  const filtered = search
    ? structures.filter(
        (s) =>
          s.program.toLowerCase().includes(search.toLowerCase()) ||
          s.name.toLowerCase().includes(search.toLowerCase())
      )
    : structures;

  // Group by program
  const grouped = filtered.reduce(
    (acc, s) => {
      const key = s.program || "Other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    },
    {} as Record<string, FeeStructure[]>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Back */}
      <Link
        href="/dashboard/branch-manager/fees"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Fees
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Fee Structure</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Annual fee breakdown per program and academic year
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" onClick={() => load(filterYear)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Year selector */}
        <select
          className="rounded-[10px] border border-border-input bg-app-bg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[150px]"
          value={filterYear}
          onChange={(e) => handleYearChange(e.target.value)}
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search by program..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

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
          <Button variant="outline" size="sm" onClick={() => load(filterYear)}>
            Retry
          </Button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-text-secondary text-sm">
          No fee structures found{filterYear ? ` for ${filterYear}` : ""}.
        </div>
      )}

      {/* Grouped list */}
      {!loading && !error && Object.entries(grouped).map(([program, items]) => (
        <motion.div
          key={program}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>{program}</CardTitle>
                <Badge variant="outline" className="ml-2">
                  {items.length} structure{items.length > 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((s) => (
                  <Link
                    key={s.name}
                    href={`/dashboard/branch-manager/fees/structure/${encodeURIComponent(s.name)}`}
                  >
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="rounded-[12px] border border-border-light bg-app-bg p-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-text-primary text-sm truncate">
                            {s.name}
                          </p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {s.academic_year}
                            {s.academic_term ? ` · ${s.academic_term}` : ""}
                          </p>
                        </div>
                        <IndianRupee className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      </div>
                      <p className="mt-3 text-lg font-bold text-text-primary">
                        {formatCurrency(s.total_amount)}
                      </p>
                      {s.company && s.company.trim() && (
                        <p className="text-xs text-text-tertiary mt-1 truncate">{s.company}</p>
                      )}
                    </motion.div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
