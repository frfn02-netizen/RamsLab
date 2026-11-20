export default function DayChip({
  value,
  muted = false,
}: {
  value: string;
  muted?: boolean;
}) {
  const date = new Date(value);
  return (
    <span
      className={`flex w-12 shrink-0 flex-col items-center justify-center rounded-md border py-1.5 ${
        muted
          ? "border-[#EDE8DE] bg-[#F4F1EA] text-[#8A867D]"
          : "border-[#E7E2D8] bg-white text-[var(--rams-charcoal)]"
      }`}
    >
      <span className="text-[0.54rem] font-bold uppercase tracking-[0.14em] opacity-75">
        {date.toLocaleDateString(undefined, { weekday: "short" })}
      </span>
      <span className="text-[1.02rem] font-semibold leading-tight tabular-nums">
        {date.getDate()}
      </span>
      <span className="text-[0.54rem] font-bold uppercase tracking-[0.14em] opacity-75">
        {date.toLocaleDateString(undefined, { month: "short" })}
      </span>
    </span>
  );
}

export function Initials({
  value,
  className = "",
}: {
  value: string | undefined;
  className?: string;
}) {
  const source = (value ?? "").trim();
  const local = source.split("@")[0] || "RM";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters = (
    parts.length > 1 ? parts[0][0] + parts[1][0] : local.slice(0, 2)
  ).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-full bg-[#F1EDE5] text-[0.54rem] font-bold uppercase tracking-wide text-[#6B6A64] ${className}`}
    >
      {letters || "RM"}
    </span>
  );
}
