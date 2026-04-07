"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/useAuth";

/**
 * Polls pending syllabus approval count for the current branch manager.
 * Returns count for sidebar badge. Refreshes every 60 seconds.
 */
export function useSyllabusNotifications() {
  const { role, defaultCompany, isAuthenticated } = useAuth();
  const isBranchManager = role === "Branch Manager" || role === "Director" || role === "Management";

  const { data: pendingCount = 0 } = useQuery<number>({
    queryKey: ["syllabus-notifications", defaultCompany],
    queryFn: async () => {
      const params = new URLSearchParams({
        company: defaultCompany || "",
        status: "Pending Approval",
      });
      const res = await fetch(`/api/syllabus-parts?${params}`, { credentials: "include" });
      if (!res.ok) return 0;
      const json = await res.json();
      return json.data?.length ?? 0;
    },
    enabled: isAuthenticated && isBranchManager && !!defaultCompany,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return { pendingCount };
}
