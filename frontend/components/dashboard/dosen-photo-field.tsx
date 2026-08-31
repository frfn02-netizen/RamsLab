"use client";

import type { ComponentProps } from "react";
import ProfilePhotoField from "./profile-photo-field";

export default function DosenPhotoField(
  props: Omit<ComponentProps<typeof ProfilePhotoField>, "profileLabel">,
) {
  return <ProfilePhotoField {...props} profileLabel="dosen" />;
}
