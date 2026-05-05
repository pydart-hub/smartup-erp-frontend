"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { AlumniTable } from "@/components/alumni/AlumniTable";
import { AlumniStatsCards } from "@/components/alumni/AlumniStatsCards";
import { getDirectorAlumniList } from "@/lib/api/alumni";
import type { AlumniListSummary } from "@/lib/types/alumni";

const EMPTY_SUMMARY: AlumniListSummary = {
  total: 0,
  currentYearPassouts: 0,
  ugCount: 0,
  pgCount: 0,
};

export default function DirectorAlumniPage() {
  const [search, setSearch] = useState("");
  const [passoutYear, setPassoutYear] = useState("");
  const [qualification, setQualification] = useState<"" | "UG" | "PG">("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["director-alumni", debouncedSearch, passoutYear, qualification, page, pageSize],
    queryFn: () =>
      getDirectorAlumniList({
        q: debouncedSearch,
        passout_year: passoutYear,
        qualification_level: qualification,
        page,
        pageSize,
      }),
    staleTime: 30_000,
  });

  const totalPages = data?.meta.totalPages ?? 1;
  const summary = data?.summary ?? EMPTY_SUMMARY;

  const filtersLabel = useMemo(() => {
    const parts: string[] = [];
    if (debouncedSearch) parts.push(`"${debouncedSearch}"`);
    if (passoutYear) parts.push(`Year ${passoutYear}`);
    if (qualification) parts.push(qualification);
    return parts.length ? `Filtered by: ${parts.join(", ")}` : "Showing all alumni records";
  }, [debouncedSearch, passoutYear, qualification]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 p-6 text-white shadow-lg">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-teal-100 text-sm font-medium uppercase tracking-widest mb-1">Director Panel</p>
            <h1 className="text-3xl font-bold tracking-tight">Alumni Connect</h1>
            <p className="text-teal-100 text-sm mt-1">
              Manage and track all alumni connections from a single dashboard.
            </p>
          </div>
          <Button
            asChild
            className="bg-white text-teal-700 hover:bg-teal-50 font-semibold shadow-md border-0 shrink-0"
          >
            <Link href="/dashboard/director/alumni/new">
              <Plus className="h-4 w-4" />
              Add Alumni Entry
            </Link>
          </Button>
        </div>
        {/* decorative blobs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 right-24 w-24 h-24 rounded-full bg-white/5" />
      </div>

      {/* Stat cards */}
      <AlumniStatsCards summary={summary} />

      {data?.meta.warning && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-amber-500 text-lg mt-0.5">⚠</span>
          <p className="text-sm font-medium text-amber-800">{data.meta.warning}</p>
        </div>
      )}

      {/* Table section */}
      <div className="rounded-2xl border border-border-light bg-surface shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-border-light bg-app-bg/50">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-text-tertiary" />
            <span className="text-sm font-semibold text-text-primary">Alumni Connect Data View</span>
            <span className="text-xs text-text-tertiary ml-1">— {filtersLabel}</span>
          </div>
          <span className="text-xs text-text-tertiary">
            {data?.meta.total ?? 0} total record{(data?.meta.total ?? 0) !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-5 py-4 border-b border-border-light bg-app-bg/30">
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, phone, email"
            leftIcon={<Search className="h-4 w-4" />}
          />
          <Input
            value={passoutYear}
            onChange={(e) => { setPassoutYear(e.target.value); setPage(1); }}
            placeholder="Filter by passout year"
            maxLength={4}
          />
          <select
            value={qualification}
            onChange={(e) => { setQualification(e.target.value as "" | "UG" | "PG"); setPage(1); }}
            className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All qualifications</option>
            <option value="UG">UG</option>
            <option value="PG">PG</option>
          </select>
        </div>

        {/* Table */}
        <div className="px-5 py-4">
          <AlumniTable rows={data?.data ?? []} isLoading={isLoading} isError={isError} />
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border-light bg-app-bg/30">
          <p className="text-sm text-text-secondary">
            Showing <span className="font-medium text-text-primary">{(data?.data ?? []).length}</span> of{" "}
            <span className="font-medium text-text-primary">{data?.meta.total ?? 0}</span> records
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-text-secondary px-1">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
