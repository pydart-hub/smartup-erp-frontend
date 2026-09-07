"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { toast } from "sonner";

export default function CreateExamPage() {
  const router = useRouter();

  useEffect(() => {
    toast.error("Exam creation is restricted to the Curriculum Department.");
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6 lg:p-8">
      <BreadcrumbNav />
      <Card className="border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-8 text-center mt-6">
        <CardContent className="space-y-4 pt-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">Exam Creation Restricted</h2>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            Exam creation is now managed exclusively by the Curriculum Department. Branch Managers can view scheduled exams and record marks.
          </p>
          <div className="pt-2">
            <Button
              onClick={() => router.push("/dashboard/branch-manager/exams/regular")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Regular Exams
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
