"use client";

import { Badge } from "@/components/ui/Badge";
import type { TransferStatus } from "@/lib/types/transfer";

const STATUS_MAP: Record<TransferStatus, { variant: "default" | "success" | "warning" | "error" | "info"; label: string }> = {
  Pending: { variant: "warning", label: "Pending" },
  Approved: { variant: "info", label: "Approved" },
  Completed: { variant: "success", label: "Completed" },
  Rejected: { variant: "error", label: "Rejected" },
  Failed: { variant: "error", label: "Failed" },
};

export function TransferStatusBadge({ status }: { status: TransferStatus }) {
  const config = STATUS_MAP[status] || STATUS_MAP.Pending;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
