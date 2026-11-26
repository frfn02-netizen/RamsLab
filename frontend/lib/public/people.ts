import type { PublicPeopleResponse, PublicPerson } from "@/types/people";

export const HEAD_OF_LABORATORY_NAME =
  "Dr. Eng. Dhimas Widhi Handani, S.T., M.Sc.";

export function normalizePersonName(name: string) {
  return name
    .toLowerCase()
    .replace(/\b(dr|eng|st|s|t|msc|m|sc)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isHeadOfLaboratory(person: PublicPerson) {
  const normalizedName = normalizePersonName(person.fullName);
  const normalizedHeadName = normalizePersonName(HEAD_OF_LABORATORY_NAME);

  return (
    person.fullName === HEAD_OF_LABORATORY_NAME ||
    normalizedName === normalizedHeadName ||
    normalizedName.includes("dhimas widhi handani")
  );
}

export function hasUsablePhoto(person: PublicPerson) {
  return Boolean(person.photo?.trim());
}

export function flattenPublicPeople(people: PublicPeopleResponse) {
  return [
    ...people.DOSEN,
    ...people.MAHASISWA,
    ...people.MASTER,
    ...people.UNDERGRADUATE,
    ...people.INTERNSHIP,
    ...people.ALUMNI,
  ];
}

export function buildPeoplePool(records: PublicPeopleResponse) {
  return flattenPublicPeople(records).filter(
    (person) => hasUsablePhoto(person) && !isHeadOfLaboratory(person),
  );
}
