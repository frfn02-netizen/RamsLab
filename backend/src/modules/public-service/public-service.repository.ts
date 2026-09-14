import { type Collection, type SortDirection, ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";
import { getDatabase } from "../../config/database.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import type {
  CreatePublicServiceExpertInput,
  CreatePublicServiceInput,
  CreatePublicServiceProjectInput,
  UpdatePublicServiceExpertInput,
  UpdatePublicServiceInput,
  UpdatePublicServiceProjectInput,
} from "./public-service.schema.js";
import type {
  PeopleRef,
  PublicService,
  PublicServiceCompany,
  PublicServiceExpert,
  PublicServiceJob,
  PublicServiceProject,
} from "./public-service.types.js";

const EXPERTS_COLLECTION = "public_service_experts";
const SERVICES_COLLECTION = "public_services";
const PROJECTS_COLLECTION = "public_service_projects";

export function getPublicServiceExpertsCollection(): Collection<PublicServiceExpert> {
  return getDatabase().collection<PublicServiceExpert>(EXPERTS_COLLECTION);
}

export function getPublicServicesCollection(): Collection<PublicService> {
  return getDatabase().collection<PublicService>(SERVICES_COLLECTION);
}

function toPeopleRef(input?: CreatePublicServiceExpertInput["peopleRef"]) {
  return input ? { kind: input.kind, id: new ObjectId(input.id) } : undefined;
}

function normalizeCompanies(
  input: CreatePublicServiceInput["companies"],
): PublicServiceCompany[] {
  return input.map((company) => ({
    ...company,
    id: company.id || randomUUID(),
  }));
}

function normalizeJobs(
  input: CreatePublicServiceInput["jobs"],
): PublicServiceJob[] {
  return input.map((job) => ({
    ...job,
    id: job.id || randomUUID(),
  }));
}

export async function findAllPublicServiceExperts(options?: {
  publishedOnly?: boolean;
}): Promise<PublicServiceExpert[]> {
  const filter = options?.publishedOnly ? { published: true } : {};
  return getPublicServiceExpertsCollection()
    .find(filter)
    .sort({ order: 1, "peopleRef.kind": 1, "peopleRef.id": 1 })
    .limit(SECURITY_LIMITS.maxListResults)
    .toArray();
}

export async function findPublicServiceExpertById(
  id: string,
): Promise<PublicServiceExpert | null> {
  if (!ObjectId.isValid(id)) return null;
  return getPublicServiceExpertsCollection().findOne({ _id: new ObjectId(id) });
}

export async function createPublicServiceExpert(
  input: CreatePublicServiceExpertInput,
  updatedBy?: string,
): Promise<PublicServiceExpert> {
  const now = new Date();
  const expert: PublicServiceExpert = {
    ...input,
    peopleRef: toPeopleRef(input.peopleRef),
    createdAt: now,
    updatedAt: now,
    ...(updatedBy && ObjectId.isValid(updatedBy)
      ? { updatedBy: new ObjectId(updatedBy) }
      : {}),
  };
  const result = await getPublicServiceExpertsCollection().insertOne(expert);
  return { ...expert, _id: result.insertedId };
}

export async function updatePublicServiceExpert(
  id: string,
  input: UpdatePublicServiceExpertInput,
  updatedBy?: string,
): Promise<PublicServiceExpert | null> {
  if (!ObjectId.isValid(id)) return null;
  const update: Partial<PublicServiceExpert> = {
    ...input,
    peopleRef: toPeopleRef(input.peopleRef) as PeopleRef | undefined,
    updatedAt: new Date(),
    ...(updatedBy && ObjectId.isValid(updatedBy)
      ? { updatedBy: new ObjectId(updatedBy) }
      : {}),
  };
  return getPublicServiceExpertsCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: update },
    { returnDocument: "after" },
  );
}

export async function deletePublicServiceExpert(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await getPublicServiceExpertsCollection().deleteOne({
    _id: new ObjectId(id),
  });
  return result.deletedCount === 1;
}

export async function findAllPublicServices(options?: {
  publishedOnly?: boolean;
}): Promise<PublicService[]> {
  const filter = options?.publishedOnly ? { published: true } : {};
  return getPublicServicesCollection()
    .find(filter)
    .sort({ order: 1, "title.en": 1 })
    .limit(SECURITY_LIMITS.maxListResults)
    .toArray();
}

export async function findPublicServiceById(
  id: string,
): Promise<PublicService | null> {
  if (!ObjectId.isValid(id)) return null;
  return getPublicServicesCollection().findOne({ _id: new ObjectId(id) });
}

export async function createPublicService(
  input: CreatePublicServiceInput,
  updatedBy?: string,
): Promise<PublicService> {
  const now = new Date();
  const service: PublicService = {
    ...input,
    companies: normalizeCompanies(input.companies),
    jobs: normalizeJobs(input.jobs),
    createdAt: now,
    updatedAt: now,
    ...(updatedBy && ObjectId.isValid(updatedBy)
      ? { updatedBy: new ObjectId(updatedBy) }
      : {}),
  };
  const result = await getPublicServicesCollection().insertOne(service);
  return { ...service, _id: result.insertedId };
}

