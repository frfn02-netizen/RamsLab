import { z } from "zod";
import { MEETING_MODES } from "../meetings/meeting.types.js";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(100).optional(),
);

export const publicScheduleQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: optionalText,
    mode: z.enum(MEETING_MODES).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine(
    (value) => !(value.from && value.to) || value.to.getTime() > value.from.getTime(),
    { path: ["to"], message: "Range end must be after range start" },
  );

export type PublicScheduleQueryInput = z.infer<typeof publicScheduleQuerySchema>;
