"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function BreadcrumbNav() {
  const pathname = usePathname();

  const segmentLabelMap: Record<string, string> = {
    alumni: "Alumni Connect",
  };

  // Parse path segments
  const segments = pathname.split("/").filter(Boolean);

  // Build breadcrumb items
  const breadcrumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const decoded = decodeURIComponent(segment);
    const normalized = decoded.toLowerCase();
    const label = segmentLabelMap[normalized] ?? decoded
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return { label, href };
  });

  return (
    <nav className="flex items-center gap-1.5 text-sm text-text-tertiary mb-4">
      <Link
        href="/dashboard"
        className="hover:text-text-secondary transition-colors flex items-center gap-1"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {breadcrumbs.slice(1).map((crumb, index) => (
        <React.Fragment key={crumb.href}>
          <ChevronRight className="h-3.5 w-3.5 text-text-tertiary/50" />
          {index === breadcrumbs.length - 2 ? (
            <span className="text-text-primary font-medium">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-text-secondary transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
