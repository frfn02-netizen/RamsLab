import { z } from "zod";
import { LAB_MEMBERSHIP_STATUSES } from "./lab-membership.types.js";

const objectId = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Invalid user id");

export const addLabMembershipSchema = z.object({
  userId: objectId,
});

export const updateLabMembershipSchema = z.object({
  status: z.enum(LAB_MEMBERSHIP_STATUSES),
});

export type AddLabMembershipInput = z.infer<typeof addLabMembershipSchema>;
export type UpdateLabMembershipInput = z.infer<
  typeof updateLabMembershipSchema
>;
