"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, GraduationCap, Layers3, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type StudentItem = {
  student_id: string;
  student_name: string;
  branch: string;
  program: string;
  student_group: string;
  level_code: string | null;
  board_code?: "state" | "cbse" | null;
};

type CatalogExam = {
  exam_id: string;
  title: string;
  subject_code: string;
  subject_name: string;
  level_code: string;
  board_code: "state" | "cbse";
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  available_from: string | null;
  available_until: string | null;
  status: "Draft" | "Published";
  source_file_name: string;
};

type CatalogResponse = {
  subjects: Array<{ code: string; name: string }>;
  exams: CatalogExam[];
};

type DisplayExamGroup = {
  id: string;
  level_code: string;
  subject_code: string;
  subject_name: string;
  title: string;
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  status: "Draft" | "Published";
  variant_exam_ids: string[];
};

async function fetchStudents() {
  const res = await fetch("/api/level-exams/gm/students", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch students");
  const json = await res.json();
  return json.data as StudentItem[];
}

async function fetchCatalog(levelCodes: string[], subjectCode?: string) {
  const query = new URLSearchParams();
  if (levelCodes.length) query.set("levelCodes", levelCodes.join(","));
  if (subjectCode) query.set("subjectCode", subjectCode);
  const res = await fetch(`/api/level-exams/gm/exams?${query.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch exams");
  const json = await res.json();
  return json.data as CatalogResponse;
}

async function publishExams(levelCodes: string[], examIds: string[]) {
  const res = await fetch("/api/level-exams/gm/assign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ levelCodes, examIds }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Failed to publish exams");
  return json.data as { assigned_count: number };
}

const LEVELS = ["8", "9", "10"] as const;

function sortLevels(levelA: string, levelB: string) {
  return Number(levelA) - Number(levelB);
}

function buildUnifiedExamTitle(levelCode: string, subjectName: string) {
  return `${levelCode}th ${subjectName} Level Exam`;
}

export default function GeneralManagerLevelExamAssignPage() {
  const queryClient = useQueryClient();
  const [selectedLevels, setSelectedLevels] = useState<string[]>(["8", "9", "10"]);
  const [subjectCode, setSubjectCode] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const studentsQuery = useQuery({
    queryKey: ["gm-level-exam-students"],
    queryFn: fetchStudents,
    staleTime: 30_000,
  });

  const catalogQuery = useQuery({
    queryKey: ["gm-level-exam-catalog-v3", selectedLevels.join(","), subjectCode],
    queryFn: () => fetchCatalog(selectedLevels, subjectCode || undefined),
    staleTime: 30_000,
  });

  const groupedStudents = useMemo(() => {
    const students = studentsQuery.data ?? [];
    return LEVELS.map((level) => ({
      level,
      total: students.filter((student) => student.level_code === level).length,
    }));
  }, [studentsQuery.data]);

  const groupedExams = useMemo(() => {
    const exams = catalogQuery.data?.exams ?? [];
    const byGroup = new Map<string, DisplayExamGroup>();

    for (const exam of exams) {
      const groupId = `${exam.level_code}-${exam.subject_code}`;
      const existing = byGroup.get(groupId);
      if (existing) {
        existing.variant_exam_ids.push(exam.exam_id);
        if (exam.status === "Published") existing.status = "Published";
        continue;
      }

      byGroup.set(groupId, {
        id: groupId,
        level_code: exam.level_code,
        subject_code: exam.subject_code,
        subject_name: exam.subject_name,
        title: buildUnifiedExamTitle(exam.level_code, exam.subject_name),
        duration_minutes: exam.duration_minutes,
        total_questions: exam.total_questions,
        total_marks: exam.total_marks,
        status: exam.status,
        variant_exam_ids: [exam.exam_id],
      });
    }

    const entries = Array.from(byGroup.values()).sort((a, b) => {
      const levelCompare = sortLevels(a.level_code, b.level_code);
      if (levelCompare !== 0) return levelCompare;
      return a.subject_name.localeCompare(b.subject_name);
    });

    return LEVELS.map((level) => ({
      level,
      items: entries.filter((entry) => entry.level_code === level),
    })).filter((group) => group.items.length > 0);
  }, [catalogQuery.data?.exams]);

  const visibleGroupIds = useMemo(
    () => groupedExams.flatMap((group) => group.items.map((item) => item.id)),
    [groupedExams],
  );

  const areAllVisibleSelected = useMemo(
    () => visibleGroupIds.length > 0 && visibleGroupIds.every((groupId) => selectedGroupIds.includes(groupId)),
    [selectedGroupIds, visibleGroupIds],
  );

  const flattenedSelectedExamIds = useMemo(() => {
    const groupMap = new Map<string, DisplayExamGroup>();
    for (const group of groupedExams) {
      for (const item of group.items) {
        groupMap.set(item.id, item);
      }
    }

    return selectedGroupIds.flatMap((groupId) => groupMap.get(groupId)?.variant_exam_ids ?? []);
  }, [groupedExams, selectedGroupIds]);

  const publishMutation = useMutation({
    mutationFn: () => publishExams(selectedLevels, flattenedSelectedExamIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gm-level-exam-catalog-v3"] });
      queryClient.invalidateQueries({ queryKey: ["parent-level-exams"] });
      setSelectedGroupIds([]);
    },
  });

  function toggleLevel(level: string) {
    setSelectedLevels((current) =>
      current.includes(level) ? current.filter((item) => item !== level) : [...current, level].sort(sortLevels),
    );
    setSelectedGroupIds([]);
  }

  function toggleExamGroup(groupId: string) {
    setSelectedGroupIds((current) =>
      current.includes(groupId) ? current.filter((item) => item !== groupId) : [...current, groupId],
    );
  }

  function toggleSelectAllVisible() {
    setSelectedGroupIds((current) => {
      if (areAllVisibleSelected) {
        return current.filter((groupId) => !visibleGroupIds.includes(groupId));
      }

      return Array.from(new Set([...current, ...visibleGroupIds]));
    });
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">Publish Level Exams</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage one common exam bank for `8th`, `9th`, and `10th`. Publishing a selected exam will assign it to both
            `State` and `CBSE` students automatically.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/general-manager/level-exams">
            <ArrowLeft className="h-4 w-4" />
            Back to Level Exams
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Coverage</CardTitle>
              <CardDescription>
                Level exam publishing now works class-wise only. State and CBSE students are combined under the same class.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {groupedStudents.map((item) => (
                <div key={item.level} className="rounded-[12px] border border-border-light bg-app-bg p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-text-primary">{item.level}th</p>
                    <GraduationCap className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-text-primary">{item.total}</p>
                  <p className="text-sm text-text-secondary">students available for publishing</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Publishing Rule</CardTitle>
              <CardDescription>What changed in the new exam setup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-text-secondary">
              <div className="rounded-[12px] border border-border-light bg-app-bg p-4">
                Exams are shown only by class and subject.
              </div>
              <div className="rounded-[12px] border border-border-light bg-app-bg p-4">
                State and CBSE are no longer shown as separate publish options.
              </div>
              <div className="rounded-[12px] border border-border-light bg-app-bg p-4">
                When you publish one exam, both board mappings are included automatically in the background.
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Published Exam Setup</CardTitle>
            <CardDescription>
              Filter by class and subject, then publish the required exam once for the full level.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {studentsQuery.error instanceof Error && (
              <div className="rounded-[12px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Student coverage failed to load: {studentsQuery.error.message}
              </div>
            )}

            {catalogQuery.error instanceof Error && (
              <div className="rounded-[12px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Exam catalog failed to load: {catalogQuery.error.message}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {LEVELS.map((level) => (
                <Button
                  key={level}
                  size="sm"
                  variant={selectedLevels.includes(level) ? "primary" : "outline"}
                  onClick={() => toggleLevel(level)}
                >
                  {level}th
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={subjectCode ? "outline" : "primary"} onClick={() => setSubjectCode("")}>
                All Subjects
              </Button>
              {(catalogQuery.data?.subjects ?? []).map((subject) => (
                <Button
                  key={subject.code}
                  size="sm"
                  variant={subjectCode === subject.code ? "primary" : "outline"}
                  onClick={() => setSubjectCode(subject.code)}
                >
                  {subject.name}
                </Button>
              ))}
            </div>

            {visibleGroupIds.length > 0 && (
              <div className="flex items-center justify-between gap-3 flex-wrap rounded-[12px] border border-border-light bg-surface px-4 py-3">
                <p className="text-sm text-text-secondary">
                  {selectedGroupIds.length} exam selected from the current filtered list.
                </p>
                <Button size="sm" variant="outline" onClick={toggleSelectAllVisible}>
                  {areAllVisibleSelected ? "Clear All" : "Select All"}
                </Button>
              </div>
            )}

            <div className="space-y-5">
              {groupedExams.map((group) => (
                <div key={group.level} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-text-primary">{group.level}th</h3>
                    <Badge variant="outline">{group.items.length}</Badge>
                  </div>

                  {group.items.map((exam) => {
                    const selected = selectedGroupIds.includes(exam.id);
                    return (
                      <button
                        key={exam.id}
                        onClick={() => toggleExamGroup(exam.id)}
                        className={`w-full rounded-[12px] border p-4 text-left transition-colors ${
                          selected ? "border-primary bg-primary/5" : "border-border-light bg-app-bg hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <p className="font-semibold text-text-primary">{exam.title}</p>
                            <p className="mt-1 text-xs text-text-secondary">
                              {exam.subject_name} | {exam.total_questions} questions | {exam.duration_minutes} min
                            </p>
                            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs text-text-secondary">
                              <Layers3 className="h-3.5 w-3.5 text-primary" />
                              Publishes to State and CBSE students
                            </div>
                          </div>
                          <Badge variant={exam.status === "Published" ? "success" : "outline"}>{exam.status}</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}

              {groupedExams.length === 0 && (
                <div className="rounded-[12px] border border-dashed border-border-light bg-app-bg p-8 text-center text-sm text-text-secondary">
                  No exams found for the selected filter.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap rounded-[12px] border border-border-light bg-surface p-4">
              <p className="text-sm text-text-secondary">
                {selectedGroupIds.length} exam selected. Publish will assign it to matching students in both boards for the chosen class.
              </p>
              <Button
                onClick={() => publishMutation.mutate()}
                loading={publishMutation.isPending}
                disabled={selectedGroupIds.length === 0}
              >
                <Send className="h-4 w-4" />
                Publish Exam
              </Button>
            </div>

            {publishMutation.isSuccess && (
              <div className="rounded-[12px] border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                Exam published successfully to matching students.
              </div>
            )}

            {publishMutation.error instanceof Error && (
              <div className="rounded-[12px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {publishMutation.error.message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
