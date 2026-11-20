import { apiRequest } from "./client";
import type {
  AgendaCoordinatorPage,
  AgendaCoordinatorStudent,
} from "@/types/agenda-coordinators";

export const getAgendaCoordinatorStudents = (params: {
  q?: string;
  limit?: number;
  offset?: number;
} = {}) => {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  return apiRequest<AgendaCoordinatorPage>(
    `/users/agenda-coordinators${query.size ? `?${query.toString()}` : ""}`,
  );
};

export const setAgendaCoordinatorAccess = (
  userId: string,
  enabled: boolean,
) =>
  apiRequest<AgendaCoordinatorStudent>(
    `/users/${encodeURIComponent(userId)}/agenda-access`,
    {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    },
  );
