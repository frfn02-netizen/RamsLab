import { z } from "zod";

import {
  TRACKING_TYPES,
} from "./tracking.types.js";

export const createTrackingSchema =
  z.object({
    type: z.enum([
      TRACKING_TYPES.GRADUATION,
      TRACKING_TYPES.EMPLOYMENT,
      TRACKING_TYPES.PROMOTION,
      TRACKING_TYPES.EDUCATION,
      TRACKING_TYPES.ENTREPRENEURSHIP,
      TRACKING_TYPES.JOB_SEEKING,
      TRACKING_TYPES.OTHER,
    ]),

    title: z
      .string()
      .trim()
      .min(2, "Title is required"),

    company: z
      .string()
      .trim()
      .optional(),

    position: z
      .string()
      .trim()
      .optional(),

    institution: z
      .string()
      .trim()
      .optional(),

    location: z
      .string()
      .trim()
      .optional(),

    startDate: z.coerce.date(),

    endDate: z
      .coerce
      .date()
      .nullable(),

    description: z
      .string()
      .trim()
      .max(1000)
      .optional(),
  });

export const updateTrackingSchema =
  createTrackingSchema.partial();

export type CreateTrackingInput =
  z.infer<
    typeof createTrackingSchema
  >;

export type UpdateTrackingInput =
  z.infer<
    typeof updateTrackingSchema
  >;