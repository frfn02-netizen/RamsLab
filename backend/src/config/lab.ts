const LAB_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;
const DEFAULT_LAB_ID = "rams";

export function readCurrentLabId(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const labId = env.RAMS_LAB_ID?.trim() || DEFAULT_LAB_ID;
  if (!LAB_ID_PATTERN.test(labId)) {
    throw new Error(
      "RAMS_LAB_ID must be 2-64 lowercase letters, digits, or hyphens",
    );
  }
  return labId;
}

export const CURRENT_LAB_ID = readCurrentLabId();
