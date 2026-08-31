export default function TechnicalCallout({
  eyebrow,
  items,
}: {
  eyebrow: string;
  items: Array<[string, string]>;
}) {
  return (
    <div className="border-l-4 border-[var(--rams-red)] bg-white p-6 sm:p-8">
      <p className="eyebrow">{eyebrow}</p>
      <dl className="mt-5 divide-y divide-[var(--border)]">
        {items.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-1 py-4 first:pt-0 last:pb-0 sm:grid-cols-[.85fr_1.15fr] sm:gap-5"
          >
            <dt className="text-sm text-[var(--gray)]">{label}</dt>
            <dd className="text-sm font-semibold leading-6 text-[var(--navy)]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
