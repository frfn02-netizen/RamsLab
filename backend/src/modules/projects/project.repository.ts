import {
  Collection,
  ObjectId,
} from "mongodb";

import { getDatabase } from "../../config/database.js";

import type { Project } from "./project.types.js";

const PROJECTS_COLLECTION = "projects";

export function getProjectsCollection(): Collection<Project> {
  return getDatabase().collection<Project>(
    PROJECTS_COLLECTION
  );
}

export async function findProjectById(
  id: string
): Promise<Project | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection = getProjectsCollection();

  return collection.findOne({
    _id: new ObjectId(id),
  });
}

export async function findProjectBySlug(
  slug: string
): Promise<Project | null> {
  const collection = getProjectsCollection();

  return collection.findOne({
    slug,
  });
}