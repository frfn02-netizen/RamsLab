"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { useAuth } from "@/components/providers/auth-providers";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  LoadingState,
  inputClass,
} from "@/components/ui";
import {
  deletePartner,
  getPartnerById,
  updatePartner,
  uploadPartnerLogo,
} from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { Partner, PartnerType } from "@/types/modules";

const MAX_LOGO_BYTES = 3 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

export default function PartnerDetail({
  id,
  type,
}: {
  id: string;
  type: PartnerType;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [partner, setPartner] = useState<Partner | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    logo: "",
    website: "",
    country: "",
    isFeatured: false,
    published: false,
    showOnHomepage: false,
    homepageOrder: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getPartnerById(type, id)
      .then((result) => {
        if (cancelled) return;

        setPartner(result);
        setForm({
          name: result.name,
          logo: result.logo ?? "",
          website: result.website ?? "",
          country: result.country ?? "",
          isFeatured: result.isFeatured,
          published: result.published,
          showOnHomepage: result.showOnHomepage ?? false,
          homepageOrder:
            result.homepageOrder != null ? String(result.homepageOrder) : "",
        });
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(getUserFacingError(reason));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, type]);

  function chooseLogo(file: File | null) {
    setLogoError(null);

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      setLogoError("Unsupported format. Use JPG, PNG, WebP, or SVG.");
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Logo must be 3 MB or smaller.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  const update = (key: string, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const result = await updatePartner(type, id, {
        name: form.name,
        logo: form.logo || undefined,
        website: form.website || undefined,
        country: form.country || undefined,
        isFeatured: form.isFeatured,
        published: form.published,
        showOnHomepage: form.showOnHomepage,
        homepageOrder: form.homepageOrder
          ? Number(form.homepageOrder)
          : undefined,
      });

      if (selectedFile) {
        const updated = await uploadPartnerLogo(id, selectedFile);
        setPartner(updated);
      } else {
        setPartner(result);
      }

      setSelectedFile(null);
      setPreviewUrl(null);
      setEditing(false);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (
      !partner ||
      !window.confirm(`Delete "${partner.name}"? This cannot be undone.`)
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deletePartner(type, id);
      router.push("/dashboard/partners");
    } catch (reason) {
      setError(getUserFacingError(reason));
      setDeleting(false);
    }
  }

  if (!partner && !error) {
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <LoadingState label="Loading partner" />
      </div>
    );
  }

  if (error && !partner) {
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <ErrorState message={error} />

        <Link
          href="/dashboard/partners"
          className="mt-5 inline-block text-sm font-bold text-[var(--rams-red)]"
        >
          ← Back to partners
        </Link>
      </div>
    );
  }

  if (!partner) {
    return null;
  }

  const currentLogoUrl = previewUrl || form.logo || partner.logo;

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-3xl space-y-7">
        <Link
          href="/dashboard/partners"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          back to partners
        </Link>

        {error && <ErrorState message={error} />}

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-3">
              <Badge tone="red">
                {type === "UNIVERSITY" ? "University" : "Industrial"}
              </Badge>

              <Badge tone={partner.published ? "green" : "neutral"}>
                {partner.published ? "Published" : "Draft"}
              </Badge>
            </div>

            <h1 className="mt-5 text-4xl font-bold">{partner.name}</h1>
          </div>

          {user?.role === "ADMIN" && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditing((value) => !value);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setLogoError(null);
                }}
              >
                {editing ? "Cancel" : "Edit"}
              </Button>

              <Button
                variant="danger"
                disabled={deleting}
                onClick={() => void remove()}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          )}
        </header>

        {editing ? (
          <Card className="space-y-5 p-6">
            <form onSubmit={save} className="space-y-5">
              <Field label="Name">
                <input
                  required
                  minLength={2}
                  className={inputClass}
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                />
              </Field>

              {/* Logo upload */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[var(--rams-charcoal)]">
                  Partner Logo
                </p>
                <p className="text-xs text-[var(--gray)]">
                  PNG, JPG, WebP, or SVG. Max 3 MB.
                </p>
                <div className="flex items-start gap-4">
                  {currentLogoUrl && (
                    <div className="relative h-20 w-32 flex-shrink-0 overflow-hidden rounded border border-[var(--border)] bg-white">
                      <Image
                        src={currentLogoUrl}
                        alt="Logo preview"
                        fill
                        unoptimized
                        className="object-contain p-1"
                      />
                    </div>
                  )}

                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(event) =>
                        chooseLogo(event.target.files?.[0] ?? null)
                      }
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {currentLogoUrl ? "Replace logo" : "Choose logo"}
                    </Button>

                    {(previewUrl || form.logo) && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="ml-2"
                        onClick={() => {
                          chooseLogo(null);
                          update("logo", "");
                        }}
                      >
                        Remove
                      </Button>
                    )}

                    {logoError && (
                      <p className="mt-2 text-xs text-red-600">{logoError}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Country">
                  <input
                    className={inputClass}
                    value={form.country}
                    onChange={(event) => update("country", event.target.value)}
                  />
                </Field>

                <Field label="Website">
                  <input
                    type="url"
                    className={inputClass}
                    value={form.website}
                    onChange={(event) => update("website", event.target.value)}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(event) =>
                      update("isFeatured", event.target.checked)
                    }
                  />
                  Featured
                </label>

                <label className="flex items-center gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(event) =>
                      update("published", event.target.checked)
                    }
                  />
                  Published
                </label>

                <label className="flex items-center gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={form.showOnHomepage}
                    onChange={(event) =>
                      update("showOnHomepage", event.target.checked)
                    }
                  />
                  Show on Homepage
                </label>
              </div>

              {form.showOnHomepage && (
                <Field label="Display Order (lower number = first)">
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    placeholder="0"
                    value={form.homepageOrder}
                    onChange={(event) =>
                      update("homepageOrder", event.target.value)
                    }
                  />
                </Field>
              )}

              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="space-y-6 p-6">
            {/* Logo display in view mode */}
            {partner.logo && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                  Logo
                </p>
                <div className="relative mt-2 h-20 w-32 overflow-hidden rounded border border-[var(--border)] bg-white">
                  <Image
                    src={partner.logo}
                    alt={`${partner.name} logo`}
                    fill
                    className="object-contain p-1"
                  />
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                Country
              </p>

              <p className="mt-2">{partner.country ?? "Not provided"}</p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                Description
              </p>

              <p className="mt-2 whitespace-pre-wrap leading-7">
                {partner.description ?? "No description provided."}
              </p>
            </div>

            {partner.website && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                  Website
                </p>

                <a
                  href={partner.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block font-semibold text-[var(--rams-red)]"
                >
                  {partner.website} ↗
                </a>
              </div>
            )}

            <p className="text-sm text-[var(--rams-gray)]">
              {partner.isFeatured ? "Featured partner" : "Standard partner"}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
