"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Employees are now managed via Frappe Employee doctype.
// Salary module does not create employees — redirect to staff list.
export default function RedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/hr-manager/salary/staff");
  }, [router]);
  return null;
}
