"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import {
  Button,
  Card,
  ErrorState,
  Field,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { createPartner, uploadPartnerLogo } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { PartnerType } from "@/types/modules";

const MAX_LOGO_BYTES = 3 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

export default function CreatePartner() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<PartnerType>("UNIVERSITY");

  const [form, setForm] = useState({
    name: "",
    website: "",
    country: "",
    logo: "",
    isFeatured: false,
    published: false,
    showOnHomepage: false,
    homepageOrder: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const partner = await createPartner(type, {
        ...form,
        website: form.website || undefined,
        logo: form.logo || undefined,
        country: form.country || undefined,
        homepageOrder: form.homepageOrder
          ? Number(form.homepageOrder)
          : undefined,
      });

      if (selectedFile) {
        await uploadPartnerLogo(partner._id, selectedFile);
      }

      router.push(`/dashboard/partners/${partner._id}?type=${type}`);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-3xl space-y-7">
        <Link
          href="/dashboard/partners"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← Partners
        </Link>

        <PageHeader
          eyebrow="Collaboration"
          title="Add partner"
          description="Create a university or industrial partner record."
        />

        {error && <ErrorState message={error} />}

        <Card className="p-6">
          <form onSubmit={submit} className="space-y-5">
            <Field label="Name">
              <input
                required
                minLength={2}
                className={inputClass}
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name: event.target.value,
                  })
                }
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
                {previewUrl && (
                  <div className="relative h-20 w-32 flex-shrink-0 overflow-hidden rounded border border-[var(--border)] bg-white">
                    <Image
                      src={previewUrl}
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
                    {previewUrl ? "Replace logo" : "Choose logo"}
                  </Button>

                  {previewUrl && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="ml-2"
                      onClick={() => chooseLogo(null)}
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
              <Field label="Website">
                <input
                  type="url"
                  className={inputClass}
                  placeholder="https://example.org"
                  value={form.website}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      website: event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Type">
                <select
                  className={inputClass}
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as PartnerType)
                  }
                >
                  <option value="UNIVERSITY">University</option>
                  <option value="INDUSTRIAL">Industrial</option>
                </select>
              </Field>
            </div>

            <Field label="Country">
              <input
                className={inputClass}
                value={form.country}
                onChange={(event) =>
                  setForm({
                    ...form,
                    country: event.target.value,
                  })
                }
              />
            </Field>

            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      published: event.target.checked,
                    })
                  }
                />
                Published
              </label>

              <label className="flex items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.showOnHomepage}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      showOnHomepage: event.target.checked,
                    })
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
                    setForm({
                      ...form,
                      homepageOrder: event.target.value,
                    })
                  }
                />
              </Field>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Create partner"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
