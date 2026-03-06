"use client";

import { useQuery } from "@tanstack/react-query";
import { getBatches, getBatch } from "@/lib/api/batches";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";
import type { Batch } from "@/lib/types/batch";

/** A row from the Instructor doc → instructor_log child table */
interface InstructorLogEntry {
  program: string;
  course?: string;
  custom_branch: string;
  academic_year?: string;
}

/** Fetch the Instructor doc (contains instructor_log child table) */
async function getInstructorDoc(name: string) {
  const { data } = await apiClient.get(
    `/resource/Instructor/${encodeURIComponent(name)}`
  );
  return data.data as {
    name: string;
    instructor_name: string;
    instructor_log?: InstructorLogEntry[];
  };
}

/**
 * Shared hook that fetches all Student Groups the instructor has access to.
 *
 * Scoping works by reading the Instructor doc's `instructor_log` child table
 * which lists (program, custom_branch) pairs the instructor is assigned to.
 * Student Groups are matched against those pairs.
 */
export function useInstructorBatches() {
  const { defaultCompany, allowedBatches, isInstructor, instructorName } =
    useAuthStore();

  const query = useQuery<Batch[]>({
    queryKey: ["instructor-all-batches", defaultCompany, instructorName],
    queryFn: async () => {
      if (!instructorName) return [];

      // Step 1: Fetch the Instructor doc to get instructor_log assignments
      const instrDoc = await getInstructorDoc(instructorName);
      const logEntries = instrDoc.instructor_log ?? [];

      if (logEntries.length === 0) return [];

      // Build a set of "program|branch" keys for fast lookup
      const assignmentKeys = new Set(
        logEntries.map((e) => `${e.program}|${e.custom_branch}`)
      );

      // Step 2: Get list of Student Group IDs.
      // The list endpoint only returns scalar fields (no child tables).
      const listRes = await getBatches({ limit_page_length: 500 });
      const allGroups = listRes.data ?? [];

      // Step 3: Filter to only groups matching an instructor_log entry
      const matchedGroups = allGroups.filter((sg) => {
        const key = `${sg.program ?? ""}|${sg.custom_branch ?? ""}`;
        return assignmentKeys.has(key);
      });

      if (matchedGroups.length === 0) return [];

      // Step 4: Fetch each matched Student Group individually to get the
      // full doc including the `students` child table (for counts & list).
      const fullDocs = await Promise.all(
        matchedGroups.map((sg) =>
          getBatch(sg.name)
            .then((r) => r.data)
            .catch(() => null)
        )
      );

      return fullDocs.filter((d): d is Batch => d !== null);
    },
    enabled: isInstructor && !!instructorName,
    staleTime: 60_000,
  });

  const batches = query.data ?? [];
  const activeBatches = batches.filter((b) => !b.disabled);

  // Set of Student Group names this instructor can access
  const allowedGroupNames = new Set(batches.map((b) => b.name));

  /**
   * Check if a given Student Group ID belongs to this instructor.
   * Use this to guard batch detail pages, attendance marking, etc.
   */
  function isBatchAllowed(studentGroupId: string): boolean {
    return allowedGroupNames.has(studentGroupId);
  }

  /**
   * Fetch a single batch by ID.
   * Frappe will return a 403 if the instructor doesn't have access,
   * so we just attempt the fetch. Returns null on failure.
   */
  async function getVerifiedBatch(studentGroupId: string): Promise<Batch | null> {
    try {
      const res = await getBatch(studentGroupId);
      return res.data;
    } catch {
      return null;
    }
  }

  return {
    /** All Student Groups (active + disabled) for this instructor */
    batches,
    /** Only active Student Groups */
    activeBatches,
    /** Total active students across all batches */
    totalStudents: activeBatches.reduce(
      (sum, b) => sum + (b.students?.filter((s) => s.active !== 0).length ?? 0),
      0
    ),
    /** Whether the batches query is loading */
    isLoading: query.isLoading,
    /** Whether the batches query errored */
    isError: query.isError,
    /** Error object */
    error: query.error,
    /** Refetch batches */
    refetch: query.refetch,
    /** Check if a Student Group ID is allowed for this instructor */
    isBatchAllowed,
    /** Fetch & verify a single batch */
    getVerifiedBatch,
    /** Raw set of allowed Student Group names */
    allowedGroupNames,
  };
}
