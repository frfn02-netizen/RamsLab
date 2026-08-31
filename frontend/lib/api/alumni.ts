import { apiRequest, apiRequestWithMeta } from "./client";
import type {
  Alumni,
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
export function updateAlumni(id: string, input: AlumniUpdateInput) {
  return apiRequest<Alumni>(`/alumni/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
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
