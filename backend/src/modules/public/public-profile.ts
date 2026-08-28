import type { Request } from "express";

import type { Alumni } from "../alumni/alumni.types.js";
import type { Dosen } from "../dosen/dosen.types.js";
import type { Student } from "../students/student.types.js";

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function getPublicApiOrigin(req: Request) {
  const configuredOrigin = process.env.PUBLIC_API_URL?.trim().replace(/\/$/, "");
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
      if (!isLocalHost(configuredUrl.hostname) || !requestUrl || isLocalHost(requestUrl.hostname)) {
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
    const dosenPhotoMatch = parsed.pathname.match(/^\/uploads\/dosen\/([a-f0-9-]+\.(?:jpg|png|webp))$/i);

    if (dosenPhotoMatch) {
      return `${origin}/uploads/dosen/${dosenPhotoMatch[1]}`;
    }

    const studentPhotoMatch = parsed.pathname.match(/^\/uploads\/students\/([a-f0-9-]+\.(?:jpg|png|webp))$/i);
    if (studentPhotoMatch) {
      return `${origin}/uploads/students/${studentPhotoMatch[1]}`;
    }

    // External profile photos are allowed only over HTTPS.
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
    const isLinkedInHost = hostname === "linkedin.com"
      || hostname.endsWith(".linkedin.com")
      || hostname === "lnkd.in";

    return url.protocol === "https:" && isLinkedInHost ? url.toString() : undefined;
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
    specialization: member.specialization,
    photo: publicPhotoUrl(req, member.photo),
    bio: member.bio,
    linkedin: publicLinkedInUrl(member.linkedin),
  };
}

export function toPublicAlumniProfile(req: Request, member: Alumni) {
  return {
    id: member._id?.toString() ?? member.userId.toString(),
    category: "ALUMNI" as const,
    fullName: member.fullName,
    position: member.currentPosition,
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
    category: member.studentType === "PHD_STUDENT" ? "MAHASISWA" as const : "UNDERGRADUATE" as const,
    fullName: member.fullName,
    title: member.program,
    position: undefined,
    specialization: member.specialization,
    photo: publicPhotoUrl(req, member.photo),
    bio: member.bio,
    linkedin: publicLinkedInUrl(member.linkedin),
  };
}
