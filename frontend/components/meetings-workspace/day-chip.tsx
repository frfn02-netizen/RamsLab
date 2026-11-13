export default function DayChip({ value }: { value: string }) {
  const date = new Date(value);
  return (
    <span className="flex w-14 shrink-0 flex-col items-center justify-center border border-black/10 bg-[var(--rams-gray-light)] px-2 py-2 text-[var(--rams-charcoal)]">
      <span className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[var(--rams-gray)]">
        {date.toLocaleDateString(undefined, { weekday: "short" })}
      </span>
      <span className="mt-0.5 text-xl font-bold leading-none">
        {date.getDate()}
      </span>
      <span className="mt-0.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[var(--rams-gray)]">
        {date.toLocaleDateString(undefined, { month: "short" })}
      </span>
    </span>
  );
}
