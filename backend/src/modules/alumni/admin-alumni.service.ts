import { deleteUser, findUserByEmail } from "../users/user.repository.js";
import { ObjectId } from "mongodb";
import { createAlumniUser } from "../users/user.service.js";
import { createAlumniShell } from "./alumni.service.js";
import {
  createAdminAlumniSchema,
  type CreateAdminAlumniInput,
} from "./admin-alumni.schema.js";

export async function createAdminAlumni(input: CreateAdminAlumniInput) {
  const data = createAdminAlumniSchema.parse(input);
  if (await findUserByEmail(data.email))
    throw new Error("Email already exists");
  const user = await createAlumniUser({
    email: data.email,
    password: data.password,
  });
  let alumni;
  try {
    alumni = await createAlumniShell(user.id);
  } catch (error) {
    await deleteUser(new ObjectId(user.id));
    throw error;
  }
  return {
    user: { ...user, isActive: true, mustChangePassword: true },
    alumni,
  };
}
