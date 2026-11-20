import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { connectDatabase } from "../config/database.js";
import { uploadProfilePhoto } from "../lib/cloudinary.js";
import { createStudentIndexes } from "../modules/students/student.index.js";
import { getStudentCollection } from "../modules/students/student.repository.js";
import {
  STUDENT_TYPES,
  type Student,
} from "../modules/students/student.types.js";

const DEVELOPMENT_DB_NAME = "rams_platform_dev";
const DEFAULT_PHOTO_PATH = path.resolve(
  process.cwd(),
  "assets/seed/undergraduate-students.png",
);
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

type UndergraduateSeed = Pick<
  Student,
  | "nim"
  | "fullName"
  | "program"
  | "faculty"
  | "department"
  | "specialization"
  | "bio"
>;

const undergraduateStudents: UndergraduateSeed[] = [
  {
    nim: "5024241001",
    fullName: "Aditya Raka Pradipta",
    program: "Marine Engineering",
    faculty: "Faculty of Marine Technology",
    department: "Department of Marine Engineering",
    specialization: [
      "Reliability-Centered Maintenance",
      "Ship Machinery Reliability",
    ],
    bio: "Active undergraduate student exploring reliability-centered maintenance and machinery dependability for marine propulsion systems.",
  },
  {
    nim: "5024241002",
    fullName: "Nadia Safira Wibowo",
    program: "Naval Architecture",
    faculty: "Faculty of Marine Technology",
    department: "Department of Naval Architecture",
    specialization: ["Structural Reliability", "Ship Design Safety"],
    bio: "Active undergraduate student focused on structural reliability and safety-oriented ship design.",
  },
  {
    nim: "5024241003",
    fullName: "Bagas Dwi Nugroho",
    program: "Mechanical Engineering",
    faculty: "Faculty of Industrial Technology and Systems Engineering",
    department: "Department of Mechanical Engineering",
    specialization: ["Maintenance Engineering", "Failure Analysis"],
    bio: "Active undergraduate student studying maintenance engineering and failure analysis for dependable industrial machinery.",
  },
  {
    nim: "5024241004",
    fullName: "Kirana Ayu Larasati",
    program: "Electrical Engineering",
    faculty: "Faculty of Intelligent Electrical and Informatics Technology",
    department: "Department of Electrical Engineering",
    specialization: ["Marine Electrical Systems", "Condition Monitoring"],
    bio: "Active undergraduate student investigating marine electrical systems and condition monitoring for safer operations.",
  },
  {
    nim: "5024241005",
    fullName: "Fajar Ramadhan Putra",
    program: "Industrial Engineering",
    faculty: "Faculty of Industrial Technology and Systems Engineering",
    department: "Department of Industrial Engineering",
    specialization: ["Risk Assessment", "Asset Management"],
    bio: "Active undergraduate student working on risk assessment and asset management for reliable industrial systems.",
  },
  {
    nim: "5024241006",
    fullName: "Salsabila Zahra Anindita",
    program: "Ocean Engineering",
    faculty: "Faculty of Marine Technology",
    department: "Department of Ocean Engineering",
    specialization: ["Offshore Reliability", "Safety Engineering"],
    bio: "Active undergraduate student exploring offshore reliability and safety engineering for ocean structures.",
  },
  {
    nim: "5024241007",
    fullName: "Rizky Maulana Akbar",
    program: "Computer Engineering",
    faculty: "Faculty of Intelligent Electrical and Informatics Technology",
    department: "Department of Computer Engineering",
    specialization: ["Maritime Informatics", "Reliability Data Analytics"],
    bio: "Active undergraduate student developing maritime informatics and data analytics approaches for reliability monitoring.",
  },
  {
    nim: "5024241008",
    fullName: "Alya Putri Maharani",
    program: "Systems Engineering",
    faculty: "Faculty of Industrial Technology and Systems Engineering",
    department: "Department of Systems Engineering",
    specialization: ["System Safety", "RAM Analysis"],
    bio: "Active undergraduate student focusing on system safety and RAM analysis for complex engineering systems.",
  },
  {
    nim: "5024241009",
    fullName: "Dimas Arya Pratama",
    program: "Marine Engineering",
    faculty: "Faculty of Marine Technology",
    department: "Department of Marine Engineering",
    specialization: ["Maritime Safety", "Risk-Based Inspection"],
    bio: "Active undergraduate student examining maritime safety and risk-based inspection strategies for ship operations.",
  },
  {
    nim: "5024241010",
    fullName: "Intan Permata Sari",
    program: "Industrial Engineering",
    faculty: "Faculty of Industrial Technology and Systems Engineering",
    department: "Department of Industrial Engineering",
    specialization: ["Human Factors", "Safety Management Systems"],
    bio: "Active undergraduate student studying human factors and safety management systems in industrial operations.",
  },
];

