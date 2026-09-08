import {
  getPublicServiceExpertsCollection,
  getPublicServicesCollection,
} from "./public-service.repository.js";

export async function createPublicServiceIndexes() {
  await getPublicServiceExpertsCollection().createIndex(
    { published: 1, order: 1 },
    { name: "public_service_experts_public_listing_index" },
  );
  await getPublicServiceExpertsCollection().createIndex(
    { "peopleRef.kind": 1, "peopleRef.id": 1 },
    {
      name: "public_service_experts_people_ref_unique",
      unique: true,
      sparse: true,
    },
  );
  await getPublicServiceExpertsCollection().createIndex(
    { displayName: 1 },
    { name: "public_service_experts_display_name_index" },
  );
  await getPublicServicesCollection().createIndex(
    { published: 1, order: 1 },
    { name: "public_services_public_listing_index" },
  );
  await getPublicServicesCollection().createIndex(
    { code: 1 },
    { name: "public_services_code_unique", unique: true, sparse: true },
  );
  console.log("Public service indexes created");
}
