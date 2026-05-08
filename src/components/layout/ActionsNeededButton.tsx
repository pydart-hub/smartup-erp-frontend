"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getBranchActionsNeeded } from "@/lib/api/analytics";

export function ActionsNeededButton() {
  const { role } = useAuth();
  const router = useRouter();

  // Fetch actions needed count for badge (must be called unconditionally)
  const { data: actionsData } = useQuery({
    queryKey: ["branch-actions-needed"],
    queryFn: () => getBranchActionsNeeded(),
    staleTime: 60000, // 1 minute
    retry: 1,
  });

  // Count total actions across all branches
  const totalActions = React.useMemo(() => {
    if (!actionsData) return 0;
    return actionsData.overall?.total_actions_needed_days ?? 0;
  }, [actionsData]);

  // Only show for Director role (early return after all hooks)
  const isDirector = role === "Director" || role?.includes("Director");
  if (!isDirector) return null;

  const hasActions = totalActions > 0;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => router.push("/dashboard/director/actions-needed")}
      className={`relative w-10 h-10 rounded-[10px] flex items-center justify-center transition-all ${
        hasActions
          ? "bg-warning/10 text-warning hover:bg-warning/15"
          : "text-text-secondary hover:bg-app-bg"
      }`}
      title="View Actions Needed"
    >
      {/* Pulse animation when there are actions */}
      {hasActions && (
        <motion.div
          className="absolute inset-0 rounded-[10px] bg-warning/20 border border-warning/30"
          animate={{
            boxShadow: [
              "0 0 0 0px rgba(217, 119, 6, 0.3)",
              "0 0 0 8px rgba(217, 119, 6, 0)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      )}

      {/* Icon */}
      <AlertTriangle className={`h-5 w-5 relative z-10 ${hasActions ? "text-warning" : ""}`} />

      {/* Badge showing action count */}
      {totalActions > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-5 px-1 bg-warning text-white rounded-full text-[10px] font-bold"
        >
          {totalActions > 99 ? "99+" : totalActions}
        </motion.span>
      )}
    </motion.button>
  );
}
