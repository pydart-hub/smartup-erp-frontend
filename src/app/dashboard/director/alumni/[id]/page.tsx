"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Mail, Phone, Building2, Briefcase, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getDirectorAlumniById, deleteDirectorAlumni } from "@/lib/api/alumni";

export default function DirectorAlumniDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["director-alumni-detail", id],
    queryFn: () => getDirectorAlumniById(id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDirectorAlumni(id),
    onSuccess: () => {
      toast.success("Alumni record deleted");
      router.push("/dashboard/director/alumni");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete alumni");
      setConfirmDelete(false);
    },
  });

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Alumni Detail</h1>
          <p className="text-sm text-text-secondary mt-1">Standalone alumni profile record</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/director/alumni">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link href={`/dashboard/director/alumni/${encodeURIComponent(id)}/edit`}>Edit</Link>
          </Button>
          {!confirmDelete ? (
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1">
              <span className="text-xs text-red-700 font-medium">Delete this record?</span>
              <Button
                size="sm"
                variant="danger"
                onClick={() => deleteMutation.mutate()}
                loading={deleteMutation.isPending}
              >
                Confirm
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {isLoading && <div className="text-sm text-text-secondary">Loading alumni details...</div>}
      {isError && <div className="text-sm text-error">Unable to load alumni details.</div>}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{data.full_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-text-tertiary mt-1" />
                  <div>
                    <p className="text-xs text-text-tertiary">Phone</p>
                    <p className="text-sm text-text-primary">{data.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-text-tertiary mt-1" />
                  <div>
                    <p className="text-xs text-text-tertiary">Email</p>
                    <p className="text-sm text-text-primary">{data.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-text-tertiary mt-1" />
                  <div>
                    <p className="text-xs text-text-tertiary">Passout Year</p>
                    <p className="text-sm text-text-primary">{data.passout_year}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Briefcase className="h-4 w-4 text-text-tertiary mt-1" />
                  <div>
                    <p className="text-xs text-text-tertiary">Current Position</p>
                    <p className="text-sm text-text-primary">{data.current_position}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 md:col-span-2">
                  <Building2 className="h-4 w-4 text-text-tertiary mt-1" />
                  <div>
                    <p className="text-xs text-text-tertiary">Last Studied Institute</p>
                    <p className="text-sm text-text-primary">{data.last_studied_institute}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-text-tertiary">Address</p>
                <p className="text-sm text-text-primary mt-1">{data.address}</p>
              </div>

              <div>
                <p className="text-xs text-text-tertiary">Remark for Special Skills</p>
                <p className="text-sm text-text-primary mt-1 whitespace-pre-wrap">
                  {data.special_skills_remark || "-"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-text-tertiary mb-1">Qualification</p>
                <Badge>{data.qualification_level}</Badge>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Record ID</p>
                <p className="text-sm text-text-primary mt-1 break-all">{data.name}</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Created</p>
                <p className="text-sm text-text-primary mt-1">{data.creation || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Last Updated</p>
                <p className="text-sm text-text-primary mt-1">{data.modified || "-"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
