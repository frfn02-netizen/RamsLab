export type PeopleCategory =
  | "DOSEN"
  | "MAHASISWA"
  | "MASTER"
  | "UNDERGRADUATE";
export type PublicDirectoryCategory = PeopleCategory | "ALUMNI";

export interface PublicPerson {
  id: string;
  category: PublicDirectoryCategory;
  fullName: string;
  nim?: string;
  title?: string;
  position?: string;
  location?: string;
  specialization: string[];
  photo?: string;
  bio?: string;
  linkedin?: string;
  graduationYear?: number;
}

export interface PublicPeopleResponse {
  DOSEN: PublicPerson[];
  MAHASISWA: PublicPerson[];
  MASTER: PublicPerson[];
  UNDERGRADUATE: PublicPerson[];
  ALUMNI: PublicPerson[];
}

export type PublicAlumniResponse = PublicPerson[];
