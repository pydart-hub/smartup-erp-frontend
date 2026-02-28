"use client";

import React from "react";

/**
 * Parent layout is a simple passthrough.
 * The dashboard layout (parent route) already renders the Sidebar
 * with PARENT_NAV when the user role is "Parent", so no duplicate
 * shell is needed here.
 */
export default function ParentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
