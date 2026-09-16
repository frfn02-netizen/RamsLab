export type PeopleCategory = "DOSEN" | "MAHASISWA" | "MASTER" | "UNDERGRADUATE" | "INTERNSHIP";
export type PublicDirectoryCategory = PeopleCategory | "ALUMNI";

export interface PublicPerson {
  id: string;
  category: PublicDirectoryCategory;
  fullName: string;
  nim?: string;
  title?: string;
  position?: string;
  nip?: string;
  nidn?: string;
  faculty?: string;
  department?: string;
  institution?: string;
  program?: string;
  email?: string;
  education?: {
    degree: string;
    field: string;
    institution: string;
    startYear?: number;
    endYear?: number;
  }[];
  sintaUrl?: string;
  googleScholarUrl?: string;
  scopusUrl?: string;
  orcidUrl?: string;
  hIndex?: number;
  publicationCount?: number;
  projectCount?: number;
  awardCount?: number;
  location?: string;
  specialization: string[];
  photo?: string;
  bio?: string;
  linkedin?: string;
  graduationYear?: number;
  internshipStartDate?: string | null;
  internshipEndDate?: string | null;
}

export interface PublicPeopleResponse {
  DOSEN: PublicPerson[];
  MAHASISWA: PublicPerson[];
  MASTER: PublicPerson[];
  UNDERGRADUATE: PublicPerson[];
  INTERNSHIP: PublicPerson[];
  ALUMNI: PublicPerson[];
}

export type PublicAlumniResponse = PublicPerson[];
