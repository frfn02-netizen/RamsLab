"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-providers";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { getAlumniById } from "@/lib/api/alumni";
import { getUserFacingError } from "@/lib/api/errors";
import {
  createTracking,
  deleteTracking,
  getTrackingByAlumniId,
} from "@/lib/api/modules";
import type { Alumni } from "@/types/alumni";
import type { AlumniTracking, TrackingType } from "@/types/modules";

const trackingTypes: TrackingType[] = [
  "GRADUATION",
  "EMPLOYMENT",
  "PROMOTION",
  "EDUCATION",
  "ENTREPRENEURSHIP",
  "JOB_SEEKING",
  "OTHER",
];
function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

export default function TrackingPage({ alumniId }: { alumniId: string }) {
  const { user } = useAuth();
  const [alumni, setAlumni] = useState<Alumni | null>(null);
  const [events, setEvents] = useState<AlumniTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "EMPLOYMENT" as TrackingType,
    title: "",
    startDate: "",
    endDate: "",
    description: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function loadTracking() {
      try {
        const [profile, result] = await Promise.all([
          getAlumniById(alumniId),
          getTrackingByAlumniId(alumniId),
        ]);
        if (!cancelled) {
          setAlumni(profile);
          setEvents(result);
        }
      } catch (reason) {
        if (!cancelled) setError(getUserFacingError(reason));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadTracking();
    return () => {
      cancelled = true;
    };
  }, [alumniId]);

  async function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await createTracking(alumniId, {
        ...form,
        endDate: form.endDate || null,
      });
      setEvents((current) => [...current, created]);
      setForm({
        type: "EMPLOYMENT",
        title: "",
        startDate: "",
        endDate: "",
        description: "",
      });
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSubmitting(false);
    }
  }

  async function removeEvent(item: AlumniTracking) {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    try {
      await deleteTracking(item._id);
      setEvents((current) => current.filter((event) => event._id !== item._id));
    } catch (reason) {
      setError(getUserFacingError(reason));
    }
  }

  if (loading)
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <LoadingState label="Loading tracking" />
      </div>
    );
  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-5xl space-y-7">
        <Link
          href={`/dashboard/alumni/${alumniId}`}
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← Alumni profile
        </Link>
        <PageHeader
          eyebrow="Alumni journey"
          title={alumni?.fullName ?? "Tracking"}
          description="Record milestones in this alumni's professional and educational journey."
        />
        {error && <ErrorState message={error} />}
        {user?.role === "ADMIN" && (
          <Card className="p-6">
            <h2 className="text-xl font-bold">Add tracking event</h2>
            <form
              onSubmit={addEvent}
              className="mt-5 grid gap-5 sm:grid-cols-2"
            >
              <Field label="Type">
                <select
                  className={inputClass}
                  value={form.type}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      type: event.target.value as TrackingType,
                    })
                  }
                >
                  {trackingTypes.map((type) => (
                    <option key={type} value={type}>
                      {label(type)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Title">
                <input
                  required
                  minLength={2}
                  className={inputClass}
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                />
              </Field>
              <Field label="Start date">
                <input
                  required
                  type="date"
                  className={inputClass}
                  value={form.startDate}
                  onChange={(event) =>
                    setForm({ ...form, startDate: event.target.value })
                  }
                />
              </Field>
              <Field label="End date">
                <input
                  type="date"
                  className={inputClass}
                  value={form.endDate}
                  onChange={(event) =>
                    setForm({ ...form, endDate: event.target.value })
                  }
                />
              </Field>
              <Field label="Description">
                <textarea
                  className={`${inputClass} min-h-24 sm:col-span-2`}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </Field>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Add event"}
              </Button>
            </form>
          </Card>
        )}
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Timeline</h2>
          {events.length ? (
            events.map((event) => (
              <Card key={event._id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Badge tone="red">{label(event.type)}</Badge>
                    <h3 className="mt-3 text-lg font-bold">{event.title}</h3>
                    <p className="mt-1 text-sm text-[var(--rams-gray)]">
                      {dateLabel(event.startDate)}
                      {event.endDate
                        ? ` – ${dateLabel(event.endDate)}`
                        : " – Present"}
                    </p>
                  </div>
                  {user?.role === "ADMIN" && (
                    <Button
                      variant="danger"
                      onClick={() => void removeEvent(event)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
                {event.description && (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6">
                    {event.description}
                  </p>
                )}
              </Card>
            ))
          ) : (
            <Card className="p-6">
              <p className="text-sm text-[var(--rams-gray)]">
                No events recorded yet.
              </p>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
