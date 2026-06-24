"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

type CroppedSmileLogoProps = {
  className?: string;
};

export function CroppedSmileLogo({ className }: CroppedSmileLogoProps) {
  return (
    <span
      className={cn(
        "relative inline-flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden",
        className
      )}
      aria-hidden="true"
    >
      <video
        src="/Logo%20Icon%20Smile%20ALPHA.webm"
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none h-[135%] w-[135%] max-w-none object-cover"
      />
    </span>
  );
}
