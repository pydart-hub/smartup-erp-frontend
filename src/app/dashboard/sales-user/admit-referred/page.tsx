"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function AdmitReferredPage() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname.includes("/branch-manager") ? "/dashboard/branch-manager" : "/dashboard/sales-user";

  useEffect(() => {
    router.replace(`${basePath}/admit?referred=true`);
  }, [router, basePath]);

  return null;
}
