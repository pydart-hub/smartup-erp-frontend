"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getEmployees } from "@/lib/api/employees";
import { createMentorProfile, getBranchMentors } from "@/lib/api/mentors";

export default function BranchManagerMentorsCreatePage() {
  const { defaultCompany } = useAuth();
  const queryClient = useQueryClient();
  const [mentorName, setMentorName] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  const mentorsQuery = useQuery({
    queryKey: ["branch-mentors", defaultCompany],
    queryFn: () => getBranchMentors(defaultCompany || undefined),
    enabled: !!defaultCompany,
    staleTime: 30_000,
  });

  const employeesQuery = useQuery({
    queryKey: ["mentor-employees", defaultCompany],
    queryFn: () => getEmployees({ company: defaultCompany || undefined, status: "Active", limit_page_length: 500 }),
    enabled: !!defaultCompany,
    staleTime: 60_000,
  });

  const createMentorMutation = useMutation({
    mutationFn: async () => {
      const employee = (employeesQuery.data?.data ?? []).find((row) => row.name === employeeId);
      if (!employee?.user_id) throw new Error("Selected employee has no linked user account");
      return createMentorProfile({
        mentor_name: mentorName || employee.employee_name,
        employee: employee.name,
        user_id: employee.user_id,
        branch: defaultCompany || undefined,
      });
    },
    onSuccess: () => {
      setMentorName("");
      setEmployeeId("");
      queryClient.invalidateQueries({ queryKey: ["branch-mentors", defaultCompany] });
      // Redirect back or show success message? Let's show success or keep them here to add more.
      // Usually keeping them on the form with form state reset is fine, or they can navigate back.
    },
  });

  const mentors = mentorsQuery.data ?? [];
  const existingMentorEmployeeIds = new Set(mentors.map((m) => m.employee));
  const employees = (employeesQuery.data?.data ?? []).filter(
    (row) => row.user_id && !existingMentorEmployeeIds.has(row.name)
  );

  const isLoading = mentorsQuery.isLoading || employeesQuery.isLoading;

  return (
    <div className="space-y-6">
      <BreadcrumbNav />
      <div>
        <Link href="/dashboard/branch-manager/mentors" className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mb-2">
          <ArrowLeft className="h-3 w-3" /> Back to Mentors Portal
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">Create Mentor Profile</h1>
        <p className="text-sm text-text-secondary mt-1">Register branch employees as mentors</p>
      </div>

      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Mentor Credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">Employee</label>
              <select
                className="mt-1 h-10 w-full rounded-[10px] border border-border-input bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">Select employee</option>
                {employees.map((row) => (
                  <option key={row.name} value={row.name}>
                    {row.employee_name} - {row.user_id}
                  </option>
                ))}
              </select>
            </div>
            
            <Input
              label="Mentor Display Name"
              placeholder="Optional display name (defaults to employee name)"
              value={mentorName}
              onChange={(e) => setMentorName(e.target.value)}
            />

            {createMentorMutation.isSuccess && (
              <div className="rounded-lg bg-success/10 border border-success/20 p-3 text-xs text-success font-medium">
                Mentor profile created successfully!
              </div>
            )}

            {createMentorMutation.isError && (
              <div className="rounded-lg bg-error/10 border border-error/20 p-3 text-xs text-error font-medium">
                {(createMentorMutation.error as Error)?.message}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-3">
              <Link href="/dashboard/branch-manager/mentors">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button
                onClick={() => createMentorMutation.mutate()}
                disabled={createMentorMutation.isPending || !employeeId}
              >
                {createMentorMutation.isPending ? "Creating..." : "Create Mentor"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
