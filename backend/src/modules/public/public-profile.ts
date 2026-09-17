import type { Request } from "express";

import type { Alumni } from "../alumni/alumni.types.js";
import type { Dosen } from "../dosen/dosen.types.js";
import type { Student } from "../students/student.types.js";

function isLocalHost(hostname: string) {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  );
}

export function getPublicApiOrigin(req: Request) {
  const configuredOrigin = process.env.PUBLIC_API_URL?.trim().replace(
    /\/$/,
    "",
  );
  const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const requestHost = req.get("host");
  const requestOrigin = requestHost
    ? `${forwardedProtocol || req.protocol}://${requestHost}`
    : undefined;

  if (configuredOrigin) {
    try {
      const configuredUrl = new URL(configuredOrigin);
      const requestUrl = requestOrigin ? new URL(requestOrigin) : undefined;

      // A development URL must not leak into a production public response.
      if (
        !isLocalHost(configuredUrl.hostname) ||
        !requestUrl ||
        isLocalHost(requestUrl.hostname)
      ) {
        return configuredOrigin;
      }
    } catch {
      // Fall back to the request origin below when the environment value is invalid.
    }
  }

  return requestOrigin || configuredOrigin || "http://localhost:5000";
}

function publicPhotoUrl(req: Request, photo?: string) {
  if (!photo) return undefined;

  try {
    const origin = getPublicApiOrigin(req);
    const parsed = new URL(photo, origin);
    const filename = parsed.pathname.split("/").filter(Boolean).at(-1);
    const localPhotoFilename =
      filename && /^[a-f0-9-]+\.(?:jpe?g|png|webp)$/i.test(filename)
        ? filename
        : undefined;
    const isApiOrigin = parsed.origin === new URL(origin).origin;

    // Older uploads stored only the generated filename, while newer records
    // store the complete URL. Treat both representations consistently.
    if (
      localPhotoFilename &&
      isApiOrigin &&
      !parsed.pathname.startsWith("/uploads/")
    ) {
      return `${origin}/uploads/dosen/${localPhotoFilename}`;
    }

    const dosenPhotoMatch = parsed.pathname.match(
      /^\/uploads\/dosen\/([a-f0-9-]+\.(?:jpe?g|png|webp))$/i,
    );

    if (dosenPhotoMatch) {
      return `${origin}/uploads/dosen/${dosenPhotoMatch[1]}`;
    }

    const studentPhotoMatch = parsed.pathname.match(
      /^\/uploads\/students\/([a-f0-9-]+\.(?:jpe?g|png|webp))$/i,
    );
    if (studentPhotoMatch) {
      return `${origin}/uploads/students/${studentPhotoMatch[1]}`;
    }

    // Cloudinary is the current profile-photo provider. Normalize legacy
    // non-secure Cloudinary URLs instead of dropping the photo entirely.
    if (parsed.hostname.toLowerCase() === "res.cloudinary.com") {
      parsed.protocol = "https:";
      return parsed.toString();
    }

    // Other external profile photos are allowed only over HTTPS.
    return parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function publicLinkedInUrl(linkedin?: string) {
  if (!linkedin) return undefined;

  try {
    const url = new URL(linkedin);
    const hostname = url.hostname.toLowerCase();
    const isLinkedInHost =
      hostname === "linkedin.com" ||
      hostname.endsWith(".linkedin.com") ||
      hostname === "lnkd.in";

    return url.protocol === "https:" && isLinkedInHost
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function publicExternalUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function toPublicDosenProfile(req: Request, member: Dosen) {
  return {
    id: member._id?.toString() ?? member.userId.toString(),
    category: "DOSEN" as const,
    fullName: member.fullName,
    title: member.title,
    position: member.position,
    nip: member.showNip ? member.nip : undefined,
    nidn: member.showNidn ? member.nidn : undefined,
    faculty: member.faculty,
    department: member.department,
    institution: member.institution,
    program: member.program,
    email: member.showEmail ? member.email : undefined,
    education: member.education,
    sintaUrl: publicExternalUrl(member.sintaUrl),
    googleScholarUrl: publicExternalUrl(member.googleScholarUrl),
    scopusUrl: publicExternalUrl(member.scopusUrl),
    orcidUrl: publicExternalUrl(member.orcidUrl),
    hIndex: member.hIndex,
    publicationCount: member.publicationCount,
    projectCount: member.projectCount,
    awardCount: member.awardCount,
    specialization: member.specialization,
    photo: publicPhotoUrl(req, member.photo),
    bio: member.bio,
    linkedin: publicLinkedInUrl(member.linkedin),
    // Explicit Publication associations. Left undefined for legacy records
    // so the public profile can fall back to name-based matching; an
    // explicitly saved (possibly empty) array takes precedence.
    publicationIds: member.publicationIds?.map((id) => id.toString()),
  };
}

export function toPublicAlumniProfile(req: Request, member: Alumni) {
  return {
    id: member._id?.toString() ?? member.userId.toString(),
    category: "ALUMNI" as const,
    fullName: member.fullName,
    position: member.currentPosition,
    program: member.program,
    location: member.location,
    specialization: member.currentCompany ? [member.currentCompany] : [],
    photo: publicPhotoUrl(req, member.photo),
    bio: member.bio,
    linkedin: publicLinkedInUrl(member.linkedin),
    graduationYear: member.graduationYear,
  };
}

export function toPublicStudentProfile(req: Request, member: Student) {
  return {
    id: member._id?.toString() ?? "",
    category:
      member.studentType === "PHD_STUDENT"
        ? ("MAHASISWA" as const)
        : member.studentType === "MASTER_STUDENT"
          ? ("MASTER" as const)
          : member.studentType === "INTERNSHIP_STUDENT"
            ? ("INTERNSHIP" as const)
            : ("UNDERGRADUATE" as const),
    fullName: member.fullName,
    title: member.program,
    position: undefined,
    specialization: member.specialization,
    photo: publicPhotoUrl(req, member.photo),
    bio: member.bio,
    linkedin: publicLinkedInUrl(member.linkedin),
    internshipStartDate: member.internshipStartDate?.toISOString() ?? null,
    internshipEndDate: member.internshipEndDate?.toISOString() ?? null,
  };
}
