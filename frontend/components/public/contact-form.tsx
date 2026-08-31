"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

const topicKeys = [
  "risk",
  "ais",
  "reliability",
  "maintenance",
  "design",
  "collaboration",
  "other",
] as const;
const inputClass =
  "w-full border border-[#D9E0E6] bg-white px-3.5 py-3 text-sm font-normal text-[var(--navy)] outline-none transition focus:border-[var(--rams-red)] focus:ring-2 focus:ring-[var(--rams-red)]/15";

export default function ContactForm({
  className = "",
}: {
  className?: string;
}) {
  const t = useTranslations("contact");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(false);
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      setError(true);
      return;
    }
    setSubmitted(true);
  }

  return (
    <div
      id="contact-form"
      className={`scroll-mt-20 border border-[#D9E0E6] bg-white p-6 sm:p-10 ${className}`.trim()}
    >
      <p className="eyebrow text-[var(--rams-red)]">{t("formEyebrow")}</p>
      <h2 className="mt-4 font-display text-3xl font-bold tracking-[-0.02em] text-[var(--navy)]">
        {t("formTitle")}
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--gray)]">
        {t("formDescription")}
      </p>
      {submitted ? (
        <div
          className="mt-8 border border-[#D9E0E6] bg-[var(--background-light)] p-6"
          role="status"
        >
          <p className="font-semibold text-[var(--navy)]">{t("ready")}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--gray)]">
            {t("notWired")}
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-5 text-sm font-semibold text-[var(--rams-red)] transition hover:text-[var(--rams-red-dark)]"
          >
            {t("edit")}
          </button>
        </div>
      ) : (
        <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-[var(--navy)]">
              {t("name")}
              <input
                name="name"
                required
                autoComplete="name"
                className={inputClass}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[var(--navy)]">
              {t("institution")}
              <input
                name="institution"
                required
                autoComplete="organization"
                className={inputClass}
              />
            </label>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-[var(--navy)]">
              {t("email")}
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className={inputClass}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[var(--navy)]">
              {t("topic")}
              <select
                name="topic"
                required
                defaultValue=""
                className={inputClass}
              >
                <option value="" disabled>
                  {t("selectTopic")}
                </option>
                {topicKeys.map((key) => (
                  <option key={key}>{t(`topics.${key}`)}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-2 text-sm font-semibold text-[var(--navy)]">
            {t("message")}
            <textarea
              name="message"
              required
              rows={5}
              className={`${inputClass} resize-y`}
            />
          </label>
          {error && (
            <p
              className="text-sm font-medium text-[var(--rams-red)]"
              role="alert"
            >
              {t("requiredError")}
            </p>
          )}
          <button
            type="submit"
            className="bg-[var(--rams-red)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)]"
          >
            {t("sendMessage")} →
          </button>
        </form>
      )}
    </div>
  );
}
