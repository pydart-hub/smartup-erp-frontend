"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { AxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import apiClient from "@/lib/api/client";
import { getInstructorsByCompany } from "@/lib/api/employees";
import {
  createWorkAssignment,
  getWorkAssignment,
  submitWorkAssignment,
  updateWorkAssignment,
} from "@/lib/api/workAssignment";
import type { WorkAssignmentCreatePayload } from "@/lib/types/workAssignment";

interface CompanyOption {
  name: string;
}

interface AcademicYearOption {
  name: string;
}

interface InstructorOption {
  name: string;
  instructor_name?: string;
}

export interface WorkAssignmentFormProps {
  assignmentId?: string;
  basePath?: string;
}

const ASSIGNMENT_TYPES = [
  "Question Bank",
  "PPT",
  "Question Paper",
  "Handwritten Notes",
  "Worksheet",
  "Assignment",
  "Other",
] as const;

const todayISO = () => new Date().toISOString().split("T")[0];

const normalizeCompanyName = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

const isParentCompany = (name: string) => {
  const normalized = normalizeCompanyName(name);
  return normalized === "smartup" || normalized === "smart up";
};

const extractApiErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string; error?: string; exception?: string; _server_messages?: string }>;

  const data = axiosError?.response?.data;

  // Check specific known backend errors first so we can surface friendly messages
  const exceptionStr = typeof data?.exception === "string" ? data.exception : "";
  if (exceptionStr.includes("No module named 'frappe.core.doctype.work_assignment'")) {
    return "Work Assignment DocType is not configured on the backend. Ask the backend admin to deploy the module and run bench migrate.";
  }

  if (data?.message && typeof data.message === "string") return data.message;
  if (data?.error && typeof data.error === "string") return data.error;
  if (exceptionStr) return exceptionStr;

  if (data?._server_messages) {
    try {
      const first = JSON.parse(data._server_messages)?.[0];
      if (first) {
        const parsed = JSON.parse(first);
        if (parsed?.message) return parsed.message;
      }
    } catch {
      // Ignore parse issues and fallback below.
    }
  }

  if (axiosError?.message) return axiosError.message;
  return "Failed to save assignment";
};

