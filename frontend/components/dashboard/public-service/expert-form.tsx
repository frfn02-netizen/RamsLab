"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/components/providers/toast-providers";
import {
  Button,
  Card,
  ErrorState,
  Field,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { FormSkeleton } from "@/components/skeletons";
import {
  createPublicServiceExpert,
  getPublicPeopleList,
  getPublicServiceExpert,
  updatePublicServiceExpert,
} from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import CustomSelect from "@/components/ui/custom-select";
import type { PeopleRefKind, PublicServiceExpertInput } from "@/types/modules";
import type { PublicPerson } from "@/types/people";

type FormState = {
  peopleKey: string;
  expertiseEn: string;
  expertiseId: string;
  order: string;
  published: boolean;
};

const emptyForm: FormState = {
  peopleKey: "",
  expertiseEn: "",
  expertiseId: "",
  order: "0",
  published: false,
};

const peopleSelectId = "public-service-expert-people-profile";

function toInput(form: FormState): PublicServiceExpertInput {
  const [kind, id] = form.peopleKey.split(":") as [PeopleRefKind, string];
  return {
    peopleRef: { kind, id },
    expertise:
      form.expertiseEn.trim() || form.expertiseId.trim()
        ? { en: form.expertiseEn.trim(), id: form.expertiseId.trim() }
        : undefined,
    order: Number(form.order),
    published: form.published,
  };
}

export default function ExpertForm({ id }: { id?: string }) {
  const router = useRouter();
  const { error: notifyError } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [people, setPeople] = useState<PublicPerson[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPublicPeopleList()
      .then((result) =>
        setPeople([
          ...result.DOSEN,
          ...result.MAHASISWA,
          ...result.MASTER,
          ...result.UNDERGRADUATE,
          ...result.INTERNSHIP,
          ...result.ALUMNI,
        ]),
      )
      .catch(() => undefined)
      .finally(() => setPeopleLoading(false));
  }, []);

  useEffect(() => {
    if (!id) return;
    getPublicServiceExpert(id)
      .then((expert) =>
        setForm({
          peopleKey: expert.peopleRef
            ? `${expert.peopleRef.kind}:${expert.peopleRef.id}`
            : "",
          expertiseEn: expert.expertise?.en ?? "",
          expertiseId: expert.expertise?.id ?? "",
          order: String(expert.order),
          published: expert.published,
        }),
      )
      .catch((reason) => setError(getUserFacingError(reason)))
      .finally(() => setLoading(false));
  }, [id]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.peopleKey) {
      notifyError("Select a People profile.");
      return;
    }
    setSaving(true);
    try {
      const saved = id
        ? await updatePublicServiceExpert(id, toInput(form))
        : await createPublicServiceExpert(toInput(form));
      router.push(`/dashboard/public-service/experts/${saved._id}`);
    } catch (reason) {
      notifyError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <FormSkeleton fields={6} actionCount={2} />;
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-4xl space-y-7">
        <Link
          href="/dashboard/public-service"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← Public Service
        </Link>
        <PageHeader
          eyebrow="Public Service"
          title={id ? "Edit expert" : "Add expert"}
          description="Link an expert to an existing public People profile when available."
        />
        {error && <ErrorState message={error} />}
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-7">
            <Field label="Existing People profile" htmlFor={peopleSelectId}>
              <CustomSelect
                id={peopleSelectId}
                value={form.peopleKey}
                onChange={(next) => update("peopleKey", next)}
                placeholder="Select a People profile"
                required
                loading={peopleLoading}
                searchPlaceholder="Search people…"
                emptyMessage="No People profiles found."
                options={people.map((person) => ({
                  value: `${kindForPerson(person)}:${person.id}`,
                  label: `${person.fullName} (${person.category})`,
                }))}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Display Order">
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={inputClass}
                  value={form.order}
                  onChange={(event) => update("order", event.target.value)}
                />
                <p className="mt-1 text-xs text-[var(--rams-gray)]">
                  Lower numbers appear first.
                </p>
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Expertise (English)">
                <textarea
                  className={inputClass}
                  rows={4}
                  value={form.expertiseEn}
                  onChange={(event) =>
                    update("expertiseEn", event.target.value)
                  }
                />
              </Field>
              <Field label="Expertise (Indonesian)">
                <textarea
                  className={inputClass}
                  rows={4}
                  value={form.expertiseId}
                  onChange={(event) =>
                    update("expertiseId", event.target.value)
                  }
                />
              </Field>
            </div>
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(event) => update("published", event.target.checked)}
              />
              Published
            </label>
            <div className="flex justify-end gap-3 border-t border-black/8 pt-5">
              <Link
                href="/dashboard/public-service"
                className="px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </Link>
              <Button disabled={saving}>
                {saving ? "Saving..." : "Save expert"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function kindForPerson(person: PublicPerson): PeopleRefKind {
  if (person.category === "ALUMNI") return "ALUMNI";
  if (person.category === "DOSEN") return "DOSEN";
  return "STUDENT";
}
