import type {
  AlumniFormInput,
  AlumniListParams,
  AlumniListResponse,
  AlumniRecord,
} from "@/lib/types/alumni";

function buildQuery(params: AlumniListParams): string {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.passout_year) query.set("passout_year", params.passout_year);
  if (params.qualification_level) query.set("qualification_level", params.qualification_level);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  return query.toString();
}

export async function getDirectorAlumniList(params: AlumniListParams): Promise<AlumniListResponse> {
  const query = buildQuery(params);
  const res = await fetch(`/api/director/alumni${query ? `?${query}` : ""}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to load alumni" }));
    throw new Error(err.error || "Failed to load alumni");
  }
  return (await res.json()) as AlumniListResponse;
}

export async function createDirectorAlumni(payload: AlumniFormInput): Promise<AlumniRecord> {
  const res = await fetch("/api/director/alumni", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create alumni" }));
    throw new Error(err.error || "Failed to create alumni");
  }
  const json = await res.json();
  return json.data as AlumniRecord;
}

export async function getDirectorAlumniById(id: string): Promise<AlumniRecord> {
  const res = await fetch(`/api/director/alumni/${encodeURIComponent(id)}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to load alumni detail" }));
    throw new Error(err.error || "Failed to load alumni detail");
  }
  const json = await res.json();
  return json.data as AlumniRecord;
}

export async function deleteDirectorAlumni(id: string): Promise<void> {
  const res = await fetch(`/api/director/alumni/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to delete alumni" }));
    throw new Error(err.error || "Failed to delete alumni");
  }
}

export async function updateDirectorAlumni(id: string, payload: AlumniFormInput): Promise<AlumniRecord> {
  const res = await fetch(`/api/director/alumni/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update alumni" }));
    throw new Error(err.error || "Failed to update alumni");
  }
  const json = await res.json();
  return json.data as AlumniRecord;
}
