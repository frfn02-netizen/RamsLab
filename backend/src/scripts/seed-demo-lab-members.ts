import "dotenv/config";
import { randomBytes } from "node:crypto";

type Session = {
  cookies: Map<string, string>;
  csrfToken: string | null;
};

type ApiResult = {
  status: number;
  body: Record<string, unknown>;
};

type DemoAccount = {
  fullName: string;
  email: string;
  employeeId: string;
  nip: string;
  nidn: string;
  faculty: string;
  department: string;
  institution: string;
  program: string;
  title: string;
  position: string;
  specialization: string[];
  bio: string;
};

const API_URL = (
  process.env.DEMO_API_URL ?? "http://127.0.0.1:5001/api"
).replace(/\/$/, "");
const ADMIN_EMAIL = (
  process.env.DEMO_ADMIN_EMAIL ?? "demo.admin@demo.ramslab.ac.id"
).toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    fullName: "Dr. Arini Prameswari, S.T., M.T.",
    email: "arini.prameswari@demo.ramslab.ac.id",
    employeeId: "RAMS-DEMO-001",
    nip: "198503172010122001",
    nidn: "0017038501",
    faculty: "Faculty of Marine Technology",
    department: "Marine Engineering",
    institution: "RAMS Institute of Marine Technology",
    program: "Marine Engineering",
    title: "Dr.",
    position: "Associate Professor",
    specialization: ["Reliability Engineering", "Risk Assessment"],
    bio: "Researches reliability modelling and risk-based maintenance for marine and offshore systems.",
  },
  {
    fullName: "Bagas Pratama Wijaya, S.T., M.Sc.",
    email: "bagas.wijaya@demo.ramslab.ac.id",
    employeeId: "RAMS-DEMO-002",
    nip: "198811042015041002",
    nidn: "0004118802",
    faculty: "Faculty of Marine Technology",
    department: "Naval Architecture",
    institution: "RAMS Institute of Marine Technology",
    program: "Naval Architecture and Shipbuilding Engineering",
    title: "Ir.",
    position: "Assistant Professor",
    specialization: ["Ship Structures", "Fatigue and Fracture"],
    bio: "Studies ship structural integrity, fatigue assessment, and structural health monitoring.",
  },
  {
    fullName: "Citra Larasati, S.T., M.T., Ph.D.",
    email: "citra.larasati@demo.ramslab.ac.id",
    employeeId: "RAMS-DEMO-003",
    nip: "198207212008012003",
    nidn: "0021078203",
    faculty: "Faculty of Marine Technology",
    department: "Ocean Engineering",
    institution: "RAMS Institute of Marine Technology",
    program: "Ocean Engineering",
    title: "Dr.",
    position: "Senior Lecturer",
    specialization: ["Ocean Structures", "Hydrodynamics"],
    bio: "Focuses on ocean structure response, wave loading, and hydrodynamic analysis.",
  },
  {
    fullName: "Daffa Rizky Ramadhan, S.T., M.T.",
    email: "daffa.ramadhan@demo.ramslab.ac.id",
    employeeId: "RAMS-DEMO-004",
    nip: "199005152018011004",
    nidn: "0015059004",
    faculty: "Faculty of Marine Technology",
    department: "Marine Engineering",
    institution: "RAMS Institute of Marine Technology",
    program: "Marine Engineering",
    title: "S.T., M.T.",
    position: "Lecturer",
    specialization: ["Marine Machinery", "Condition Monitoring"],
    bio: "Works on marine machinery diagnostics, vibration analysis, and condition monitoring.",
  },
  {
    fullName: "Elvira Maharani, S.T., M.Eng.",
    email: "elvira.maharani@demo.ramslab.ac.id",
    employeeId: "RAMS-DEMO-005",
    nip: "198909232014042005",
    nidn: "0023098905",
    faculty: "Faculty of Marine Technology",
    department: "Marine Engineering",
    institution: "RAMS Institute of Marine Technology",
    program: "Marine Engineering",
    title: "Dr.",
    position: "Assistant Professor",
    specialization: ["Safety Engineering", "Human Factors"],
    bio: "Investigates safety engineering, human factors, and operational risk in maritime systems.",
  },
  {
    fullName: "Fajar Adi Nugroho, S.T., M.Sc.",
    email: "fajar.nugroho@demo.ramslab.ac.id",
    employeeId: "RAMS-DEMO-006",
    nip: "198611302012121006",
    nidn: "0030118606",
    faculty: "Faculty of Marine Technology",
    department: "Naval Architecture",
    institution: "RAMS Institute of Marine Technology",
    program: "Naval Architecture and Shipbuilding Engineering",
    title: "S.T., M.Sc.",
    position: "Lecturer",
    specialization: ["Computational Fluid Dynamics", "Ship Resistance"],
    bio: "Researches ship resistance, propulsion performance, and computational fluid dynamics.",
  },
];

