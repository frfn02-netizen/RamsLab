import { countAlumni } from "../alumni/alumni.repository.js";
import { countDosen } from "../dosen/dosen.repository.js";
import { countProjects } from "../projects/project.repository.js";
import { countUsers } from "../users/user.repository.js";
import { countPartners } from "../partners/partner.repository.js";
import {PARTNER_TYPE} from "../partners/partner.types.js";

export async function getDashboardStats() {
  const [
    users,
    alumni,
    dosen,
    projects,
    universityPartners,
    industrialPartners,
  ] = await Promise.all([
    countUsers(),
    countAlumni(),
    countDosen(),
    countProjects(),
    countPartners(
      PARTNER_TYPE.UNIVERSITY
    ),
    countPartners(
      PARTNER_TYPE.INDUSTRIAL
    ),
  ]);

  return {
    users,
    alumni,
    dosen,
    projects,
    universityPartners,
    industrialPartners,
  };
}