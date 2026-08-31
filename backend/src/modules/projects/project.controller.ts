import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { createProjectSchema, updateProjectSchema } from "./project.schema.js";
import {
  createProject,
  deleteProject,
  findAllProjects,
  findProjectById,
  findProjectBySlug,
  updateProject,
} from "./project.repository.js";
import { PROJECT_CATEGORY } from "./project.types.js";

// ========================================
// GET ALL PROJECTS
// ========================================

export async function getProjectListController(req: Request, res: Response) {
  try {
    const { category, year, published } = req.query;

    let parsedYear: number | undefined;

    if (
      category !== undefined &&
      (typeof category !== "string" ||
        !Object.values(PROJECT_CATEGORY).includes(
          category as (typeof PROJECT_CATEGORY)[keyof typeof PROJECT_CATEGORY],
        ))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid category",
      });
    }

    if (year !== undefined) {
      if (typeof year !== "string" || !/^\d+$/.test(year)) {
        return res.status(400).json({
          success: false,
          message: "Invalid year",
        });
      }

      parsedYear = Number(year);
      if (parsedYear < 1900 || parsedYear > 2100) {
        return res.status(400).json({
          success: false,
          message: "Invalid year",
        });
      }
    }

    let publishedOnly: boolean | undefined;

    if (published !== undefined) {
      if (published !== "true" && published !== "false") {
        return res.status(400).json({
          success: false,
          message: "Invalid published value",
        });
      }

      publishedOnly = published === "true";
    }

    const projects = await findAllProjects({
      category: typeof category === "string" ? category : undefined,

      year: parsedYear,

      publishedOnly,
    });

    return res.json({
      success: true,
      data: projects,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
    });
  }
}

// ========================================
// GET PROJECT BY ID
// ========================================

export async function getProjectController(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await findProjectById(id);

    if (!project) {
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
      message: "Failed to fetch project",
    });
  }
}

// ========================================
// GET PROJECT BY SLUG
// ========================================

export async function getProjectBySlugController(req: Request, res: Response) {
  try {
    const slug = req.params.slug as string;

    if (slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project slug",
      });
    }

    const project = await findProjectBySlug(slug);

    if (!project) {
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
      message: "Failed to fetch project",
    });
  }
}

// ========================================
// CREATE PROJECT
// ========================================

export async function createProjectController(req: Request, res: Response) {
  try {
    const input = createProjectSchema.parse(req.body);

    for (const partnerId of input.partnerIds) {
      if (!ObjectId.isValid(partnerId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid partner ID: ${partnerId}`,
        });
      }
    }

    const project = await createProject(input);

    return res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Project slug already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create project",
    });
  }
}

// ========================================
// UPDATE PROJECT
// ========================================

export async function updateProjectController(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const input = updateProjectSchema.parse(req.body);

    if (input.partnerIds) {
      for (const partnerId of input.partnerIds) {
        if (!ObjectId.isValid(partnerId)) {
          return res.status(400).json({
            success: false,
            message: `Invalid partner ID: ${partnerId}`,
          });
        }
      }
    }

    const project = await updateProject(id, input);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Project slug already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update project",
    });
  }
}

// ========================================
// DELETE PROJECT
// ========================================

export async function deleteProjectController(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const deleted = await deleteProject(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete project",
    });
  }
}
