"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, GraduationCap, Sparkles } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { AlumniForm } from "@/components/alumni/AlumniForm";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { createDirectorAlumni } from "@/lib/api/alumni";
import type { AlumniFormInput } from "@/lib/types/alumni";

export default function DirectorAlumniNewPage() {
  const router = useRouter();

  const createMutation = useMutation({
    mutationFn: (payload: AlumniFormInput) => createDirectorAlumni(payload),
    onSuccess: (record) => {
      toast.success("Alumni record created");
      router.push(`/dashboard/director/alumni/${encodeURIComponent(record.name)}`);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to create alumni record");
    },
  });

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      <div className="rounded-2xl border border-border-light bg-gradient-to-r from-brand-wash/80 via-surface to-success/5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Alumni Entry</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Add a standalone alumni profile with contact details, qualification level, and career snapshot.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border-light bg-surface px-3 py-1 text-xs text-text-secondary">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Data is saved independently from existing education doctypes.
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/director/alumni">
              <ArrowLeft className="h-4 w-4" />
              Back to Alumni Dashboard
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Add Alumni Details
          </CardTitle>
          <CardDescription>
            Enter complete details to create a formal alumni profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlumniForm
            submitLabel="Create Alumni"
            isSubmitting={createMutation.isPending}
            onSubmit={async (values) => {
              await createMutation.mutateAsync(values);
            }}
            onCancel={() => router.push("/dashboard/director/alumni")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
