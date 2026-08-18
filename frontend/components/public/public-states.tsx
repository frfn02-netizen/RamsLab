import { useTranslations } from "next-intl";

export function PublicLoading({ label }: { label?: string }) {
  const common = useTranslations("common");
  return <div className="border border-[var(--border)] bg-white p-8 text-center" role="status"><span className="mx-auto mb-4 block h-5 w-5 animate-spin border-2 border-[var(--border)] border-t-[var(--ais-blue)]" aria-hidden="true" /><p className="text-sm text-[var(--gray)]">{label ?? common("loading")}…</p></div>;
}

export function PublicError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const common = useTranslations("common");
  return <div className="border border-red-200 bg-red-50 p-7" role="alert"><p className="eyebrow text-[var(--rams-red)]">{common("requestUnavailable")}</p><p className="mt-3 text-sm leading-6 text-red-950">{message}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-5 border border-[var(--rams-red)] px-4 py-2 text-sm font-semibold text-[var(--rams-red)] hover:bg-white">{common("tryAgain")}</button>}</div>;
}

export function PublicEmpty({ title, description }: { title: string; description: string }) {
  const common = useTranslations("common");
  return <div className="border border-dashed border-[var(--border)] bg-white p-9 text-center"><p className="eyebrow text-[var(--ais-blue)]">{common("noPublishedRecords")}</p><h2 className="mt-3 font-display text-xl font-semibold text-[var(--navy)]">{title}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--slate)]">{description}</p></div>;
}
