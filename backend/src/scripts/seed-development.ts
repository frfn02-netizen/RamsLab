import "dotenv/config";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";

import { connectDatabase, getDatabase } from "../config/database.js";
import { createUserIndexes } from "../modules/users/user.index.js";
import { getUsersCollection } from "../modules/users/user.repository.js";
import { USER_ROLES, type User } from "../modules/users/user.types.js";
import { createDosenIndexes } from "../modules/dosen/dosen.index.js";
import { getDosenCollection } from "../modules/dosen/dosen.repository.js";
import { createAlumniIndexes } from "../modules/alumni/alumni.index.js";
import { getAlumniCollection } from "../modules/alumni/alumni.repository.js";
import { ALUMNI_STATUS, type Alumni } from "../modules/alumni/alumni.types.js";
import { createStudentIndexes } from "../modules/students/student.index.js";
import { getStudentCollection } from "../modules/students/student.repository.js";
import {
  STUDENT_TYPES,
  type Student,
} from "../modules/students/student.types.js";
import { createPartnerIndexes } from "../modules/partners/partner.index.js";
import { getPartnersCollection } from "../modules/partners/partner.repository.js";
import {
  PARTNER_TYPE,
  type Partner,
} from "../modules/partners/partner.types.js";
import { createProjectIndexes } from "../modules/projects/project.index.js";
import { getProjectsCollection } from "../modules/projects/project.repository.js";
import {
  PROJECT_CATEGORY,
  PROJECT_STATUS,
  type Project,
} from "../modules/projects/project.types.js";
import { createResearchAreaIndexes } from "../modules/research/research.index.js";
import { getResearchAreasCollection } from "../modules/research/research.repository.js";
import { researchAreas } from "./seed-research.js";
import { createPublicationIndexes } from "../modules/publications/publication.index.js";
import {
  getPublicationsCollection,
  normalizeDoi,
  normalizePublicationTitle,
} from "../modules/publications/publication.repository.js";
import { demoPublicationTypes, demoPublications } from "./seed-publications.js";
import {
  createTrackingIndexes,
  getTrackingCollection,
} from "../modules/tracking/tracking.respository.js";
import {
  TRACKING_TYPES,
  type AlumniTracking,
} from "../modules/tracking/tracking.types.js";
import { createSiteContentIndexes } from "../modules/site-content/site-content.index.js";
import { createResearchHighlightIndexes } from "../modules/research-highlights/research-highlight.index.js";
import { upsertSiteContent } from "../modules/site-content/site-content.repository.js";
import {
  contentByKey,
  ensureDevelopmentHeadOfLaboratory,
} from "./seed-site-content.js";
import {
  printResearchHighlightSeedStatus,
  seedDevelopmentResearchHighlights,
} from "./seed-research-highlights.js";
import {
  SITE_CONTENT_KEYS,
  type SiteContentContent,
} from "../modules/site-content/site-content.types.js";
import { createEventIndexes } from "../modules/events/event.index.js";
import { getEventsCollection } from "../modules/events/event.repository.js";
import { createPublicServiceIndexes } from "../modules/public-service/public-service.index.js";
import {
  getPublicServiceExpertsCollection,
  getPublicServicesCollection,
} from "../modules/public-service/public-service.repository.js";

const DEVELOPMENT_DB_NAME = "rams_platform_dev";
const developmentEmails = {
  admin: "admin@rams.test",
  dosen: "dosen@rams.test",
  editor: "publication-editor@rams.test",
  alumni: "alumni.one@rams.test",
} as const;

function assertDevelopmentEnvironment() {
  if (process.env.DB_NAME !== DEVELOPMENT_DB_NAME) {
    throw new Error(
      `Refusing development seed: DB_NAME must be ${DEVELOPMENT_DB_NAME} (received ${process.env.DB_NAME ?? "undefined"})`,
    );
  }
  for (const name of [
    "SEED_ADMIN_PASSWORD",
    "SEED_DOSEN_PASSWORD",
    "SEED_PUBLICATION_EDITOR_PASSWORD",
    "SEED_ALUMNI_PASSWORD",
  ]) {
    const password = process.env[name];
    if (!password || password.length < 12) {
      throw new Error(`${name} is required and must be at least 12 characters`);
    }
  }
}

