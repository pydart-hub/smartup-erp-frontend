"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/useAuth";

export interface PendingTransfer {
  name: string;
  student: string;
  student_name: string;
  from_branch: string;
  to_branch: string;
  request_date: string;
  creation: string;
}

/**
 * Polls pending incoming transfers for the current branch manager.
 * Returns the list + count for sidebar badge & notification dropdown.
 * Refreshes every 60 seconds.
 */
export function useTransferNotifications() {
  const { role, defaultCompany, isAuthenticated } = useAuth();
  const isBranchManager = role === "Branch Manager" || role === "Director" || role === "Management";

  const { data: pending = [] } = useQuery<PendingTransfer[]>({
    queryKey: ["transfer-notifications", defaultCompany],
    queryFn: async () => {
      const res = await fetch("/api/transfer/list?status=Pending&direction=incoming");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: isAuthenticated && isBranchManager && !!defaultCompany,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return {
    pendingTransfers: pending,
    pendingCount: pending.length,
  };
}
