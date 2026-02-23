"use client";

import React from "react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/Badge";
import { UserPlus, Users, IndianRupee, ClipboardCheck } from "lucide-react";

interface ActivityItem {
  id: string;
  type: "student_added" | "batch_created" | "fee_collected" | "attendance_marked";
  message: string;
  timestamp: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  loading?: boolean;
}

const iconMap = {
  student_added: { icon: UserPlus, color: "bg-primary-light text-primary" },
  batch_created: { icon: Users, color: "bg-secondary-light text-secondary" },
  fee_collected: { icon: IndianRupee, color: "bg-success-light text-success" },
  attendance_marked: { icon: ClipboardCheck, color: "bg-info-light text-info" },
};

export function RecentActivity({ activities, loading }: RecentActivityProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-border-light shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 bg-border-light rounded" />
              <div className="h-2.5 w-1/4 bg-border-light rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-text-tertiary">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => {
        const { icon: Icon, color } = iconMap[activity.type];
        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-start gap-3 p-2 rounded-[10px] hover:bg-app-bg transition-colors"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary">{activity.message}</p>
              <p className="text-xs text-text-tertiary mt-0.5">
                {formatDate(activity.timestamp, "dd MMM, hh:mm a")}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export type { ActivityItem };
