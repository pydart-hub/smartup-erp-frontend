"use client";

import { useQuery } from "@tanstack/react-query";
import { getBatches, getBatch } from "@/lib/api/batches";
import { useAuthStore } from "@/lib/stores/authStore";
import type { Batch } from "@/lib/types/batch";

/**
 * Shared hook that fetches all Student Groups the instructor has access to.
 *
 * Scoping is enforced by the Frappe backend via User Permissions:
 *  - The instructor's own API token is used for all requests.
 *  - Frappe restricts results to only the Company and Student Batch Name
 *    values assigned to the instructor via User Permission records.
 *  - No client-side filter injection is needed.
 */
export function useInstructorBatches() {
  const { defaultCompany, allowedBatches, isInstructor } = useAuthStore();

  const query = useQuery<Batch[]>({
    queryKey: ["instructor-all-batches", defaultCompany],
    queryFn: async () => {
      // Step 1: Get list of Student Group IDs the instructor can access.
      // The list endpoint only returns scalar fields (no child tables).
      const listRes = await getBatches({ limit_page_length: 500 });
      const ids = (listRes.data ?? []).map((b) => b.name);

      if (ids.length === 0) return [];

      // Step 2: Fetch each Student Group individually to get the full doc
      // including the `students` child table (needed for counts & student list).
      const fullDocs = await Promise.all(
        ids.map((id) =>
          getBatch(id)
            .then((r) => r.data)
            .catch(() => null)
        )
      );

      return fullDocs.filter((d): d is Batch => d !== null);
    },
    enabled: isInstructor,
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
