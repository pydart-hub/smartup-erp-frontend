import type {
  MentorFeedback,
  MentorProfile,
  MentorStudentAssignment,
  MentorStudentDetail,
  MentorStudentSummary,
} from "@/lib/types/mentor";

export async function getBranchMentors(branch?: string): Promise<MentorProfile[]> {
  const params = new URLSearchParams();
  if (branch) params.set("branch", branch);
  const res = await fetch(`/api/branch-manager/mentors?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch mentors");
  const json = await res.json();
  return json.data ?? [];
}

export async function createMentorProfile(payload: {
  mentor_name: string;
  employee: string;
  user_id: string;
  branch?: string;
  max_student_limit?: number;
  remarks?: string;
}): Promise<MentorProfile> {
  const res = await fetch("/api/branch-manager/mentors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Failed to create mentor");
  return json.data;
}

export async function getMentorAssignments(branch?: string): Promise<MentorStudentAssignment[]> {
  const params = new URLSearchParams();
  if (branch) params.set("branch", branch);
  const res = await fetch(`/api/branch-manager/mentor-assignments?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch mentor assignments");
  const json = await res.json();
  return json.data ?? [];
}

export async function createMentorAssignment(payload: {
  student: string;
  mentor_profile: string;
  notes?: string;
}): Promise<MentorStudentAssignment> {
  const res = await fetch("/api/branch-manager/mentor-assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Failed to assign student");
  return json.data;
}

export async function reassignMentorAssignment(id: string, payload: {
  mentor_profile: string;
  notes?: string;
}): Promise<MentorStudentAssignment> {
  const res = await fetch(`/api/branch-manager/mentor-assignments/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Failed to reassign student");
  return json.data;
}

export async function getMentorStudents(): Promise<MentorStudentSummary[]> {
  const res = await fetch("/api/mentor/students", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch mentor students");
  const json = await res.json();
  return json.data ?? [];
}

export async function getMentorStudentDetail(id: string): Promise<MentorStudentDetail> {
  const res = await fetch(`/api/mentor/students/${encodeURIComponent(id)}`, {
    credentials: "include",
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Failed to fetch mentor student detail");
  return json.data;
}

export async function getBranchManagerMentorStudentDetail(id: string): Promise<MentorStudentDetail> {
  const res = await fetch(`/api/branch-manager/mentor-students/${encodeURIComponent(id)}`, {
    credentials: "include",
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Failed to fetch branch manager mentor student detail");
  return json.data;
}

export async function getDirectorMentorStudentDetail(id: string): Promise<MentorStudentDetail> {
  const res = await fetch(`/api/director/mentor-students/${encodeURIComponent(id)}`, {
    credentials: "include",
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Failed to fetch director mentor student detail");
  return json.data;
}

export async function getMentorFeedback(params?: {
  branch?: string;
  mentor_user?: string;
  student?: string;
}): Promise<MentorFeedback[]> {
  const search = new URLSearchParams();
  if (params?.branch) search.set("branch", params.branch);
  if (params?.mentor_user) search.set("mentor_user", params.mentor_user);
  if (params?.student) search.set("student", params.student);
  const res = await fetch(`/api/mentor/feedback?${search.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch mentor feedback");
  const json = await res.json();
  return json.data ?? [];
}

export async function createMentorFeedback(payload: {
  student: string;
  contact_person?: string;
  contact_number?: string;
  call_status: string;
  discussion_category: string;
  academic_notes?: string;
  fee_notes?: string;
  contact_notes?: string;
  overall_feedback?: string;
  next_followup_date?: string;
  priority?: string;
  action_required?: boolean;
}): Promise<MentorFeedback> {
  const res = await fetch("/api/mentor/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Failed to create mentor feedback");
  return json.data;
}

export async function getGMMentorSummary(branch?: string): Promise<import("@/lib/types/mentor").SystemMentorSummary> {
  const params = new URLSearchParams();
  if (branch) params.set("branch", branch);
  const res = await fetch(`/api/general-manager/mentor-summary?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch GM mentor summary");
  const json = await res.json();
  return json.data;
}

export async function getBranchMentorSummary(branch?: string): Promise<import("@/lib/types/mentor").SystemMentorSummary> {
  const params = new URLSearchParams();
  if (branch) params.set("branch", branch);
  const res = await fetch(`/api/branch-manager/mentor-summary?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch branch mentor summary");
  const json = await res.json();
  return json.data;
}


export async function getMentorUserIds(): Promise<string[]> {
  const res = await fetch("/api/mentors/users", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch mentor users");
  const json = await res.json();
  return json.data ?? [];
}
