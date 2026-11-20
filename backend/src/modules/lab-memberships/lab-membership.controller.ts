import type { Request, Response } from "express";
import { ZodError } from "zod";

import { HttpError } from "../../middlewares/error.middleware.js";
import {
  addLabMembership,
  deactivateLabMembership,
  listLabMembershipEntries,
  searchLabMembershipCandidates,
  updateLabMembership,
} from "./lab-membership.service.js";
import {
  addLabMembershipSchema,
  updateLabMembershipSchema,
} from "./lab-membership.schema.js";
import { LAB_MEMBERSHIP_STATUSES } from "./lab-membership.types.js";

function fail(res: Response, error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.issues,
    });
  }
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.code ? { code: error.code } : {}),
    });
  }
  return res.status(500).json({ success: false, message: fallback });
}

function readInteger(value: unknown): number | undefined {
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    return undefined;
  }
  return Number(value);
}

export async function listLabMembershipsController(
  req: Request,
  res: Response,
) {
  try {
    const status =
      typeof req.query.status === "string" &&
      LAB_MEMBERSHIP_STATUSES.includes(
        req.query.status.trim() as (typeof LAB_MEMBERSHIP_STATUSES)[number],
      )
        ? (req.query.status.trim() as (typeof LAB_MEMBERSHIP_STATUSES)[number])
        : undefined;

    const result = await listLabMembershipEntries({
      actor: req.user!,
      query: typeof req.query.q === "string" ? req.query.q : undefined,
      status,
      limit: readInteger(req.query.limit),
      offset: readInteger(req.query.offset),
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    return fail(res, error, "Failed to fetch lab memberships");
  }
}

export async function searchLabMembershipCandidatesController(
  req: Request,
  res: Response,
) {
  try {
    const candidates = await searchLabMembershipCandidates({
      actor: req.user!,
      query: typeof req.query.q === "string" ? req.query.q : undefined,
      limit: readInteger(req.query.limit),
    });
    return res.json({ success: true, data: candidates });
  } catch (error) {
    return fail(res, error, "Failed to search eligible users");
  }
}

export async function addLabMembershipController(
  req: Request,
  res: Response,
) {
  try {
    const input = addLabMembershipSchema.parse(req.body);
    const membership = await addLabMembership({
      actor: req.user!,
      userId: input.userId,
    });
    return res.status(201).json({ success: true, data: membership });
  } catch (error) {
    return fail(res, error, "Failed to add lab membership");
  }
}

export async function updateLabMembershipController(
  req: Request,
  res: Response,
) {
  try {
    const input = updateLabMembershipSchema.parse(req.body);
    const membership = await updateLabMembership({
      actor: req.user!,
      userId: req.params.userId as string,
      status: input.status,
    });
    return res.json({ success: true, data: membership });
  } catch (error) {
    return fail(res, error, "Failed to update lab membership");
  }
}

export async function deactivateLabMembershipController(
  req: Request,
  res: Response,
) {
  try {
    const membership = await deactivateLabMembership({
      actor: req.user!,
      userId: req.params.userId as string,
    });
    return res.json({ success: true, data: membership });
  } catch (error) {
    return fail(res, error, "Failed to deactivate lab membership");
  }
}
