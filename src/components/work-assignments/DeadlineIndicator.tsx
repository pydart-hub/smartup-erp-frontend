// Deadline Indicator Component
// File: src/components/work-assignments/DeadlineIndicator.tsx

import React from "react";
import { AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { daysUntilDeadline, formatDeadline } from "@/lib/api/workAssignment";

export interface DeadlineIndicatorProps {
  deadline: string;
  submissionStatus?: "Pending" | "Submitted" | "Approved" | "Rejected";
  className?: string;
}

export const DeadlineIndicator: React.FC<DeadlineIndicatorProps> = ({
  deadline,
  submissionStatus,
  className,
}) => {
  const daysRemaining = daysUntilDeadline(deadline);
  const isOverdue = daysRemaining < 0;
  const isUrgent = daysRemaining >= 0 && daysRemaining < 3;
  const isApproaching = daysRemaining >= 3 && daysRemaining < 7;

  let bgColor = "bg-gray-50";
  let textColor = "text-gray-700";
  let borderColor = "border-gray-200";
  let iconColor = "text-gray-500";
  let icon = Clock;

  if (isOverdue) {
    bgColor = "bg-red-50";
    textColor = "text-red-700";
    borderColor = "border-red-200";
    iconColor = "text-red-500";
    icon = AlertCircle;
  } else if (isUrgent) {
    bgColor = "bg-red-50";
    textColor = "text-red-700";
    borderColor = "border-red-200";
    iconColor = "text-red-500";
    icon = AlertCircle;
  } else if (isApproaching) {
    bgColor = "bg-orange-50";
    textColor = "text-orange-700";
    borderColor = "border-orange-200";
    iconColor = "text-orange-500";
  }

  if (submissionStatus === "Approved") {
    bgColor = "bg-green-50";
    textColor = "text-green-700";
    borderColor = "border-green-200";
    iconColor = "text-green-500";
    icon = CheckCircle2;
  }

  if (submissionStatus === "Rejected") {
    bgColor = "bg-red-50";
    textColor = "text-red-700";
    borderColor = "border-red-200";
    iconColor = "text-red-500";
    icon = XCircle;
  }

  const IconComponent = icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md border",
        bgColor,
        borderColor,
        textColor,
        className
      )}
    >
      <IconComponent className={cn("w-4 h-4", iconColor)} />
      <div className="flex-1">
        <p className="text-xs font-medium">
          {submissionStatus === "Approved"
            ? "APPROVED ✅"
            : submissionStatus === "Rejected"
            ? "REJECTED ❌"
            : isOverdue
            ? "OVERDUE"
            : isUrgent
            ? `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`
            : formatDeadline(deadline)}
        </p>
      </div>
    </div>
  );
};
