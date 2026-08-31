"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  Button,
  Card,
  ErrorState,
  Field,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { createPartner } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { PartnerType } from "@/types/modules";

export default function CreatePartner() {
  const router = useRouter();

  const [type, setType] = useState<PartnerType>("UNIVERSITY");

  const [form, setForm] = useState({
    name: "",
    website: "",
    country: "",
    description: "",
    logo: "",
    isFeatured: false,
    published: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
        description: form.description || undefined,
      });

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
            <Field label="Type">
              <select
                className={inputClass}
                value={type}
                onChange={(event) => setType(event.target.value as PartnerType)}
              >
                <option value="UNIVERSITY">University</option>
                <option value="INDUSTRIAL">Industrial</option>
              </select>
            </Field>

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

            <div className="grid gap-5 sm:grid-cols-2">
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
            </div>

            <Field label="Description">
              <textarea
                className={`${inputClass} min-h-28`}
                value={form.description}
                onChange={(event) =>
                  setForm({
                    ...form,
                    description: event.target.value,
                  })
                }
              />
            </Field>

            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(event) =>
                  setForm({
                    ...form,
                    isFeatured: event.target.checked,
                  })
                }
              />
              Feature this partner
            </label>

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
              Publish this partner
            </label>

            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Create partner"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
