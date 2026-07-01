"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

type NextExamButtonProps = {
  studentName: string;
  studentBranch: string;
  studentPhone: string;
  classLevel: string;
  publishingId: string;
  subjectName: string;
};

export function NextExamButton({
  studentName,
  studentBranch,
  studentPhone,
  classLevel,
  publishingId,
  subjectName,
}: NextExamButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStartNextExam = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/public-exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          studentBranch,
          studentPhone,
          classLevel,
          publishingId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to start the next exam");
        return;
      }

      sessionStorage.setItem(`exam_token_${data.attemptId}`, data.sessionToken);
      router.push(`/exam-site/attempt/${data.attemptId}`);
    } catch (error) {
      console.error(error);
      alert("Failed to connect to the server. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={() => void handleStartNextExam()}
      disabled={loading}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:bg-slate-400 cursor-pointer"
    >
      {loading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      ) : (
        <>
          <span>Start Next Exam ({subjectName})</span>
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}
