import { Collection, ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import { findPublicationById } from "../publications/publication.repository.js";
import type { Publication } from "../publications/publication.types.js";
import type {
  CreateResearchHighlightInput,
  UpdateResearchHighlightInput,
} from "./research-highlight.schema.js";
import type {
  ResearchHighlight,
  ResearchHighlightImage,
  ResearchHighlightPublication,
  ResearchHighlightWithPublication,
} from "./research-highlight.types.js";

const RESEARCH_HIGHLIGHTS_COLLECTION = "research_highlights";

export class PublicationReferenceError extends Error {
  constructor() {
    super("Publication reference does not exist");
    this.name = "PublicationReferenceError";
  }
}

export function getResearchHighlightsCollection(): Collection<ResearchHighlight> {
  return getDatabase().collection<ResearchHighlight>(
    RESEARCH_HIGHLIGHTS_COLLECTION,
  );
}

function publicationProjection(): Record<string, number> {
  return {
    _id: 1,
    headline: 1,
    publicationId: 1,
    image: 1,
    order: 1,
    published: 1,
    createdAt: 1,
    updatedAt: 1,
    updatedBy: 1,
    "publication._id": 1,
    "publication.title": 1,
    "publication.authors": 1,
    "publication.year": 1,
    "publication.journal": 1,
    "publication.doi": 1,
    "publication.pdfUrl": 1,
  };
}

function withPublicationPipeline(filter: Record<string, unknown> = {}) {
  return [
    { $match: filter },
    {
      $lookup: {
        from: "publications",
        localField: "publicationId",
        foreignField: "_id",
        as: "publication",
      },
    },
    { $unwind: "$publication" },
    { $project: publicationProjection() },
  ];
}

function serializePublication(
  publication: Publication,
): ResearchHighlightPublication {
  return {
    id: publication._id!.toString(),
    title: publication.title,
    authors: publication.authors,
    year: publication.year,
    journal: publication.journal,
    doi: publication.doi,
    pdfUrl: publication.pdfUrl,
  };
}

function serializeHighlight(
  value: ResearchHighlight & { publication: Publication },
): ResearchHighlightWithPublication {
  const { publicationId, publication, ...highlight } = value;
  return {
    ...highlight,
    publicationId,
    publication: serializePublication(publication),
  };
}

async function findWithPublication(
  filter: Record<string, unknown>,
): Promise<ResearchHighlightWithPublication | null> {
  const [result] = await getResearchHighlightsCollection()
    .aggregate<ResearchHighlight & { publication: Publication }>(
      withPublicationPipeline(filter),
    )
    .toArray();
  return result ? serializeHighlight(result) : null;
}

async function ensurePublication(publicationId: string): Promise<ObjectId> {
  if (!ObjectId.isValid(publicationId)) throw new PublicationReferenceError();
  const publication = await findPublicationById(publicationId);
  if (!publication) throw new PublicationReferenceError();
  return new ObjectId(publicationId);
}

export async function listPublicResearchHighlights(): Promise<
  ResearchHighlightWithPublication[]
> {
  const results = await getResearchHighlightsCollection()
    .aggregate<ResearchHighlight & { publication: Publication }>(
      withPublicationPipeline({ published: true }),
    )
    .sort({ order: 1, _id: 1 })
    .limit(SECURITY_LIMITS.maxListResults)
    .toArray();
  return results.map(serializeHighlight);
}

export async function listAdminResearchHighlights(): Promise<
  ResearchHighlightWithPublication[]
> {
  const results = await getResearchHighlightsCollection()
    .aggregate<ResearchHighlight & { publication: Publication }>(
      withPublicationPipeline(),
    )
    .sort({ order: 1, _id: 1 })
    .limit(SECURITY_LIMITS.maxListResults)
    .toArray();
  return results.map(serializeHighlight);
}

export async function getResearchHighlightById(
  id: string,
): Promise<ResearchHighlightWithPublication | null> {
  if (!ObjectId.isValid(id)) return null;
  return findWithPublication({ _id: new ObjectId(id) });
}

export async function createResearchHighlight(
  input: CreateResearchHighlightInput,
  updatedBy?: string,
): Promise<ResearchHighlightWithPublication> {
  const now = new Date();
  const document: ResearchHighlight = {
    headline: input.headline,
    publicationId: await ensurePublication(input.publicationId),
    ...(input.image ? { image: input.image } : {}),
    order: input.order,
    published: input.published,
    createdAt: now,
    updatedAt: now,
    ...(updatedBy && ObjectId.isValid(updatedBy)
      ? { updatedBy: new ObjectId(updatedBy) }
      : {}),
  };
  const result = await getResearchHighlightsCollection().insertOne(document);
  const created = await getResearchHighlightById(result.insertedId.toString());
  if (!created) throw new Error("Research highlight was not created");
  return created;
}

export async function updateResearchHighlight(
  id: string,
  input: UpdateResearchHighlightInput,
  updatedBy?: string,
): Promise<ResearchHighlightWithPublication | null> {
  if (!ObjectId.isValid(id)) return null;
  const update: Partial<ResearchHighlight> = {
    ...(input.headline ? { headline: input.headline } : {}),
    ...(input.publicationId
      ? { publicationId: await ensurePublication(input.publicationId) }
      : {}),
    ...(input.image ? { image: input.image } : {}),
    ...(input.order !== undefined ? { order: input.order } : {}),
    ...(input.published !== undefined ? { published: input.published } : {}),
    updatedAt: new Date(),
    ...(updatedBy && ObjectId.isValid(updatedBy)
      ? { updatedBy: new ObjectId(updatedBy) }
      : {}),
  };
  const result = await getResearchHighlightsCollection().updateOne(
    { _id: new ObjectId(id) },
    { $set: update },
  );
  if (result.matchedCount === 0) return null;
  return getResearchHighlightById(id);
}

export async function setResearchHighlightImage(
  id: string,
  image: ResearchHighlightImage,
): Promise<ResearchHighlightWithPublication | null> {
  if (!ObjectId.isValid(id)) return null;
  const result = await getResearchHighlightsCollection().updateOne(
    { _id: new ObjectId(id) },
    { $set: { image, updatedAt: new Date() } },
  );
  if (result.matchedCount === 0) return null;
  return getResearchHighlightById(id);
}

export async function removeResearchHighlightImage(
  id: string,
): Promise<ResearchHighlightWithPublication | null> {
  if (!ObjectId.isValid(id)) return null;
  const result = await getResearchHighlightsCollection().updateOne(
    { _id: new ObjectId(id) },
    { $unset: { image: "" }, $set: { updatedAt: new Date() } },
  );
  if (result.matchedCount === 0) return null;
  return getResearchHighlightById(id);
}

export async function deleteResearchHighlight(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await getResearchHighlightsCollection().deleteOne({
    _id: new ObjectId(id),
  });
  return result.deletedCount === 1;
}

export async function hasResearchHighlightPublicationReference(
  publicationId: string,
): Promise<boolean> {
  if (!ObjectId.isValid(publicationId)) return false;
  return Boolean(
    await getResearchHighlightsCollection().findOne(
      { publicationId: new ObjectId(publicationId) },
      { projection: { _id: 1 } },
    ),
  );
}
