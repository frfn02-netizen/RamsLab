import AlumniProfile from "@/components/profile/alumni-profile";

export const metadata = { title: "Your profile", robots: { index: false, follow: false } };

export default function ProfilePage() {
  return <AlumniProfile />;
}
