"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeader,
} from "@/components/ui";
import { deleteEvent, getEvents, updateEvent } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { CmsEvent } from "@/types/modules";

export default function EventsPage() {
  const [events, setEvents] = useState<CmsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setEvents(await getEvents());
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function togglePublished(event: CmsEvent) {
    setBusyId(event._id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateEvent(event._id, {
        published: !event.published,
      });
      setEvents((current) =>
        current.map((item) => (item._id === updated._id ? updated : item)),
      );
      setSuccess(
        `${updated.title.en} is now ${updated.published ? "published" : "unpublished"}.`,
      );
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setBusyId(null);
    }
  }

  async function move(event: CmsEvent, direction: -1 | 1) {
    const index = events.findIndex((item) => item._id === event._id);
    const other = events[index + direction];
    if (!other) return;
    setBusyId(event._id);
    setError(null);
    setSuccess(null);
    try {
      const [updatedEvent, updatedOther] = await Promise.all([
        updateEvent(event._id, { order: other.order }),
        updateEvent(other._id, { order: event.order }),
      ]);
      setEvents((current) =>
        current
          .map((item) =>
            item._id === updatedEvent._id
              ? updatedEvent
              : item._id === updatedOther._id
                ? updatedOther
                : item,
          )
          .sort(
            (a, b) => a.order - b.order || a.title.en.localeCompare(b.title.en),
          ),
      );
      setSuccess("Event order updated.");
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(event: CmsEvent) {
    if (!window.confirm(`Delete "${event.title.en}"? This cannot be undone.`)) {
      return;
    }
    setBusyId(event._id);
    setError(null);
    setSuccess(null);
    try {
      await deleteEvent(event._id);
      setEvents((current) => current.filter((item) => item._id !== event._id));
      setSuccess(`${event.title.en} was deleted.`);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl space-y-7">
        <PageHeader
          eyebrow="CMS"
          title="Events"
          description="Manage the event records shown on the public Events page."
          action={
            <LinkButton href="/dashboard/events/new">Add event</LinkButton>
          }
        />
        {error && <ErrorState message={error} onRetry={() => void load()} />}
        {success && (
          <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            {success}
          </div>
        )}
        {loading ? (
          <Card>
            <LoadingState label="Loading events" />
          </Card>
        ) : events.length === 0 ? (
          <EmptyState
            title="No events found"
            description="Create an event record to publish it on the public website."
            action={
              <LinkButton href="/dashboard/events/new">Create event</LinkButton>
            }
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b border-black/8 bg-[var(--rams-gray-light)]">
                  <tr>
                    {[
                      "Title",
                      "Order",
                      "Date",
                      "Visibility",
                      "Updated",
                      "Action",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)] last:text-center"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/8">
                  {events.map((event, index) => (
                    <tr key={event._id}>
                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/events/${event._id}`}
                          className="font-semibold hover:text-[var(--rams-red)]"
                        >
                          {event.title.en}
                        </Link>
                        <p className="mt-1 text-xs text-[var(--rams-gray)]">
                          {event.title.id}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm">{event.order}</td>
                      <td className="px-5 py-4 text-sm text-[var(--rams-gray)]">
                        {event.eventDate
                          ? new Date(event.eventDate).toLocaleDateString()
                          : "Not set"}
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={event.published ? "green" : "neutral"}>
                          {event.published ? "Published" : "Draft"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--rams-gray)]">
                        {new Date(event.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-center gap-2">
                          <Button
                            variant="secondary"
                            disabled={busyId === event._id || index === 0}
                            onClick={() => void move(event, -1)}
                          >
                            Up
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={
                              busyId === event._id ||
                              index === events.length - 1
                            }
                            onClick={() => void move(event, 1)}
                          >
                            Down
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={busyId === event._id}
                            onClick={() => void togglePublished(event)}
                          >
                            {event.published ? "Unpublish" : "Publish"}
                          </Button>
                          <LinkButton
                            href={`/dashboard/events/${event._id}`}
                            variant="secondary"
                          >
                            Edit
                          </LinkButton>
                          <Button
                            variant="danger"
                            disabled={busyId === event._id}
                            onClick={() => void remove(event)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
