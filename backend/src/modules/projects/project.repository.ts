import { Collection, ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";
import type { Project } from "./project.types.js";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "./project.schema.js";
import { SECURITY_LIMITS } from "../../config/security.js";

const PROJECTS_COLLECTION = "projects";

export function getProjectsCollection(): Collection<Project> {
  return getDatabase().collection<Project>(PROJECTS_COLLECTION);
}

// ========================================
// FIND BY ID
// ========================================

export async function findProjectById(id: string): Promise<Project | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection = getProjectsCollection();

  return collection.findOne({
    _id: new ObjectId(id),
  });
}

// ========================================
// FIND BY SLUG
// ========================================

export async function findProjectBySlug(slug: string): Promise<Project | null> {
  const collection = getProjectsCollection();

  return collection.findOne({
    slug,
  });
}

// ========================================
// FIND ALL PROJECTS
// ========================================

export async function findAllProjects(options?: {
  publishedOnly?: boolean;
  category?: string;
  year?: number;
}): Promise<Project[]> {
  const collection = getProjectsCollection();

  const filter: Record<string, unknown> = {};

  if (options?.publishedOnly) {
    filter.published = true;
  }

  if (options?.category) {
    filter.category = options.category;
  }

  if (options?.year !== undefined) {
    filter.year = options.year;
  }

  return collection
    .find(filter)
    .sort({
      year: -1,
      title: 1,
    })
    .limit(SECURITY_LIMITS.maxListResults)
    .toArray();
}

// ========================================
// CREATE
// ========================================

export async function createProject(
  input: CreateProjectInput,
): Promise<Project> {
  const collection = getProjectsCollection();

  const now = new Date();

  const project: Project = {
    title: input.title,

    slug: input.slug,

    description: input.description,

    category: input.category,

    partnerIds: input.partnerIds.map((id) => new ObjectId(id)),

    year: input.year,

    status: input.status,

    image: input.image,

    technologies: input.technologies,

    published: input.published,

    createdAt: now,

    updatedAt: now,
  };

  const result = await collection.insertOne(project);

  return {
    ...project,
    _id: result.insertedId,
  };
}

// ========================================
// UPDATE
// ========================================

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<Project | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection = getProjectsCollection();

  const updateData: Record<string, unknown> = {
    ...input,
    updatedAt: new Date(),
  };

  if (input.partnerIds) {
    updateData.partnerIds = input.partnerIds.map(
      (partnerId) => new ObjectId(partnerId),
    );
  }

  const result = await collection.findOneAndUpdate(
    {
      _id: new ObjectId(id),
    },
    {
      $set: updateData,
    },
    {
      returnDocument: "after",
    },
  );

  return result;
}

// ========================================
// DELETE
// ========================================

export async function deleteProject(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) {
    return false;
  }

  const collection = getProjectsCollection();

  const result = await collection.deleteOne({
    _id: new ObjectId(id),
  });

  return result.deletedCount === 1;
}
export async function countProjects(): Promise<number> {
  const collection = getProjectsCollection();

  return collection.countDocuments();
}
