import { Collection, ObjectId } from "mongodb";

import { getDatabase } from "../../config/database.js";

import type { Partner } from "./partner.types.js";

import type {
  CreatePartnerInput,
  UpdatePartnerInput,
} from "./partner.schema.js";

import { PARTNER_TYPE } from "./partner.types.js";
import { SECURITY_LIMITS } from "../../config/security.js";

const PARTNERS_COLLECTION = "partners";

export function getPartnersCollection(): Collection<Partner> {
  return getDatabase().collection<Partner>(PARTNERS_COLLECTION);
}

// ========================================
// FIND BY ID
// ========================================

export async function findPartnerById(id: string): Promise<Partner | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection = getPartnersCollection();

  return collection.findOne({
    _id: new ObjectId(id),
  });
}

// ========================================
// FIND ALL PARTNERS
// ========================================

export async function findAllPartners(options?: {
  type?: Partner["type"];
  publishedOnly?: boolean;
  featuredOnly?: boolean;
}): Promise<Partner[]> {
  const collection = getPartnersCollection();

  const filter: Record<string, unknown> = {};

  if (options?.type) {
    filter.type = options.type;
  }

  if (options?.publishedOnly) {
    filter.published = true;
  }

  if (options?.featuredOnly) {
    filter.isFeatured = true;
  }

  return collection
    .find(filter)
    .sort({
      name: 1,
    })
    .limit(SECURITY_LIMITS.maxListResults)
    .toArray();
}

// ========================================
// FIND UNIVERSITY PARTNERS
// ========================================

export async function findUniversityPartners(options?: {
  publishedOnly?: boolean;
  featuredOnly?: boolean;
}): Promise<Partner[]> {
  return findAllPartners({
    type: PARTNER_TYPE.UNIVERSITY,
    publishedOnly: options?.publishedOnly,
    featuredOnly: options?.featuredOnly,
  });
}

// ========================================
// FIND INDUSTRIAL PARTNERS
// ========================================

export async function findIndustrialPartners(options?: {
  publishedOnly?: boolean;
  featuredOnly?: boolean;
}): Promise<Partner[]> {
  return findAllPartners({
    type: PARTNER_TYPE.INDUSTRIAL,
    publishedOnly: options?.publishedOnly,
    featuredOnly: options?.featuredOnly,
  });
}

// ========================================
// CREATE
// ========================================

export async function createPartner(
  input: CreatePartnerInput,
): Promise<Partner> {
  const collection = getPartnersCollection();

  const now = new Date();

  const partner: Partner = {
    name: input.name,

    type: input.type,

    logo: input.logo,

    website: input.website,

    country: input.country,

    description: input.description,

    isFeatured: input.isFeatured,

    published: input.published,

    createdAt: now,

    updatedAt: now,
  };

  const result = await collection.insertOne(partner);

  return {
    ...partner,
    _id: result.insertedId,
  };
}

// ========================================
// UPDATE
// ========================================

export async function updatePartner(
  id: string,
  input: UpdatePartnerInput,
): Promise<Partner | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection = getPartnersCollection();

  const result = await collection.findOneAndUpdate(
    {
      _id: new ObjectId(id),
    },
    {
      $set: {
        ...input,
        updatedAt: new Date(),
      },
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

export async function deletePartner(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) {
    return false;
  }

  const collection = getPartnersCollection();

  const result = await collection.deleteOne({
    _id: new ObjectId(id),
  });

  return result.deletedCount === 1;
}

export async function countPartners(type?: Partner["type"]): Promise<number> {
  const collection = getPartnersCollection();

  if (type) {
    return collection.countDocuments({
      type,
    });
  }

  return collection.countDocuments();
}
