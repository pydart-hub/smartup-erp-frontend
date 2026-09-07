"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ParentLevelExamsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/exam-site");
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-text-secondary">Redirecting to Diagnosis Exam...</p>
      </div>
    </div>
  );
}


