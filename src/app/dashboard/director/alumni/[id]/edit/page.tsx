"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlumniForm } from "@/components/alumni/AlumniForm";
import { getDirectorAlumniById, updateDirectorAlumni } from "@/lib/api/alumni";
import type { AlumniFormInput } from "@/lib/types/alumni";

export default function DirectorAlumniEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = decodeURIComponent(params.id);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["director-alumni-edit", id],
    queryFn: () => getDirectorAlumniById(id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: AlumniFormInput) => updateDirectorAlumni(id, payload),
    onSuccess: () => {
      toast.success("Alumni record updated");
      router.push(`/dashboard/director/alumni/${encodeURIComponent(id)}`);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to update alumni record");
    },
  });

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Edit Alumni</h1>
          <p className="text-sm text-text-secondary mt-1">Update standalone alumni information</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/director/alumni/${encodeURIComponent(id)}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Detail
          </Link>
        </Button>
      </div>

      {isLoading && <div className="text-sm text-text-secondary">Loading alumni data...</div>}
      {isError && <div className="text-sm text-error">Unable to load alumni record.</div>}

      {data && (
        <Card>
          <CardHeader>
            <CardTitle>{data.full_name}</CardTitle>
            <CardDescription>Modify details and save changes.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlumniForm
              initialValues={{
                full_name: data.full_name,
                phone: data.phone,
                address: data.address,
                email: data.email,
                passout_year: data.passout_year,
                current_position: data.current_position,
                last_studied_institute: data.last_studied_institute,
                qualification_level: data.qualification_level,
                special_skills_remark: data.special_skills_remark || "",
              }}
              submitLabel="Update Alumni"
              isSubmitting={updateMutation.isPending}
              onSubmit={async (values) => {
                await updateMutation.mutateAsync(values);
              }}
              onCancel={() => router.push(`/dashboard/director/alumni/${encodeURIComponent(id)}`)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
