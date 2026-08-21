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
import { findAllDosen } from "../dosen/dosen.repository.js";
import { findPublicAlumni } from "../alumni/alumni.repository.js";
import { findAllStudents } from "../students/student.repository.js";
import { toPublicAlumniProfile, toPublicDosenProfile, toPublicStudentProfile } from "./public-profile.js";
import { safeHttpUrl } from "../../lib/url-security.js";

function toPublicPartner(partner: Awaited<ReturnType<typeof findUniversityPartners>>[number]) {
  return {
    ...partner,
    _id: partner._id?.toString(),
    website: safeHttpUrl(partner.website),
    logo: safeHttpUrl(partner.logo),
  };
}

export async function getPublicPeopleController(
  req: Request,
  res: Response,
) {
  try {
    const [dosen, students] = await Promise.all([
      findAllDosen({ publicOnly: true }),
      findAllStudents({ publicOnly: true }),
    ]);

    return res.json({
      success: true,
      data: {
        DOSEN: dosen.map((member) => toPublicDosenProfile(req, member)),
        // The current schema has no student collection yet. Keep the
        // active student categories available without inventing records.
        MAHASISWA: students.filter((student) => student.studentType === "PHD_STUDENT").map((student) => toPublicStudentProfile(req, student)),
        UNDERGRADUATE: students.filter((student) => student.studentType === "UNDERGRADUATE_STUDENT").map((student) => toPublicStudentProfile(req, student)),
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch public people",
    });
  }
}

export async function getPublicAlumniController(
  req: Request,
  res: Response,
) {
  try {
    const alumni = await findPublicAlumni();

    return res.json({
      success: true,
      data: alumni.map((member) => toPublicAlumniProfile(req, member)),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch public alumni",
    });
  }
}


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
    if (slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }
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
      data: partners.map(toPublicPartner),
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
      data: partners.map(toPublicPartner),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch public industrial partners",
    });
  }
}
