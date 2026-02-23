"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        {
          "bg-primary-light text-primary": variant === "default",
          "bg-success-light text-success": variant === "success",
          "bg-warning-light text-warning": variant === "warning",
          "bg-error-light text-error": variant === "error",
          "bg-info-light text-info": variant === "info",
          "border border-border-input text-text-secondary": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