export const WorkAssignmentForm: React.FC<WorkAssignmentFormProps> = ({ assignmentId, basePath = "/dashboard/director/work-assignments" }) => {
  const router = useRouter();
  const isEdit = Boolean(assignmentId);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [originalDocstatus, setOriginalDocstatus] = useState<number>(0);

  const [branches, setBranches] = useState<CompanyOption[]>([]);
  const [years, setYears] = useState<AcademicYearOption[]>([]);
  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [isLoadingInstructors, setIsLoadingInstructors] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignmentType, setAssignmentType] = useState("");
  const [forBranch, setForBranch] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [deadline, setDeadline] = useState(todayISO());
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([""]);

  const selectedSet = useMemo(() => new Set(selectedInstructors.filter(Boolean)), [selectedInstructors]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const fields = encodeURIComponent(JSON.stringify(["name"]));
        const instructorFields = encodeURIComponent(JSON.stringify(["name", "instructor_name"]));

        const [branchRes, yearRes, instructorRes] = await Promise.all([
          apiClient.get(`/resource/Company?fields=${fields}&limit_page_length=500&order_by=name asc`),
          apiClient.get(`/resource/Academic Year?fields=${fields}&limit_page_length=50&order_by=name desc`),
          apiClient.get(`/resource/Instructor?fields=${instructorFields}&limit_page_length=1000&order_by=instructor_name asc`),
        ]);

        const branchData = branchRes.data?.data || [];
        const yearData = yearRes.data?.data || [];
        const instructorData = instructorRes.data?.data || [];

        const filteredBranches = branchData.filter((branch: CompanyOption) => !isParentCompany(branch.name));

        setBranches(filteredBranches);
        setYears(yearData);

        if (!isEdit) {
          if (filteredBranches[0]?.name) setForBranch(filteredBranches[0].name);
          if (yearData[0]?.name) setAcademicYear(yearData[0].name);
        }

        if (assignmentId) {
          const doc = await getWorkAssignment(assignmentId);
          setTitle(doc.title || "");
          setDescription(doc.description || "");
          setAssignmentType(doc.topic || "");
          setForBranch(doc.for_branch || "");
          setAcademicYear(doc.academic_year || "");
          setDeadline((doc.deadline || "").split(" ")[0] || todayISO());
          const existing = (doc.assignments || []).map((a) => a.instructor).filter(Boolean);
          setSelectedInstructors(existing.length ? existing : [""]);
          setOriginalDocstatus(doc.docstatus ?? 0);
        }
      } catch (error: any) {
        toast.error(error?.message || "Failed to load form data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [assignmentId, isEdit]);

  useEffect(() => {
    const loadInstructorsForBranch = async () => {
      if (!forBranch) {
        setInstructors([]);
        setSelectedInstructors([""]);
        return;
      }

      try {
        setIsLoadingInstructors(true);
        const branchInstructors = await getInstructorsByCompany(forBranch);
        const mapped: InstructorOption[] = branchInstructors
          .map((ins) => ({ name: ins.name, instructor_name: ins.instructor_name }))
          .sort((a, b) => (a.instructor_name || a.name).localeCompare(b.instructor_name || b.name));

        setInstructors(mapped);

        const validNameSet = new Set(mapped.map((ins) => ins.name));
        setSelectedInstructors((prev) => {
          const kept = prev.filter((name) => !name || validNameSet.has(name));
          return kept.length ? kept : [""];
        });
      } catch (error: any) {
        setInstructors([]);
        setSelectedInstructors([""]);
        toast.error(error?.message || "Failed to load instructors for branch");
      } finally {
        setIsLoadingInstructors(false);
      }
    };

    loadInstructorsForBranch();
  }, [forBranch]);

  const setInstructorAt = (index: number, value: string) => {
    setSelectedInstructors((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addInstructorRow = () => {
    setSelectedInstructors((prev) => [...prev, ""]);
  };

  const removeInstructorRow = (index: number) => {
    setSelectedInstructors((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [""];
    });
  };

  const validate = (): string | null => {
    if (!title.trim()) return "Title is required";
    if (!assignmentType) return "Type is required";
    if (!forBranch) return "Branch is required";
    if (!deadline) return "Deadline is required";

    const today = new Date(todayISO());
    const selectedDate = new Date(deadline);
    // Only enforce future deadline when creating — editing may keep existing past deadlines
    if (!isEdit && selectedDate < today) return "Deadline must be today or a future date";

    const finalInstructors = selectedInstructors.filter(Boolean);
    if (finalInstructors.length === 0) return "At least one instructor is required";
    if (new Set(finalInstructors).size !== finalInstructors.length) return "Duplicate instructors are not allowed";

    return null;
  };

  const save = async (shouldSubmit: boolean) => {
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payload: WorkAssignmentCreatePayload = {
      naming_series: "WA-",
      title: title.trim(),
      description: description.trim(),
      // Reuse existing backend field for compatibility.
      topic: assignmentType,
      for_branch: forBranch,
      academic_year: academicYear || undefined,
      deadline,
      assignments: selectedInstructors.filter(Boolean).map((instructor) => ({ instructor })),
    };

    try {
      setIsSaving(true);
      const doc = isEdit && assignmentId
        ? await updateWorkAssignment(assignmentId, payload)
        : await createWorkAssignment(payload);

      if (isEdit && originalDocstatus === 1) {
        // updateWorkAssignment already cancelled + amended + submitted — no further action needed
        toast.success("Work assignment updated");
      } else if (shouldSubmit) {
        await submitWorkAssignment(doc.name);
        toast.success("Work assignment submitted and activated");
      } else {
        toast.success("Draft saved");
      }

      router.push(`${basePath}/${doc.name}`);
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Edit Work Assignment" : "Create Work Assignment"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Monthly Topic Review" />

          <div className="space-y-1.5">
            <label htmlFor="wa-description" className="text-sm font-medium text-text-secondary">Description</label>
            <textarea
              id="wa-description"
              className="min-h-24 w-full rounded-[10px] border border-border-input bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Assignment notes and context"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="wa-type" className="text-sm font-medium text-text-secondary">Type</label>
            <select
              id="wa-type"
              className="h-10 w-full rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary"
              value={assignmentType}
              onChange={(e) => setAssignmentType(e.target.value)}
            >
              <option value="">Select type</option>
              {ASSIGNMENT_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="wa-branch" className="text-sm font-medium text-text-secondary">Branch</label>
              <select
                id="wa-branch"
                className="h-10 w-full rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary"
                value={forBranch}
                onChange={(e) => setForBranch(e.target.value)}
              >
                <option value="">Select branch</option>
                {branches.map((branch) => (
                  <option key={branch.name} value={branch.name}>{branch.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="wa-year" className="text-sm font-medium text-text-secondary">Academic Year</label>
              <select
                id="wa-year"
                className="h-10 w-full rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              >
                <option value="">Select year</option>
                {years.map((year) => (
                  <option key={year.name} value={year.name}>{year.name}</option>
                ))}
              </select>
            </div>

            <Input label="Deadline" type="date" value={deadline} min={todayISO()} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Assigned Instructors</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addInstructorRow}
            disabled={!forBranch || instructors.length === 0 || isLoadingInstructors}
          >
            <Plus className="h-4 w-4" /> Add Row
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {!forBranch ? (
            <p className="text-sm text-text-tertiary">Select a branch to load instructors.</p>
          ) : isLoadingInstructors ? (
            <div className="flex items-center gap-2 py-2 text-sm text-text-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading instructors…
            </div>
          ) : null}

          {selectedInstructors.map((selected, index) => {
            const available = instructors.filter((ins) => !selectedSet.has(ins.name) || ins.name === selected);

            return (
              <div key={`wa-ins-${index}`} className="flex items-center gap-2">
                <select
                  className="h-10 flex-1 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary"
                  value={selected}
                  onChange={(e) => setInstructorAt(index, e.target.value)}
                  disabled={!forBranch || instructors.length === 0 || isLoadingInstructors}
                >
                  <option value="">
                    {isLoadingInstructors
                      ? "Loading instructors…"
                      : !forBranch
                      ? "Select branch first"
                      : instructors.length === 0
                      ? "No instructors found for this branch"
                      : "Select instructor"}
                  </option>
                  {available.map((ins) => (
                    <option key={ins.name} value={ins.name}>
                      {ins.instructor_name || ins.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => removeInstructorRow(index)}
                  aria-label="Remove instructor row"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push(basePath)}>Cancel</Button>
        {isEdit && originalDocstatus === 1 ? (
          <Button type="button" onClick={() => save(true)} loading={isSaving}>Update Assignment</Button>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={() => save(false)} loading={isSaving}>Save Draft</Button>
            <Button type="button" onClick={() => save(true)} loading={isSaving}>Save &amp; Submit</Button>
          </>
        )}
      </div>
    </div>
  );
};