function createSession(): Session {
  return { cookies: new Map(), csrfToken: null };
}

function updateCookies(session: Session, response: Response) {
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator <= 0) continue;
    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    if (value) session.cookies.set(name, value);
    else session.cookies.delete(name);
  }
}

async function request(
  session: Session,
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    csrf?: boolean;
  } = {},
): Promise<ApiResult> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (session.cookies.size > 0) {
    headers.Cookie = [...session.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
  if (options.csrf !== false && method !== "GET" && session.csrfToken) {
    headers["X-CSRF-Token"] = session.csrfToken;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  updateCookies(session, response);
  const text = await response.text();
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  return { status: response.status, body };
}

async function login(email: string, password: string): Promise<Session> {
  const session = createSession();
  const result = await request(session, "/auth/login", {
    method: "POST",
    body: { email, password },
    csrf: false,
  });
  if (result.status !== 200) {
    throw new Error(`Login failed with HTTP ${result.status}`);
  }
  const csrfToken = result.body.csrfToken;
  if (typeof csrfToken !== "string" || !csrfToken) {
    throw new Error("Login response did not contain a CSRF token");
  }
  session.csrfToken = csrfToken;
  return session;
}

function dataRecord(body: Record<string, unknown>): Record<string, unknown> {
  const data = body.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("API response did not contain an object payload");
  }
  return data as Record<string, unknown>;
}

async function findDirectoryUser(
  admin: Session,
  email: string,
): Promise<Record<string, unknown> | null> {
  const result = await request(admin, "/users/directory");
  if (result.status !== 200) {
    throw new Error(`Directory lookup failed with HTTP ${result.status}`);
  }
  const items = result.body.data;
  if (!Array.isArray(items)) return null;
  return (
    (items.find(
      (item): item is Record<string, unknown> =>
        Boolean(item) &&
        typeof item === "object" &&
        (item as Record<string, unknown>).email === email,
    ) as Record<string, unknown> | undefined) ?? null
  );
}

async function ensureUser(
  admin: Session,
  account: DemoAccount,
): Promise<{ id: string; password: string; created: boolean }> {
  const password = randomBytes(18).toString("base64url");
  const result = await request(admin, "/users/dosen", {
    method: "POST",
    body: { email: account.email, password },
  });
  if (result.status === 201) {
    return { id: String(dataRecord(result.body).id), password, created: true };
  }
  if (result.status === 409) {
    const existing = await findDirectoryUser(admin, account.email);
    if (!existing || existing.role !== "DOSEN") {
      throw new Error(`Existing account conflict for ${account.email}`);
    }
    return { id: String(existing.id), password: "", created: false };
  }
  throw new Error(
    `User creation failed for ${account.email} with HTTP ${result.status}`,
  );
}

async function findDosenProfile(
  admin: Session,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const result = await request(admin, "/dosen");
  if (result.status !== 200) {
    throw new Error(`Dosen list failed with HTTP ${result.status}`);
  }
  if (!Array.isArray(result.body.data)) return null;
  return (
    (result.body.data.find(
      (item): item is Record<string, unknown> =>
        Boolean(item) &&
        typeof item === "object" &&
        (item as Record<string, unknown>).userId === userId,
    ) as Record<string, unknown> | undefined) ?? null
  );
}

async function ensureProfile(
  admin: Session,
  account: DemoAccount,
  userId: string,
): Promise<{ id: string; created: boolean }> {
  const existing = await findDosenProfile(admin, userId);
  if (existing) return { id: String(existing._id), created: false };

  const result = await request(admin, "/dosen", {
    method: "POST",
    body: {
      userId,
      fullName: account.fullName,
      employeeId: account.employeeId,
      nip: account.nip,
      nidn: account.nidn,
      faculty: account.faculty,
      department: account.department,
      institution: account.institution,
      program: account.program,
      title: account.title,
      position: account.position,
      specialization: account.specialization,
      email: account.email,
      bio: account.bio,
      showNip: false,
      showNidn: false,
      showEmail: true,
      education: [
        {
          degree: "Master",
          field: "Marine Engineering",
          institution: "RAMS Institute of Marine Technology",
          startYear: 2008,
          endYear: 2010,
        },
      ],
      isPublic: false,
      publicationIds: [],
    },
  });
  if (result.status !== 201) {
    throw new Error(
      `Dosen profile creation failed for ${account.email} with HTTP ${result.status}`,
    );
  }
  return { id: String(dataRecord(result.body)._id), created: true };
}

async function findMembership(
  admin: Session,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const result = await request(admin, "/lab-memberships?limit=200");
  if (result.status !== 200) {
    throw new Error(`Membership list failed with HTTP ${result.status}`);
  }
  const data = dataRecord(result.body);
  if (!Array.isArray(data.items)) return null;
  return (
    (data.items.find(
      (item): item is Record<string, unknown> =>
        Boolean(item) &&
        typeof item === "object" &&
        (item as Record<string, unknown>).userId === userId,
    ) as Record<string, unknown> | undefined) ?? null
  );
}

async function ensureMembership(
  admin: Session,
  userId: string,
): Promise<{ status: string; created: boolean }> {
  const existing = await findMembership(admin, userId);
  if (existing?.status === "ACTIVE") {
    return { status: "ACTIVE", created: false };
  }
  if (existing) {
    const result = await request(admin, `/lab-memberships/${userId}`, {
      method: "PATCH",
      body: { status: "ACTIVE" },
    });
    if (result.status !== 200) {
      throw new Error(`Membership activation failed with HTTP ${result.status}`);
    }
    return { status: String(dataRecord(result.body).status), created: false };
  }

  const result = await request(admin, "/lab-memberships", {
    method: "POST",
    body: { userId },
  });
  if (result.status !== 201) {
    throw new Error(`Membership creation failed with HTTP ${result.status}`);
  }
  return { status: String(dataRecord(result.body).status), created: true };
}

async function verifyAgendaAccess(admin: Session, userId: string) {
  const reset = await request(admin, `/users/${userId}/password-reset`, {
    method: "POST",
  });
  if (reset.status !== 200) {
    throw new Error(`Password reset failed with HTTP ${reset.status}`);
  }
  const temporaryPassword = dataRecord(reset.body).temporaryPassword;
  if (typeof temporaryPassword !== "string") {
    throw new Error("Password reset did not return a temporary password");
  }

  const firstSession = await login(
    DEMO_ACCOUNTS[0].email,
    temporaryPassword,
  );
  const newPassword = randomBytes(18).toString("base64url");
  const changed = await request(firstSession, "/auth/change-password", {
    method: "POST",
    body: {
      currentPassword: temporaryPassword,
      newPassword,
    },
  });
  if (changed.status !== 200) {
    throw new Error(`Password change failed with HTTP ${changed.status}`);
  }

  const memberSession = await login(DEMO_ACCOUNTS[0].email, newPassword);
  const agenda = await request(memberSession, "/meetings/agenda?limit=5");
  if (agenda.status !== 200) {
    throw new Error(`Agenda access failed with HTTP ${agenda.status}`);
  }
}

async function verifyMembershipToggle(admin: Session, userId: string) {
  const deactivated = await request(admin, `/lab-memberships/${userId}`, {
    method: "PATCH",
    body: { status: "INACTIVE" },
  });
  if (deactivated.status !== 200) {
    throw new Error(
      `Membership deactivation failed with HTTP ${deactivated.status}`,
    );
  }
  const reactivated = await request(admin, `/lab-memberships/${userId}`, {
    method: "PATCH",
    body: { status: "ACTIVE" },
  });
  if (reactivated.status !== 200) {
    throw new Error(
      `Membership reactivation failed with HTTP ${reactivated.status}`,
    );
  }
}


async function main() {
  if (!ADMIN_PASSWORD) {
    throw new Error("SEED_ADMIN_PASSWORD is required");
  }

  const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const results = [];

  for (const account of DEMO_ACCOUNTS) {
    const user = await ensureUser(admin, account);
    const profile = await ensureProfile(admin, account, user.id);
    const membership = await ensureMembership(admin, user.id);
    results.push({
      fullName: account.fullName,
      email: account.email,
      userId: user.id,
      profileId: profile.id,
      membershipStatus: membership.status,
      userCreated: user.created,
      profileCreated: profile.created,
      membershipCreated: membership.created,
      photo: null,
    });
  }

  if (results.length > 0) {
    await verifyAgendaAccess(admin, results[0].userId);
    await verifyMembershipToggle(admin, results[results.length - 1].userId);
  }

  console.log(JSON.stringify({ database: "rams_meetings_demo", results }, null, 2));
}

main().catch((error: unknown) => {
  console.error(
    "Demo lab member seed failed:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});
