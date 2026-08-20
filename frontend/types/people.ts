export type PeopleCategory = "DOSEN" | "MAHASISWA" | "ALUMNI";

export interface PublicPerson {
  id: string;
  category: PeopleCategory;
  fullName: string;
  title?: string;
  position?: string;
  specialization: string[];
  photo?: string;
  bio?: string;
  linkedin?: string;
  graduationYear?: number;
}

export interface PublicPeopleResponse {
  DOSEN: PublicPerson[];
  MAHASISWA: PublicPerson[];
  ALUMNI: PublicPerson[];
}
