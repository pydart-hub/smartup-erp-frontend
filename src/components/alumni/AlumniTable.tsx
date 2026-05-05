"use client";

import Link from "next/link";
import { Loader2, Eye, PencilLine, Phone, Mail, Building2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { AlumniRecord } from "@/lib/types/alumni";

interface AlumniTableProps {
  rows: AlumniRecord[];
  isLoading?: boolean;
  isError?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];

function getAvatarColor(name: string): string {
  const sum = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function AlumniTable({ rows, isLoading, isError }: AlumniTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-52">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-52 flex items-center justify-center text-sm text-error">
        Failed to load alumni records.
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="h-52 flex flex-col items-center justify-center gap-2 text-text-secondary">
        <span className="text-4xl">🎓</span>
        <p className="text-sm font-medium">No alumni records found for the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const initials = getInitials(row.full_name);
        const avatarColor = getAvatarColor(row.full_name);
        return (
          <div
            key={row.name}
            className="group flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-border-light bg-surface px-4 py-3 hover:border-primary/30 hover:bg-brand-wash/20 transition-all duration-150"
          >
            {/* Avatar + Name */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor}`}>
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-text-primary text-sm truncate">{row.full_name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-text-tertiary">
                    <Phone className="h-3 w-3" />{row.phone}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-text-tertiary">
                    <Mail className="h-3 w-3" />{row.email}
                  </span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 flex-1 sm:flex-none sm:w-auto">
              <div className="flex items-center gap-1 text-xs text-text-secondary">
                <Briefcase className="h-3.5 w-3.5 text-text-tertiary" />
                <span>{row.current_position || "—"}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-text-secondary">
                <Building2 className="h-3.5 w-3.5 text-text-tertiary" />
                <span className="max-w-[160px] truncate">{row.last_studied_institute || "—"}</span>
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={row.qualification_level === "PG" ? "info" : "default"} className="text-xs">
                {row.qualification_level}
              </Badge>
              <span className="text-xs text-text-tertiary font-medium bg-app-bg px-2 py-0.5 rounded-full border border-border-light">
                {row.passout_year}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/director/alumni/${encodeURIComponent(row.name)}`}>
                  <Eye className="h-3.5 w-3.5" />
                  View
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/dashboard/director/alumni/${encodeURIComponent(row.name)}/edit`}>
                  <PencilLine className="h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
