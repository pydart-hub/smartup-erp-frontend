"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ParentLevelExamResultRedirectPage() {
  const router = useRouter();
  const params = useParams<{ attemptId: string }>();
  const attemptId = typeof params?.attemptId === "string" ? decodeURIComponent(params.attemptId) : "";

  useEffect(() => {
    if (attemptId) {
      router.replace(`/exam-site/result/${encodeURIComponent(attemptId)}`);
    } else {
      router.replace("/exam-site");
    }
  }, [attemptId, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-text-secondary">Redirecting to Exam Results...</p>
      </div>
    </div>
  );
}
