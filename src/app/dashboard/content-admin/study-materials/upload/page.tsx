"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudyMaterialUploadRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/content-admin/study-materials");
  }, [router]);

  return null;
}