function assertDevelopmentEnvironment() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed undergraduate students in production");
  }
  if (process.env.DB_NAME !== DEVELOPMENT_DB_NAME) {
    throw new Error(
      `Refusing to seed: DB_NAME must be ${DEVELOPMENT_DB_NAME} (received ${process.env.DB_NAME ?? "undefined"})`,
    );
  }
}

function photoPath() {
  return process.env.UNDERGRADUATE_SEED_PHOTO_PATH
    ? path.resolve(process.env.UNDERGRADUATE_SEED_PHOTO_PATH)
    : DEFAULT_PHOTO_PATH;
}

async function readPhoto() {
  const buffer = await readFile(photoPath());
  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error("Undergraduate seed photo must be a PNG file");
  }
  return buffer;
}

async function resolvePhotoUrl() {
  const collection = getStudentCollection();
  const primaryNim = undergraduateStudents[0].nim;
  const existing = primaryNim
    ? await collection.findOne({ nim: primaryNim })
    : null;

  if (existing?.photo) {
    console.log("Reusing existing student profile photo URL");
    return existing.photo;
  }

  const uploaded = await uploadProfilePhoto(await readPhoto());
  console.log("Uploaded the shared student profile photo to Cloudinary");
  return uploaded.url;
}

async function seedUndergraduateStudents() {
  const now = new Date();
  const collection = getStudentCollection();
  const photo = await resolvePhotoUrl();
  const nims = undergraduateStudents.map((student) => student.nim!);
  const studentType = STUDENT_TYPES.UNDERGRADUATE_STUDENT;

  for (const student of undergraduateStudents) {
    const { nim, ...profile } = student;
    await collection.updateOne(
      { nim },
      {
        $set: {
          ...profile,
          nim,
          studentType,
          photo,
          isPublic: true,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }

  const seededCount = await collection.countDocuments({
    nim: { $in: nims },
    studentType,
    isPublic: true,
  });
  const distinctNims = await collection.distinct("nim", {
    nim: { $in: nims },
  });
  const photoCount = await collection.countDocuments({
    nim: { $in: nims },
    photo,
  });

  console.log(`Undergraduate students seeded: ${seededCount}/10`);
  console.log(`Unique NIMs: ${distinctNims.length}/10`);
  console.log(`Profiles using the shared photo: ${photoCount}/10`);
  for (const student of undergraduateStudents) {
    console.log(`- ${student.nim} ${student.fullName} (${student.program})`);
  }

  if (
    seededCount !== undergraduateStudents.length ||
    distinctNims.length !== undergraduateStudents.length ||
    photoCount !== undergraduateStudents.length
  ) {
    throw new Error("Undergraduate student verification failed");
  }
}

async function main() {
  assertDevelopmentEnvironment();
  await connectDatabase();
  await createStudentIndexes();
  await seedUndergraduateStudents();
  console.log("Undergraduate student seed completed successfully");
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(
      "Undergraduate student seed failed:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
