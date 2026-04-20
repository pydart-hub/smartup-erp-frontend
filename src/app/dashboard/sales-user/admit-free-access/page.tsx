"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function AdmitFreeAccessPage() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname.includes("/branch-manager") ? "/dashboard/branch-manager" : "/dashboard/sales-user";

  useEffect(() => {
    const target = pathname.includes("/branch-manager")
      ? `${basePath}/students/new?free_access=true`
      : `${basePath}/admit?free_access=true`;
    router.replace(target);
  }, [router, basePath, pathname]);

  return null;
}
