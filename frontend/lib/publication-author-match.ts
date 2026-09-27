export function normalizeAuthorName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

const NON_NAME_TOKENS = new Set([
  "prof",
  "professor",
  "dr",
  "drs",
  "drdr",
  "doktor",
  "ir",
  "mr",
  "ms",
  "mh",
  "apt",
  "hj",
  "hm",
  "st",
  "mt",
  "mst",
  "sst",
  "sk",
  "mk",
  "kom",
  "kt",
  "se",
  "sm",
  "sh",
  "si",
  "sik",
  "sp",
  "spd",
  "spsi",
  "ssi",
  "msi",
  "eng",
  "meng",
  "beng",
  "sc",
  "bsc",
  "msc",
  "mba",
  "dba",
  "med",
  "bed",
  "edd",
  "edu",
  "ph",
  "md",
]);

type ParsedName = {
  keywords: string[];
  initials: string[];
};

function parseName(value: string | null | undefined): ParsedName {
  const keywords: string[] = [];
  const initials: string[] = [];
  const normalized = normalizeAuthorName(value);

  if (!normalized) return { keywords, initials };

  for (const token of normalized.replace(/[^\p{L}\p{N}]+/gu, " ").split(" ")) {
    if (!token) continue;
    if (token.length === 1) {
      initials.push(token);
      continue;
    }
    if (!NON_NAME_TOKENS.has(token)) keywords.push(token);
  }

  return { keywords, initials };
}

function isSameSequence(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((token, index) => token === right[index])
  );
}

function isAnchoredSubset(shorter: string[], longer: string[]): boolean {
  if (shorter.length < 2 || shorter.length > longer.length) return false;

  const scope = new Set(longer);
  if (!shorter.every((token) => scope.has(token))) return false;

  return (
    shorter[0] === longer[0] ||
    shorter[shorter.length - 1] === longer[longer.length - 1]
  );
}

function initialsMatch(
  lecturerKeywords: string[],
  author: ParsedName,
): boolean {
  const { keywords, initials } = author;

  if (initials.length === 0 || keywords.length === 0) return false;
  if (lecturerKeywords.length < 2) return false;

  const surname = keywords[keywords.length - 1];
  if (surname !== lecturerKeywords[lecturerKeywords.length - 1]) return false;

  const preceding = lecturerKeywords.slice(0, -1);
  if (initials.length > preceding.length) return false;

  for (let start = 0; start + initials.length <= preceding.length; start += 1) {
    const aligned = initials.every((initial, offset) =>
      preceding[start + offset].startsWith(initial),
    );
    if (aligned) return true;
  }

  return false;
}

export function isPublicationAuthorMatch(
  lecturerName: string | null | undefined,
  authorName: string | null | undefined,
): boolean {
  const lecturer = parseName(lecturerName);
  const author = parseName(authorName);

  if (lecturer.keywords.length === 0 || author.keywords.length === 0) {
    return false;
  }

  if (isSameSequence(lecturer.keywords, author.keywords)) return true;
  if (isAnchoredSubset(author.keywords, lecturer.keywords)) return true;
  if (isAnchoredSubset(lecturer.keywords, author.keywords)) return true;

  return initialsMatch(lecturer.keywords, author);
}

export function matchesAnyAuthor(
  lecturerName: string | null | undefined,
  authors: readonly (string | null | undefined)[] | null | undefined,
): boolean {
  return (authors ?? []).some((author) =>
    isPublicationAuthorMatch(lecturerName, author),
  );
}
