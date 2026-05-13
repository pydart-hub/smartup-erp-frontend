// Status Badge Component
// File: src/components/work-assignments/StatusBadge.tsx

import React from "react";
import { cn } from "@/lib/utils/cn";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

type SubmissionStatus = "Pending" | "Submitted" | "Approved" | "Rejected";
type ApprovalStatus = "Pending" | "Approved" | "Rejected";

export interface StatusBadgeProps {
  status: SubmissionStatus | ApprovalStatus;
  type?: "submission" | "approval";
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = "submission",
  className,
}) => {
  let bgColor = "bg-gray-100";
  let textColor = "text-gray-700";
  let icon = Clock;
  let label: string = status;

  if (status === "Pending") {
    bgColor = "bg-gray-100";
    textColor = "text-gray-700";
    icon = Clock;
    label = "Pending";
  } else if (status === "Submitted") {
    bgColor = "bg-blue-100";
    textColor = "text-blue-700";
    icon = AlertCircle;
    label = "Submitted";
  } else if (status === "Approved") {
    bgColor = "bg-green-100";
    textColor = "text-green-700";
    icon = CheckCircle2;
    label = "✅ Approved";
  } else if (status === "Rejected") {
    bgColor = "bg-red-100";
    textColor = "text-red-700";
    icon = XCircle;
    label = "❌ Rejected";
  }

  const IconComponent = icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        bgColor,
        textColor,
        className
      )}
    >
      <IconComponent className="w-3 h-3" />
      {label}
    </span>
  );
};
