"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  GraduationCap,
  Users,
  MapPin,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { getBranchSchedules } from "@/lib/api/director";

function formatTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function BranchSchedulePage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.id as string);
  const shortName = branchName.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const encodedBranch = encodeURIComponent(branchName);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() =>
    new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
  );

  const {
    data: schedules,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["director-branch-schedules", branchName, dateFrom, dateTo],
    queryFn: () => getBranchSchedules(branchName, dateFrom, dateTo),
    staleTime: 60_000,
  });

  const scheduleList = schedules ?? [];

  // Group by date
  const groupedByDate = scheduleList.reduce(
    (acc, s) => {
      const key = s.schedule_date;
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    },
    {} as Record<string, typeof scheduleList>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      <Link
        href={`/dashboard/director/branches/${encodedBranch}`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {shortName}
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Course Schedule — {shortName}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {scheduleList.length} scheduled classes
          </p>
        </div>
      </div>

      {/* Date range filters */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-xs text-text-tertiary mb-1 block">From</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div>
          <label className="text-xs text-text-tertiary mb-1 block">To</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load schedules</p>
        </div>
      ) : scheduleList.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48">
          <p className="text-sm text-text-tertiary">No schedules found for this date range</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, items]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-text-primary">
                    {new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
                      weekday: "long",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </h3>
                  <Badge variant="outline" className="text-[10px]">
                    {items.length} class{items.length !== 1 ? "es" : ""}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ml-6">
                  {items
                    .sort((a, b) => a.from_time.localeCompare(b.from_time))
                    .map((s) => (
                      <Card
                        key={s.name}
                        className="border-border-light hover:border-primary/20 transition-colors"
                      >
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-text-primary text-sm">
                              {s.course}
                            </p>
                          </div>
                          <div className="space-y-1.5 text-xs text-text-secondary">
                            <div className="flex items-center gap-1.5">
                              <GraduationCap className="h-3.5 w-3.5 text-text-tertiary" />
                              <span>{s.instructor_name || s.instructor}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-text-tertiary" />
                              <span>
                                {formatTime(s.from_time)} – {formatTime(s.to_time)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-text-tertiary" />
                              <span>{s.student_group}</span>
                            </div>
                            {s.room && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-text-tertiary" />
                                <span>{s.room}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </motion.div>
  );
}
