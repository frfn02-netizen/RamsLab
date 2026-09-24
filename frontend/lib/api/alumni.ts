import { apiRequest, apiRequestWithMeta } from "./client";
import type {
  Alumni,
  AlumniAuditLog,
  AlumniCreateInput,
  AlumniListParams,
  AlumniListResponse,
  AlumniUpdateInput,
} from "@/types/alumni";

export async function getAlumniList(
  params: AlumniListParams = {},
): Promise<AlumniListResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });
  if (params.search?.trim()) query.set("search", params.search.trim());
  const response = await apiRequestWithMeta<Alumni[]>(
    `/alumni?${query.toString()}`,
  );
  return {
    data: response.data ?? [],
    total: typeof response.total === "number" ? response.total : 0,
  };
}

export function getAlumniById(id: string) {
  return apiRequest<Alumni>(`/alumni/${encodeURIComponent(id)}`);
}
export function createAlumni(input: AlumniCreateInput) {
  return apiRequest<Alumni>("/alumni", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function createAdminAlumni(input: Record<string, unknown>) {
  return apiRequest<{ user: unknown; alumni: Alumni }>("/alumni/admin", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function uploadMyAlumniPhoto(file: File) {
  return apiRequest<Alumni>("/alumni/me/photo", {
    method: "POST",
    body: file,
    headers: { "Content-Type": file.type },
    timeoutMs: 30000,
  });
}
export function updateAlumni(id: string, input: AlumniUpdateInput) {
  return apiRequest<Alumni>(`/alumni/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
export function setAlumniActive(id: string, isActive: boolean) {
  return apiRequest<{ isActive: boolean }>(
    `/alumni/${encodeURIComponent(id)}/account-status`,
    { method: "PATCH", body: JSON.stringify({ isActive }) },
  );
}
export function reviewAlumni(id: string, action: "APPROVE" | "REJECT") {
  return apiRequest<Alumni>(`/alumni/${encodeURIComponent(id)}/review`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });
}
export async function deleteAlumni(id: string) {
  await apiRequestWithMeta(`/alumni/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
export function getMyAlumni() {
  return apiRequest<Alumni>("/alumni/me");
}
export function updateMyAlumni(input: AlumniUpdateInput) {
  return apiRequest<Alumni>("/alumni/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function getMyAuditLogs() {
  return apiRequest<AlumniAuditLog[]>("/alumni/me/history");
}

export function getAlumniAuditLogs(id: string) {
  return apiRequest<
    (AlumniAuditLog & { userName?: string; alumniFullName?: string })[]
  >(`/alumni/${encodeURIComponent(id)}/history`);
}

export type { AlumniAuditLog } from "@/types/alumni";
