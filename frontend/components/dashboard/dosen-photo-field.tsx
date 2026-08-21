"use client";

import ProfilePhotoField from "./profile-photo-field";
import type { ComponentProps } from "react";

export default function DosenPhotoField(props: Omit<ComponentProps<typeof ProfilePhotoField>, "profileLabel">) {
  return <ProfilePhotoField {...props} profileLabel="dosen" />;
}
