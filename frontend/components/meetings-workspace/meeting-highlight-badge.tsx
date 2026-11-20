import { Badge } from "@/components/ui";

export default function MeetingHighlightBadge({
  involvesHighlightedUser,
}: {
  involvesHighlightedUser?: boolean;
}) {
  if (!involvesHighlightedUser) return null;
  return <Badge tone="red">Involves Pak Dhimas</Badge>;
}
