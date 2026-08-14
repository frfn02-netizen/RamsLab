import type {
  Request,
  Response,
} from "express";

import {
  ObjectId,
} from "mongodb";

import {
  createPartnerDetailsSchema,
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
  findIndustrialPartners
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
    const parsed = createPartnerDetailsSchema.parse(req.body);
    const input = { ...parsed, type: PARTNER_TYPE.UNIVERSITY };

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
        input
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
// ========================================
// GET INDUSTRIAL PARTNERS
// ========================================

export async function getIndustrialPartnerListController(
  _req: Request,
  res: Response
) {
  try {
    const partners =
      await findIndustrialPartners();

    return res.json({
      success: true,
      data: partners,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch industrial partners",
    });
  }
}


// ========================================
// GET INDUSTRIAL PARTNER BY ID
// ========================================

export async function getIndustrialPartnerController(
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
      partner.type !== PARTNER_TYPE.INDUSTRIAL
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Industrial partner not found",
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
        "Failed to fetch industrial partner",
    });
  }
}


// ========================================
// CREATE INDUSTRIAL PARTNER
// ========================================

export async function createIndustrialPartnerController(
  req: Request,
  res: Response
) {
  try {
    const parsed = createPartnerDetailsSchema.parse(req.body);
    const input = { ...parsed, type: PARTNER_TYPE.INDUSTRIAL };

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
        "Failed to create industrial partner",
    });
  }
}


// ========================================
// UPDATE INDUSTRIAL PARTNER
// ========================================

export async function updateIndustrialPartnerController(
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
      existing.type !== PARTNER_TYPE.INDUSTRIAL
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Industrial partner not found",
      });
    }

    const input =
      updatePartnerSchema.parse(
        req.body
      );

    const partner =
      await updatePartner(
        id,
        input
      );

    if (!partner) {
      return res.status(404).json({
        success: false,
        message:
          "Industrial partner not found",
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
        "Failed to update industrial partner",
    });
  }
}


// ========================================
// DELETE INDUSTRIAL PARTNER
// ========================================

export async function deleteIndustrialPartnerController(
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
      existing.type !== PARTNER_TYPE.INDUSTRIAL
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Industrial partner not found",
      });
    }

    const deleted =
      await deletePartner(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message:
          "Industrial partner not found",
      });
    }

    return res.json({
      success: true,
      message:
        "Industrial partner deleted successfully",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message:
        "Failed to delete industrial partner",
    });
  }
}
