import type { Request, Response } from "express";
import { ObjectId } from "mongodb";

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
  findHomepagePartners,
} from "../partners/partner.repository.js";
import { findAllDosen, findDosenById } from "../dosen/dosen.repository.js";
import {
  findPublicAlumni,
  findAlumniById,
} from "../alumni/alumni.repository.js";
import {
  findAllStudents,
  findStudentById,
} from "../students/student.repository.js";
import {
  toPublicAlumniProfile,
  toPublicDosenProfile,
  toPublicStudentProfile,
} from "./public-profile.js";
import { safeHttpUrl } from "../../lib/url-security.js";

function toPublicPartner(
  partner: Awaited<ReturnType<typeof findUniversityPartners>>[number],
) {
  return {
    ...partner,
    _id: partner._id?.toString(),
    website: safeHttpUrl(partner.website),
    logo: safeHttpUrl(partner.logo),
  };
}

export async function getPublicPeopleController(req: Request, res: Response) {
  try {
    const [dosen, students, alumni] = await Promise.all([
      findAllDosen({ publicOnly: true }),
      findAllStudents({ publicOnly: true }),
      findPublicAlumni(),
    ]);

    return res.json({
      success: true,
      data: {
        DOSEN: dosen.map((member) => toPublicDosenProfile(req, member)),
        MAHASISWA: students
          .filter((student) => student.studentType === "PHD_STUDENT")
          .map((student) => toPublicStudentProfile(req, student)),
        MASTER: students
          .filter((student) => student.studentType === "MASTER_STUDENT")
          .map((student) => toPublicStudentProfile(req, student)),
        UNDERGRADUATE: students
          .filter((student) => student.studentType === "UNDERGRADUATE_STUDENT")
          .map((student) => toPublicStudentProfile(req, student)),
        INTERNSHIP: students
          .filter((student) => student.studentType === "INTERNSHIP_STUDENT")
          .map((student) => toPublicStudentProfile(req, student)),
        ALUMNI: alumni.map((member) => toPublicAlumniProfile(req, member)),
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch public people",
    });
  }
}

export async function getPublicDosenByIdController(
  req: Request,
  res: Response,
) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res.status(404).json({
      success: false,
      message: "Public profile not found",
    });
  }

  try {
    const member = await findDosenById(id);
    if (member?.isPublic) {
      return res.json({
        success: true,
        data: toPublicDosenProfile(req, member),
      });
    }

    const student = await findStudentById(id);
    if (student?.isPublic) {
      return res.json({
        success: true,
        data: toPublicStudentProfile(req, student),
      });
    }

    const alumni = await findAlumniById(id);
    if (
      alumni?.isPublic &&
      alumni.profileCompleted &&
      alumni.reviewStatus === "APPROVED"
    ) {
      return res.json({
        success: true,
        data: toPublicAlumniProfile(req, alumni),
      });
    }

    return res.status(404).json({
      success: false,
      message: "Public profile not found",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch public profile",
    });
  }
}

export async function getPublicAlumniByIdController(
  req: Request,
  res: Response,
) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(404)
      .json({ success: false, message: "Public alumni profile not found" });
  }

  const alumni = await findAlumniById(id);
  if (
    !alumni ||
    !alumni.isPublic ||
    !alumni.profileCompleted ||
    alumni.reviewStatus !== "APPROVED"
  ) {
    return res
      .status(404)
      .json({ success: false, message: "Public alumni profile not found" });
  }

  return res.json({ success: true, data: toPublicAlumniProfile(req, alumni) });
}

export async function getPublicAlumniController(req: Request, res: Response) {
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

export async function getPublicProjectsController(req: Request, res: Response) {
  try {
    const featured = req.query.featured === "true";
    const parsedLimit = Number(req.query.limit);
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 12)
        : undefined;
    const projects = await findAllProjects({
      publishedOnly: true,
      featuredOnly: featured,
    });

    return res.json({
      success: true,
      data: limit ? projects.slice(0, limit) : projects,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch public projects",
    });
  }
}

// ========================================
// PUBLIC PROJECT BY SLUG
// ========================================

export async function getPublicProjectController(req: Request, res: Response) {
  try {
    const slug = req.params.slug as string;
    if (slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }
    const project = await findProjectBySlug(slug);

    if (!project || !project.published) {
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
      message: "Failed to fetch public project",
    });
  }
}

// ========================================
// PUBLIC UNIVERSITY PARTNERS
// ========================================

export async function getPublicUniversityPartnersController(
  _req: Request,
  res: Response,
) {
  try {
    const partners = await findUniversityPartners({
      publishedOnly: true,
    });

    return res.json({
      success: true,
      data: partners.map(toPublicPartner),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch public university partners",
    });
  }
}

// ========================================
// PUBLIC HOMEPAGE PARTNERS
// ========================================

export async function getPublicHomepagePartnersController(
  _req: Request,
  res: Response,
) {
  try {
    const partners = await findHomepagePartners();

    return res.json({
      success: true,
      data: partners.map(toPublicPartner),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch homepage partners",
    });
  }
}

// ========================================
// PUBLIC INDUSTRIAL PARTNERS
// ========================================

export async function getPublicIndustrialPartnersController(
  _req: Request,
  res: Response,
) {
  try {
    const partners = await findIndustrialPartners({
      publishedOnly: true,
    });

    return res.json({
      success: true,
      data: partners.map(toPublicPartner),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch public industrial partners",
    });
  }
}