export async function updatePublicService(
  id: string,
  input: UpdatePublicServiceInput,
  updatedBy?: string,
): Promise<PublicService | null> {
  if (!ObjectId.isValid(id)) return null;
  const { companies, jobs, ...fields } = input;
  const update: Partial<PublicService> = {
    ...fields,
    ...(companies ? { companies: normalizeCompanies(companies) } : {}),
    ...(jobs ? { jobs: normalizeJobs(jobs) } : {}),
    updatedAt: new Date(),
    ...(updatedBy && ObjectId.isValid(updatedBy)
      ? { updatedBy: new ObjectId(updatedBy) }
      : {}),
  };
  return getPublicServicesCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: update },
    { returnDocument: "after" },
  );
}

export async function deletePublicService(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await getPublicServicesCollection().deleteOne({
    _id: new ObjectId(id),
  });
  return result.deletedCount === 1;
}

export function getPublicServiceProjectsCollection(): Collection<PublicServiceProject> {
  return getDatabase().collection<PublicServiceProject>(PROJECTS_COLLECTION);
}

export async function findAllPublicServiceProjects(options?: {
  publishedOnly?: boolean;
}): Promise<PublicServiceProject[]> {
  const filter = options?.publishedOnly ? { published: true } : {};
  return getPublicServiceProjectsCollection()
    .find(filter)
    .sort({ order: 1, "title.en": 1 })
    .limit(SECURITY_LIMITS.maxListResults)
    .toArray();
}

export async function findPublicServiceProjectById(
  id: string,
): Promise<PublicServiceProject | null> {
  if (!ObjectId.isValid(id)) return null;
  return getPublicServiceProjectsCollection().findOne({
    _id: new ObjectId(id),
  });
}

export async function createPublicServiceProject(
  input: CreatePublicServiceProjectInput,
  updatedBy?: string,
): Promise<PublicServiceProject> {
  const now = new Date();
  const project: PublicServiceProject = {
    ...input,
    createdAt: now,
    updatedAt: now,
    ...(updatedBy && ObjectId.isValid(updatedBy)
      ? { updatedBy: new ObjectId(updatedBy) }
      : {}),
  };
  const result = await getPublicServiceProjectsCollection().insertOne(project);
  return { ...project, _id: result.insertedId };
}

export async function updatePublicServiceProject(
  id: string,
  input: UpdatePublicServiceProjectInput,
  updatedBy?: string,
): Promise<PublicServiceProject | null> {
  if (!ObjectId.isValid(id)) return null;
  const update: Partial<PublicServiceProject> = {
    ...input,
    updatedAt: new Date(),
    ...(updatedBy && ObjectId.isValid(updatedBy)
      ? { updatedBy: new ObjectId(updatedBy) }
      : {}),
  };
  return getPublicServiceProjectsCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: update },
    { returnDocument: "after" },
  );
}

export async function deletePublicServiceProject(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await getPublicServiceProjectsCollection().deleteOne({
    _id: new ObjectId(id),
  });
  return result.deletedCount === 1;
}

export interface PublicServiceProjectQueryOptions {
  search?: string;
  yearGroup?: string;
  entity?: string;
  client?: string;
  sort?: "newest" | "oldest";
  page?: number;
  limit?: number;
  publishedOnly?: boolean;
  includeFacets?: boolean;
}

export interface PublicServiceProjectFacets {
  yearGroups: string[];
  entities: string[];
  clients: string[];
}

export interface PublicServiceProjectListResult {
  items: PublicServiceProject[];
  total: number;
  page: number;
  limit: number;
  facets?: PublicServiceProjectFacets;
}

export async function findPublicServiceProjectsWithFilters(
  options?: PublicServiceProjectQueryOptions,
): Promise<PublicServiceProjectListResult> {
  const filter: Record<string, unknown> = {};

  if (options?.publishedOnly) {
    filter.published = true;
  }

  if (options?.search) {
    const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: escaped, $options: "i" };
    filter.$or = [
      { "title.en": regex },
      { "title.id": regex },
      { client: regex },
      { executingEntity: regex },
    ];
  }

  if (options?.yearGroup) {
    filter.yearGroup = options.yearGroup;
  }

  if (options?.entity) {
    filter.executingEntity = options.entity;
  }

  if (options?.client) {
    filter.client = options.client;
  }

  const sortDirection: SortDirection = options?.sort === "oldest" ? 1 : -1;
  const sort: Record<string, SortDirection> = {
    order: 1,
    "title.en": 1,
  };

  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(
    SECURITY_LIMITS.maxPageSize,
    Math.max(1, options?.limit ?? 20),
  );

  const collection = getPublicServiceProjectsCollection();
  const total = await collection.countDocuments(filter);
  const items = await collection
    .find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  if (!options?.includeFacets) {
    return { items, total, page, limit };
  }

  const [yearGroupValues, entityValues, clientValues] = await Promise.all([
    collection.distinct("yearGroup", filter),
    collection.distinct("executingEntity", filter),
    collection.distinct("client", filter),
  ]);

  return {
    items,
    total,
    page,
    limit,
    facets: {
      yearGroups: (yearGroupValues as string[]).sort(),
      entities: (entityValues as string[]).sort(),
      clients: (clientValues as string[]).sort(),
    },
  };
}
