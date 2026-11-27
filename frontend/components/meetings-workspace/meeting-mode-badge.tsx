import { meetingModeAriaLabel, meetingModeLabel } from "@/lib/meetings/mode";
import type { MeetingMode } from "@/types/meetings";

function ModeIcon({ mode }: { mode: MeetingMode | null | undefined }) {
  if (mode === "ONLINE") {
    return (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5 shrink-0"
        aria-hidden="true"
      >
        <rect x="2.5" y="5.5" width="10" height="9" rx="1.5" />
        <path d="m12.5 9 5-2.5v7l-5-2.5" />
      </svg>
    );
  }

  if (mode === "OFFLINE") {
    return (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5 shrink-0"
        aria-hidden="true"
      >
        <path d="M16 8.6c0 4.1-6 8.4-6 8.4S4 12.7 4 8.6a6 6 0 1112 0Z" />
        <circle cx="10" cy="8.6" r="2" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="6.5" />
      <path d="M7 10h6" />
    </svg>
  );
}

export default function MeetingModeBadge({
  mode,
  className = "",
}: {
  mode: MeetingMode | null | undefined;
  className?: string;
}) {
  const unavailable = mode === undefined;
  const tone = unavailable
    ? "bg-[#F1F0EE] text-[#69645E]"
    : mode === "ONLINE"
      ? "bg-[#FFF3D9] text-[#94631A]"
      : mode === "OFFLINE"
        ? "bg-[#EDF1EA] text-[#3F5B3B]"
        : "bg-[#F1F0EE] text-[#69645E]";

  return (
    <span
      role="img"
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${tone} ${className}`}
      aria-label={meetingModeAriaLabel(mode)}
    >
      <ModeIcon mode={mode} />
      {unavailable ? "Mode unavailable" : meetingModeLabel(mode)}
    </span>
  );
}
