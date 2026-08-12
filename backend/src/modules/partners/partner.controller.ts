import type {
  Request,
  Response,
} from "express";

import {
  ObjectId,
} from "mongodb";

import {
  createPartnerSchema,
  updatePartnerSchema,
} from "./partner.schema.js";

import {
  PARTNER_TYPE,
} from "./partner.types.js";

import {
  createPartner,
  deletePartner,
  findPartnerById,
  findUniversityPartners,
  updatePartner,
} from "./partner.repository.js";


// ========================================
// GET UNIVERSITY PARTNERS
// ========================================

export async function getUniversityPartnerListController(
  _req: Request,
  res: Response
) {
  try {
    const partners =
      await findUniversityPartners();

    return res.json({
      success: true,
      data: partners,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch university partners",
    });
  }
}


// ========================================
// GET UNIVERSITY PARTNER BY ID
// ========================================

export async function getUniversityPartnerController(
  req: Request,
  res: Response
) {
  try {

    const id = req.params.id as string;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid partner ID",
      });
    }

    const partner =
      await findPartnerById(id);

    if (
      !partner ||
      partner.type !== PARTNER_TYPE.UNIVERSITY
    ) {
      return res.status(404).json({
        success: false,
        message:
          "University partner not found",
      });
    }

    return res.json({
      success: true,
      data: partner,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch university partner",
    });
  }
}


// ========================================
// CREATE UNIVERSITY PARTNER
// ========================================

export async function createUniversityPartnerController(
  req: Request,
  res: Response
) {
  try {
    const input =
      createPartnerSchema.parse({
        ...req.body,
        type: PARTNER_TYPE.UNIVERSITY,
      });

    const partner =
      await createPartner(input);

    return res.status(201).json({
      success: true,
      data: partner,
    });
  } catch (error: any) {

    if (
      error?.name === "ZodError"
    ) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create university partner",
    });
  }
}


// ========================================
// UPDATE UNIVERSITY PARTNER
// ========================================

export async function updateUniversityPartnerController(
  req: Request,
  res: Response
) {
  try {

    const id = req.params.id as string;
   
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid partner ID",
      });
    }

    const existing =
      await findPartnerById(id);

    if (
      !existing ||
      existing.type !== PARTNER_TYPE.UNIVERSITY
    ) {
      return res.status(404).json({
        success: false,
        message:
          "University partner not found",
      });
    }

    const input =
      updatePartnerSchema.parse(
        req.body
      );

    const partner =
      await updatePartner(
        id,
        {
          ...input,
          type: PARTNER_TYPE.UNIVERSITY,
        }
      );

    if (!partner) {
      return res.status(404).json({
        success: false,
        message:
          "University partner not found",
      });
    }

    return res.json({
      success: true,
      data: partner,
    });
  } catch (error: any) {

    if (
      error?.name === "ZodError"
    ) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update university partner",
    });
  }
}


// ========================================
// DELETE UNIVERSITY PARTNER
// ========================================

export async function deleteUniversityPartnerController(
  req: Request,
  res: Response
) {
  try {

    const id = req.params.id as string;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid partner ID",
      });
    }

    const existing =
      await findPartnerById(id);

    if (
      !existing ||
      existing.type !== PARTNER_TYPE.UNIVERSITY
    ) {
      return res.status(404).json({
        success: false,
        message:
          "University partner not found",
      });
    }

    const deleted =
      await deletePartner(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message:
          "University partner not found",
      });
    }

    return res.json({
      success: true,
      message:
        "University partner deleted successfully",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message:
        "Failed to delete university partner",
    });
  }
}