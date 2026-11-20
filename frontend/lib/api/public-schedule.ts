import { apiRequest, apiRequestWithMeta } from "./client";
import type {
  PublicScheduleMeeting,
  PublicSchedulePage,
} from "@/types/public-schedule";

export async function getPublicSchedule(params: {
  q?: string;
  mode?: "OFFLINE" | "ONLINE";
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
} = {}): Promise<PublicSchedulePage> {
  const query = new URLSearchParams();
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.mode) query.set("mode", params.mode);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));

  const response = await apiRequestWithMeta<PublicScheduleMeeting[]>(
    `/public/schedule${query.size ? `?${query.toString()}` : ""}`,
  );
  if (!response.data) {
    throw new Error("Public schedule response was invalid");
  }
  const page = response.page ?? params.page ?? 1;
  const limit = response.limit ?? params.limit ?? response.data.length;
  const total = response.total ?? response.data.length;
  return {
    items: response.data,
    total,
    page,
    limit,
    totalPages:
      response.totalPages ?? (limit > 0 ? Math.ceil(total / limit) : 0),
    hasMore: response.hasMore ?? page * limit < total,
  };
}

export function getPublicScheduleMeeting(id: string) {
  return apiRequest<PublicScheduleMeeting>(
    `/public/schedule/${encodeURIComponent(id)}`,
  );
}
