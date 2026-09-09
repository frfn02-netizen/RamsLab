import { getExpertsCollection } from "./expert.repository.js";

export async function createExpertIndexes(): Promise<void> {
  const collection = getExpertsCollection();

  await collection.createIndex({ published: 1, order: 1, name: 1 });
  await collection.createIndex({ order: 1 });
}
