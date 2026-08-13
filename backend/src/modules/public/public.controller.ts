import type {
  Request,
  Response,
} from "express";

import {
  findAllProjects,
  findProjectBySlug,
} from "../projects/project.repository.js";

// import {
//   PARTNER_TYPE,
// } from "../partners/partner.types.js";

import {
  findUniversityPartners,
  findIndustrialPartners,
} from "../partners/partner.repository.js";


// ========================================
// PUBLIC PROJECTS
// ========================================

export async function getPublicProjectsController(
  _req: Request,
  res: Response
) {
  try {
    const projects =
      await findAllProjects({
        publishedOnly: true,
      });

    return res.json({
      success: true,
      data: projects,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch public projects",
    });
  }
}


// ========================================
// PUBLIC PROJECT BY SLUG
// ========================================

export async function getPublicProjectController(
  req: Request,
  res: Response
) {
  try {
    const slug = req.params.slug as string;
    const project =
      await findProjectBySlug(slug);

    if (
      !project ||
      !project.published
    ) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.json({
      success: true,
      data: project,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch public project",
    });
  }
}


// ========================================
// PUBLIC UNIVERSITY PARTNERS
// ========================================

export async function getPublicUniversityPartnersController(
  _req: Request,
  res: Response
) {
  try {
    const partners =
      await findUniversityPartners({
        publishedOnly: true,
      });

    return res.json({
      success: true,
      data: partners,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch public university partners",
    });
  }
}


// ========================================
// PUBLIC INDUSTRIAL PARTNERS
// ========================================

export async function getPublicIndustrialPartnersController(
  _req: Request,
  res: Response
) {
  try {
    const partners =
      await findIndustrialPartners({
        publishedOnly: true,
      });

    return res.json({
      success: true,
      data: partners,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch public industrial partners",
    });
  }
}