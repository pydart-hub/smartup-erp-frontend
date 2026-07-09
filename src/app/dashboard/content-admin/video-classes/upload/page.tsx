"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VideoUploadRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/content-admin/video-classes");
  }, [router]);

  return null;
}
