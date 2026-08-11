import {
  Collection,
  ObjectId,
} from "mongodb";

import { getDatabase } from "../../config/database.js";

import type { Partner } from "./partner.types.js";

const PARTNERS_COLLECTION = "partners";

export function getPartnersCollection(): Collection<Partner> {
  return getDatabase().collection<Partner>(
    PARTNERS_COLLECTION
  );
}

export async function findPartnerById(
  id: string
): Promise<Partner | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection = getPartnersCollection();

  return collection.findOne({
    _id: new ObjectId(id),
  });
}