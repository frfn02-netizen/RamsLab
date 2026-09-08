import { Collection, ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";
import { getDatabase } from "../../config/database.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import type {
  CreatePublicServiceExpertInput,
  CreatePublicServiceInput,
  UpdatePublicServiceExpertInput,
  UpdatePublicServiceInput,
} from "./public-service.schema.js";
import type {
  PeopleRef,
  PublicService,
  PublicServiceCompany,
  PublicServiceExpert,
  PublicServiceJob,
} from "./public-service.types.js";

const EXPERTS_COLLECTION = "public_service_experts";
const SERVICES_COLLECTION = "public_services";

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
