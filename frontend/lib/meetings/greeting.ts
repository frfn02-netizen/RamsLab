export function meetingGreeting(
  fullName: string | undefined,
  date = new Date(),
) {
  const hour = date.getHours();
  const salutation =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = fullName?.trim();

  return name ? `${salutation}, ${name}.` : `${salutation}.`;
}
