"use client";

import React from "react";

interface DisabilityBadgeProps {
  disabilities?: string | null;
}

export function DisabilityBadge({ disabilities }: DisabilityBadgeProps) {
  if (!disabilities) return null;
  return (
    <span
      className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 whitespace-nowrap"
    >
      {disabilities}
    </span>
  );
}
