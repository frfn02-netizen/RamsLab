import { getProjectsCollection } from "./project.repository.js";

export async function createProjectIndexes() {
  const collection = getProjectsCollection();

  await collection.createIndex(
    { slug: 1 },
    {
      unique: true,
      name: "projects_slug_unique",
    }
  );

  await collection.createIndex(
    { year: -1 },
    {
      name: "projects_year_index",
    }
  );

  await collection.createIndex(
    { published: 1 },
    {
      name: "projects_published_index",
    }
  );

  await collection.createIndex(
    { category: 1 },
    {
      name: "projects_category_index",
    }
  );

  console.log("✅ Project indexes created");
}