async function upsertUser(email: string, role: User["role"], password: string) {
  const now = new Date();
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await getUsersCollection().findOneAndUpdate(
    { email },
    {
      $set: {
        passwordHash,
        role,
        isActive: true,
        mustChangePassword: false,
        tokenVersion: 0,
        lastLoginAt: null,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (!result) throw new Error(`Could not seed user ${email}`);
  return result;
}

async function seedUsers() {
  const admin = await upsertUser(
    developmentEmails.admin,
    USER_ROLES.ADMIN,
    process.env.SEED_ADMIN_PASSWORD!,
  );
  const dosen = await upsertUser(
    developmentEmails.dosen,
    USER_ROLES.DOSEN,
    process.env.SEED_DOSEN_PASSWORD!,
  );
  const editor = await upsertUser(
    developmentEmails.editor,
    USER_ROLES.PUBLICATION_EDITOR,
    process.env.SEED_PUBLICATION_EDITOR_PASSWORD!,
  );
  const alumni = await upsertUser(
    developmentEmails.alumni,
    USER_ROLES.ALUMNI,
    process.env.SEED_ALUMNI_PASSWORD!,
  );
  return { admin, dosen, editor, alumni };
}

async function seedDosenProfile(userId: ObjectId) {
  const now = new Date();
  await getDosenCollection().updateOne(
    { userId },
    {
      $set: {
        userId,
        fullName: "RAMS Development Lecturer",
        employeeId: "RAMS-DOSEN-001",
        faculty: "RAMS Development Faculty",
        department: "Reliability Engineering",
        institution: "RAMS Development Institute",
        specialization: ["Reliability Engineering", "Safety Systems"],
        showNip: false,
        showNidn: false,
        showEmail: true,
        education: [],
        isPublic: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

async function seedAlumniProfile(userId: ObjectId) {
  const now = new Date();
  const profile: Omit<Alumni, "_id" | "createdAt" | "updatedAt"> = {
    userId,
    fullName: "RAMS Development Alumni",
    nim: "RAMS-ALUMNI-001",
    graduationYear: 2024,
    program: "Marine Engineering",
    currentStatus: ALUMNI_STATUS.WORKING,
    currentCompany: "RAMS Development Engineering",
    currentPosition: "Reliability Engineer",
    careerHistory: [
      {
        company: "RAMS Development Engineering",
        position: "Reliability Engineer",
        startDate: new Date("2024-08-01"),
        endDate: null,
        location: "Surabaya",
      },
    ],
    educationHistory: [
      {
        institution: "RAMS Development Institute",
        degree: "Bachelor",
        fieldOfStudy: "Marine Engineering",
        startYear: 2020,
        endYear: 2024,
      },
    ],
    isPublic: true,
    profileCompleted: true,
  };
  await getAlumniCollection().updateOne(
    { userId },
    { $set: { ...profile, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
  return getAlumniCollection().findOne({ userId });
}

async function seedStudents() {
  const students = [
    [
      "RAMS Development Undergraduate",
      STUDENT_TYPES.UNDERGRADUATE_STUDENT,
      "Marine Engineering",
    ],
    [
      "RAMS Development Master",
      STUDENT_TYPES.MASTER_STUDENT,
      "Reliability Engineering",
    ],
    ["RAMS Development PhD", STUDENT_TYPES.PHD_STUDENT, "Safety Systems"],
  ] as const;
  const now = new Date();
  for (const [fullName, studentType, program] of students) {
    const document: Omit<Student, "_id" | "createdAt" | "updatedAt"> = {
      fullName,
      studentType,
      program,
      specialization: ["RAMS Development"],
      bio: `Development profile for ${fullName}.`,
      isPublic: true,
    };
    await getStudentCollection().updateOne(
      { fullName, studentType },
      {
        $set: { ...document, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }
}

async function seedPartners() {
  const now = new Date();
  const ids = new Map<string, ObjectId>();
  for (const [name, type] of [
    ["RAMS Development University Partner", PARTNER_TYPE.UNIVERSITY],
    ["RAMS Development Industrial Partner", PARTNER_TYPE.INDUSTRIAL],
  ] as const) {
    const document: Omit<Partner, "_id" | "createdAt" | "updatedAt"> = {
      name,
      type,
      country: "Indonesia",
      description: `Development ${type.toLowerCase()} partner.`,
      isFeatured: true,
      published: true,
      showOnHomepage: false,
    };
    await getPartnersCollection().updateOne(
      { name, type },
      {
        $set: { ...document, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    const partner = await getPartnersCollection().findOne({ name, type });
    if (!partner?._id) throw new Error(`Could not seed partner ${name}`);
    ids.set(type, partner._id);
  }
  return ids;
}

async function seedProjects(partnerIds: Map<string, ObjectId>) {
  const now = new Date();
  const projects: Project[] = [
    {
      title: "RAMS Development Independent Project",
      slug: "rams-development-independent-project",
      description:
        "Development project without a partner reference for admin CRUD testing.",
      category: PROJECT_CATEGORY.RESEARCH,
      partnerIds: [],
      year: 2026,
      status: PROJECT_STATUS.ONGOING,
      technologies: ["Reliability Analysis"],
      published: true,
      featured: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      title: "RAMS Development Partner Project",
      slug: "rams-development-partner-project",
      description:
        "Development project linked to the deterministic industrial partner.",
      category: PROJECT_CATEGORY.CONSULTING,
      partnerIds: [partnerIds.get(PARTNER_TYPE.INDUSTRIAL)!],
      year: 2026,
      status: PROJECT_STATUS.PLANNING,
      technologies: ["Risk Assessment"],
      published: true,
      featured: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
  for (const project of projects) {
    const { createdAt: _createdAt, ...projectData } = project;
    await getProjectsCollection().updateOne(
      { slug: project.slug },
      {
        $set: { ...projectData, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }
}

async function seedResearchAreas() {
  const now = new Date();
  for (const area of researchAreas)
    await getResearchAreasCollection().updateOne(
      { code: area.code },
      { $set: { ...area, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
}

async function seedPublications(editorId: ObjectId) {
  const now = new Date();
  for (const [index, publication] of demoPublications.entries()) {
    const normalizedTitle = normalizePublicationTitle(publication.title);
    const filter = publication.doi
      ? { doi: normalizeDoi(publication.doi) }
      : { normalizedTitle, year: publication.year, doi: null };
    await getPublicationsCollection().updateOne(
      filter,
      {
        $set: {
          ...publication,
          publicationType:
            demoPublicationTypes[index % demoPublicationTypes.length],
          doi: normalizeDoi(publication.doi),
          pdfUrl: publication.pdfUrl || null,
          normalizedTitle,
          updatedBy: editorId,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now, createdBy: editorId },
      },
      { upsert: true },
    );
  }
}

async function seedTracking(alumniId: ObjectId) {
  const now = new Date();
  const records: Omit<AlumniTracking, "_id" | "createdAt" | "updatedAt">[] = [
    {
      alumniId,
      type: TRACKING_TYPES.GRADUATION,
      title: "Graduated from RAMS Development Institute",
      institution: "RAMS Development Institute",
      startDate: new Date("2024-07-01"),
      endDate: new Date("2024-07-31"),
      description: "Development tracking record.",
    },
    {
      alumniId,
      type: TRACKING_TYPES.EMPLOYMENT,
      title: "Joined RAMS Development Engineering",
      company: "RAMS Development Engineering",
      position: "Reliability Engineer",
      location: "Surabaya",
      startDate: new Date("2024-08-01"),
      endDate: null,
      description: "Development tracking record.",
    },
  ];
  for (const record of records)
    await getTrackingCollection().updateOne(
      { alumniId, type: record.type, title: record.title },
      { $set: { ...record, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
}

const publicServiceExpertNames = [
  "Dr. Eng. Dhimas Widhi Handani, S.T., M.Sc.",
  "Prof. Dr. Ketut Buda Artana, S.T., M.Sc.",
  "Dr. Emmy Pratiwi, S.T.",
  "Fadilla Indrayuni Prastyasari, S.T., M.Sc., Ph.D.",
  "I Gde Manik Sunekanegara Adhita, S.T., M.MST., Ph.D.",
  "Thariq Arafatul Akbar, S.T., M.T.",
  "A.A. BGS. Dinarinaya Dwi Putranta, S.T., MES., Ph.D.",
  "Prof. Dr. I Made Ariana, S.T., M.T.",
] as const;

async function findPeopleReferenceByName(fullName: string) {
  const [dosen, student, alumni] = await Promise.all([
    getDosenCollection().findOne({ fullName }),
    getStudentCollection().findOne({ fullName }),
    getAlumniCollection().findOne({ fullName }),
  ]);
  if (dosen?._id) return { kind: "DOSEN" as const, id: dosen._id };
  if (student?._id) return { kind: "STUDENT" as const, id: student._id };
  if (alumni?._id) return { kind: "ALUMNI" as const, id: alumni._id };
  return undefined;
}

async function seedEvents() {
  const now = new Date();
  await getEventsCollection().updateOne(
    { "title.en": "MASTIC over the years" },
    {
      $set: {
        title: {
          en: "MASTIC over the years",
          id: "MASTIC dari tahun ke tahun",
        },
        order: 0,
        published: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

async function seedPublicServiceExperts() {
  const now = new Date();
  for (const [order, displayName] of publicServiceExpertNames.entries()) {
    const peopleRef = await findPeopleReferenceByName(displayName);
    await getPublicServiceExpertsCollection().updateOne(
      { displayName },
      {
        $set: {
          displayName,
          ...(peopleRef ? { peopleRef } : {}),
          expertise: { en: "", id: "" },
          order,
          published: true,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }
}

async function seedPublicServices() {
  const now = new Date();
  const services = [
    {
      code: "ASR",
      title: { en: "ASR", id: "ASR" },
      shortDescription: {
        en: "Abandonment Site & Restoration",
        id: "Abandonment Site & Restoration",
      },
    },
    {
      code: "LNG",
      title: { en: "LNG", id: "LNG" },
      shortDescription: {
        en: "Liquefied Natural Gas Terminal",
        id: "Liquefied Natural Gas Terminal",
      },
    },
    {
      code: "MOORING",
      title: { en: "Mooring Arrangement", id: "Mooring Arrangement" },
      shortDescription: { en: "", id: "" },
    },
    {
      code: "AIS",
      title: { en: "AIS", id: "AIS" },
      shortDescription: {
        en: "Automatic Identification System",
        id: "Automatic Identification System",
      },
    },
  ];

  for (const [order, service] of services.entries()) {
    await getPublicServicesCollection().updateOne(
      { code: service.code },
      {
        $set: {
          ...service,
          detailedDescription: { en: "", id: "" },
          companies: [],
          jobs: [],
          order,
          published: true,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }
}

async function printSummary() {
  const db = getDatabase();
  const names = [
    "users",
    "dosen",
    "alumni",
    "students",
    "partners",
    "projects",
    "research_areas",
    "publications",
    "alumni_tracking",
    "site_content",
    "events",
    "public_service_experts",
    "public_services",
  ];
  console.log("\nDevelopment seed summary:");
  for (const name of names)
    console.log(`- ${name}: ${await db.collection(name).countDocuments()}`);
}

async function main() {
  // This must remain before connectDatabase: an invalid target must not open MongoDB.
  assertDevelopmentEnvironment();
  await connectDatabase();
  await Promise.all([
    createUserIndexes(),
    createDosenIndexes(),
    createAlumniIndexes(),
    createStudentIndexes(),
    createPartnerIndexes(),
    createProjectIndexes(),
    createResearchAreaIndexes(),
    createPublicationIndexes(),
    createTrackingIndexes(),
    createSiteContentIndexes(),
    createResearchHighlightIndexes(),
    createEventIndexes(),
    createPublicServiceIndexes(),
  ]);
  const users = await seedUsers();
  await seedDosenProfile(users.dosen._id!);
  const alumni = await seedAlumniProfile(users.alumni._id!);
  if (!alumni?._id) throw new Error("Could not resolve seeded alumni profile");
  await seedStudents();
  const partners = await seedPartners();
  await seedProjects(partners);
  await seedResearchAreas();
  await seedPublications(users.editor._id!);
  await seedDevelopmentResearchHighlights();
  await seedEvents();
  await seedPublicServiceExperts();
  await seedPublicServices();
  await printResearchHighlightSeedStatus();
  await seedTracking(alumni._id);
  for (const key of SITE_CONTENT_KEYS)
    await upsertSiteContent(key, contentByKey[key] as SiteContentContent);
  await ensureDevelopmentHeadOfLaboratory();
  await printSummary();
  console.log("\n✅ Development database seeded successfully");
}

main().catch((error: unknown) => {
  console.error(
    "❌ Development seed failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
