"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  Button,
  Card,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  inputClass,
} from "@/components/ui";
import {
  getAdminSiteContent,
  updateAdminSiteContent,
  uploadHomepageImage,
} from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type {
  AboutContent,
  BilingualText,
  ContactContent,
  FooterContent,
  HeadOfLaboratoryContent,
  HeroImagePosition,
  HomepageContent,
  SiteContentImage,
} from "@/types/site-content";

const defaultHeroImagePosition: HeroImagePosition = { x: 50, y: 50 };
const heroImagePresets = [
  ["Center", { x: 50, y: 50 }],
  ["Top", { x: 50, y: 0 }],
  ["Bottom", { x: 50, y: 100 }],
  ["Left", { x: 0, y: 50 }],
  ["Right", { x: 100, y: 50 }],
] as const;

const defaultRamsDescription: BilingualText = {
  en: "Reliability, availability, maintainability, and safety research for dependable systems.",
  id: "Riset keandalan, ketersediaan, kemudahan pemeliharaan, dan keselamatan untuk sistem yang andal.",
};

const defaultPuiKekalDescription: BilingualText = {
  en: "Center for sustainable energy and maritime systems research.",
  id: "Pusat riset energi berkelanjutan dan sistem maritim.",
};

const defaultHeadOfLaboratory: HeadOfLaboratoryContent = {
  eyebrow: { en: "LABORATORY HEAD", id: "KEPALA LABORATORIUM" },
  title: {
    en: "Greetings from our Head of Laboratory",
    id: "Salam dari Kepala Laboratorium",
  },
  greeting: {
    en: "Welcome to RAMS Laboratory. We connect rigorous research with practical engineering decisions for safer, more dependable systems.",
    id: "Selamat datang di Laboratorium RAMS. Kami menghubungkan riset yang ketat dengan keputusan rekayasa praktis untuk sistem yang lebih aman dan andal.",
  },
  name: "Dr. Eng. Dhimas Widhi Handani, S.T., M.Sc.",
  role: { en: "Head of RAMS Laboratory", id: "Kepala Laboratorium RAMS" },
  s1: { en: "Reliability and availability", id: "Keandalan dan ketersediaan" },
  s2: { en: "Safety and risk", id: "Keselamatan dan risiko" },
  s3: { en: "Marine systems", id: "Sistem maritim" },
  imageAlt: {
    en: "Dr. Eng. Dhimas Widhi Handani, Head of RAMS Laboratory",
    id: "Dr. Eng. Dhimas Widhi Handani, Kepala Laboratorium RAMS",
  },
};

function BilingualField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: BilingualText;
  onChange: (locale: "en" | "id", value: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Field label={`${label} — English`}>
        {multiline ? (
          <textarea
            required
            className={`${inputClass} min-h-28`}
            value={value.en}
            onChange={(event) => onChange("en", event.target.value)}
          />
        ) : (
          <input
            required
            className={inputClass}
            value={value.en}
            onChange={(event) => onChange("en", event.target.value)}
          />
        )}
      </Field>

      <Field label={`${label} — Indonesian`}>
        {multiline ? (
          <textarea
            required
            className={`${inputClass} min-h-28`}
            value={value.id}
            onChange={(event) => onChange("id", event.target.value)}
          />
        ) : (
          <input
            required
            className={inputClass}
            value={value.id}
            onChange={(event) => onChange("id", event.target.value)}
          />
        )}
      </Field>
    </div>
  );
}

function ImageField({
  value,
  onChange,
  fixedAspectRatio,
}: {
  value?: SiteContentImage;
  onChange: (value: SiteContentImage) => void;
  fixedAspectRatio?: number;
}) {
  const [selected, setSelected] = useState<File | null>(null);
  const [preview, setPreview] = useState(value?.url ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cropCanvasRef = useRef<HTMLDivElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState(() =>
    typeof window === "undefined"
      ? { width: 16, height: 9 }
      : { width: window.innerWidth, height: window.innerHeight },
  );
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPosition: HeroImagePosition;
  } | null>(null);
  const position = value?.position ?? defaultHeroImagePosition;
  const publicHeroAspectRatio =
    fixedAspectRatio ?? viewportSize.width / (viewportSize.height * 0.75);
  const imageAspectRatio =
    naturalSize.width > 0 && naturalSize.height > 0
      ? naturalSize.width / naturalSize.height
      : 16 / 9;
  const cropWidth = Math.min(
    canvasSize.width * 0.78,
    canvasSize.height * 0.78 * publicHeroAspectRatio,
  );
  const cropHeight =
    publicHeroAspectRatio > 0 ? cropWidth / publicHeroAspectRatio : 0;
  const cropLeft = (canvasSize.width - cropWidth) / 2;
  const cropTop = (canvasSize.height - cropHeight) / 2;
  const coverWidth = Math.max(cropWidth, cropHeight * imageAspectRatio);
  const coverHeight = Math.max(cropHeight, cropWidth / imageAspectRatio);
  const imageLeft = cropLeft - (position.x / 100) * (coverWidth - cropWidth);
  const imageTop = cropTop - (position.y / 100) * (coverHeight - cropHeight);

  useEffect(() => {
    const canvas = cropCanvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () =>
      setCanvasSize({ width: canvas.clientWidth, height: canvas.clientHeight });
    updateCanvasSize();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateCanvasSize);
    observer?.observe(canvas);
    const updateViewportSize = () =>
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", updateViewportSize);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateViewportSize);
    };
  }, [preview]);

  function clampPosition(next: number) {
    return Math.min(100, Math.max(0, next));
  }

  function dragStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (!value?.url || !cropCanvasRef.current || cropWidth <= 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: position,
    };
  }

  function dragMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const overflowX = coverWidth - cropWidth;
    const overflowY = coverHeight - cropHeight;

    onChange({
      ...(value as SiteContentImage),
      position: {
        x:
          overflowX > 0
            ? clampPosition(
                drag.startPosition.x -
                  ((event.clientX - drag.startX) / overflowX) * 100,
              )
            : 50,
        y:
          overflowY > 0
            ? clampPosition(
                drag.startPosition.y -
                  ((event.clientY - drag.startY) / overflowY) * 100,
              )
            : 50,
      },
    });
  }

  function dragEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  }

  function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Image must be 3 MB or smaller.");
      return;
    }
    setError(null);
    setSelected(file);
    setPreview(URL.createObjectURL(file));
  }

  async function upload() {
    if (!selected) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadHomepageImage(selected);
      onChange({ ...uploaded, position });
      setSelected(null);
      setPreview(uploaded.url);
    } catch {
      setError("Image upload failed. The existing image is still safe.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {preview ? (
        <div
          ref={cropCanvasRef}
          className="group relative h-[360px] w-full touch-none cursor-grab overflow-hidden bg-[var(--rams-gray-light)] ring-1 ring-black/10 active:cursor-grabbing sm:h-[420px]"
          onPointerDown={dragStart}
          onPointerMove={dragMove}
          onPointerUp={dragEnd}
          onPointerCancel={dragEnd}
        >
          <img
            ref={cropImageRef}
            src={preview}
            alt="Homepage hero preview"
            className="pointer-events-none absolute max-w-none select-none"
            draggable={false}
            onLoad={(event) =>
              setNaturalSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            style={{
              width: coverWidth,
              height: coverHeight,
              left: imageLeft,
              top: imageTop,
            }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 bg-black/45"
            style={{ height: cropTop }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/45"
            style={{
              height: Math.max(0, canvasSize.height - cropTop - cropHeight),
            }}
          />
          <div
            className="pointer-events-none absolute left-0 bg-black/45"
            style={{
              top: cropTop,
              width: cropLeft,
              height: cropHeight,
            }}
          />
          <div
            className="pointer-events-none absolute right-0 bg-black/45"
            style={{
              top: cropTop,
              width: Math.max(0, canvasSize.width - cropLeft - cropWidth),
              height: cropHeight,
            }}
          />
          <div
            className="pointer-events-none absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
            style={{
              left: cropLeft,
              top: cropTop,
              width: cropWidth,
              height: cropHeight,
            }}
          >
            <div className="absolute left-2 top-2 bg-black/55 px-2 py-1 text-xs font-semibold text-white">
              Homepage Hero crop
            </div>
          </div>
        </div>
      ) : (
        <div className="grid min-h-[75vh] place-items-center bg-[var(--rams-gray-light)] text-sm text-[var(--rams-gray)]">
          No custom hero image. The public homepage uses its fallback image.
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <label className="inline-flex min-h-10 cursor-pointer items-center rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold">
          Choose image
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={select}
          />
        </label>
        {selected && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void upload()}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Upload image"}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-[var(--rams-red)]">{error}</p>}
      <div className="space-y-4 border-t border-black/8 pt-4">
        <div>
          <p className="text-sm font-semibold text-[var(--rams-charcoal)]">
            Image position
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {heroImagePresets.map(([label, preset]) => (
              <button
                key={label}
                type="button"
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                  position.x === preset.x && position.y === preset.y
                    ? "border-[var(--rams-red)] bg-red-50 text-[var(--rams-red-dark)]"
                    : "border-[var(--border)] text-[var(--rams-charcoal)] hover:bg-[var(--rams-gray-light)]"
                }`}
                onClick={() =>
                  onChange({ ...(value as SiteContentImage), position: preset })
                }
                disabled={!value?.url}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["x", "y"] as const).map((axis) => (
            <label
              key={axis}
              className="text-sm font-semibold text-[var(--rams-charcoal)]"
            >
              {axis === "x" ? "Horizontal" : "Vertical"} position:{" "}
              {position[axis]}%
              <input
                type="range"
                min="0"
                max="100"
                value={position[axis]}
                disabled={!value?.url}
                className="mt-2 w-full accent-[var(--rams-red)]"
                aria-label={`${axis === "x" ? "Horizontal" : "Vertical"} image position`}
                onChange={(event) =>
                  onChange({
                    ...(value as SiteContentImage),
                    position: {
                      ...position,
                      [axis]: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
        {!value?.url && (
          <p className="text-xs text-[var(--rams-gray)]">
            Upload a hero image to adjust its position.
          </p>
        )}
      </div>
    </div>
  );
}

function EditorShell({
  title,
  description,
  lastUpdated,
  loading,
  error,
  saving,
  success,
  onSubmit,
  children,
}: {
  title: string;
  description: string;
  lastUpdated?: string | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  success: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <LoadingState label="Loading site content" />
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-5xl space-y-7">
        <PageHeader eyebrow={null} title={title} description={description} />

        {lastUpdated && (
          <p className="text-xs text-[var(--rams-gray)]">
            Last saved {new Date(lastUpdated).toLocaleString()}
          </p>
        )}

        {error && <ErrorState message={error} />}

        {success && (
          <div
            className="border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
            role="status"
          >
            Content saved successfully.
          </div>
        )}

        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-8">
            {children}

            <div className="flex gap-3 border-t border-black/8 pt-7">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save content"}
              </Button>

              <Link
                href="/dashboard/content"
                className="inline-flex min-h-10 items-center px-4 text-sm font-semibold text-[var(--rams-gray)]"
              >
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-5 border-t border-black/8 pt-7 first:border-t-0 first:pt-0">
      <h2 className="text-xl font-bold text-[var(--rams-charcoal)]">{title}</h2>

      {children}
    </section>
  );
}

function PrincipleFields({
  principles,
  onChange,
}: {
  principles: HomepageContent["principles"];
  onChange: (
    index: number,
    locale: "en" | "id",
    field: "title" | "description",
    value: string,
  ) => void;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {principles.map((principle, index) => (
        <div
          key={principle.key}
          className="space-y-4 border border-black/8 p-5"
        >
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl font-bold text-[var(--rams-red)]">
              {principle.key}
            </span>

            <span className="text-sm font-semibold text-[var(--rams-gray)]">
              Identity is fixed
            </span>
          </div>

          <BilingualField
            label="Title"
            value={principle.title}
            onChange={(locale, value) =>
              onChange(index, locale, "title", value)
            }
          />

          <BilingualField
            label="Description"
            value={principle.description}
            onChange={(locale, value) =>
              onChange(index, locale, "description", value)
            }
            multiline
          />
        </div>
      ))}
    </div>
  );
}

function HomepageEditor() {
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getAdminSiteContent("homepage")
      .then((result) => {
        if (!cancelled) {
          setContent({
            ...result.content,
            hero: {
              ...result.content.hero,
              ...(result.content.hero.heroImage
                ? {
                    heroImage: {
                      ...result.content.hero.heroImage,
                      position:
                        result.content.hero.heroImage.position ??
                        defaultHeroImagePosition,
                    },
                  }
                : {}),
            },
            ecosystem: {
              ...result.content.ecosystem,
              ramsDescription:
                result.content.ecosystem.ramsDescription ??
                defaultRamsDescription,
              puiKekalDescription:
                result.content.ecosystem.puiKekalDescription ??
                defaultPuiKekalDescription,
            },
            headOfLaboratory:
              result.content.headOfLaboratory ?? defaultHeadOfLaboratory,
          });
          setLastUpdated(result.updatedAt);
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(getUserFacingError(reason));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const text = (
    section:
      | "hero"
      | "ecosystem"
      | "research"
      | "projects"
      | "cta"
      | "headOfLaboratory",
    field: string,
    locale: "en" | "id",
    value: string,
  ) =>
    setContent((current) =>
      current
        ? ({
            ...current,
            [section]: {
              ...current[section],
              [field]: {
                ...(current[section] as Record<string, BilingualText>)[field],
                [locale]: value,
              },
            },
          } as HomepageContent)
        : current,
    );

  const headText = (
    field: Exclude<keyof HeadOfLaboratoryContent, "name" | "image">,
    locale: "en" | "id",
    value: string,
  ) =>
    setContent((current) =>
      current
        ? {
            ...current,
            headOfLaboratory: {
              ...(current.headOfLaboratory ?? defaultHeadOfLaboratory),
              [field]: {
                ...(current.headOfLaboratory ?? defaultHeadOfLaboratory)[field],
                [locale]: value,
              },
            },
          }
        : current,
    );

  const head = content?.headOfLaboratory ?? defaultHeadOfLaboratory;

  const principle = (
    index: number,
    locale: "en" | "id",
    field: "title" | "description",
    value: string,
  ) =>
    setContent((current) => {
      if (!current) {
        return current;
      }

      const principles = [
        ...current.principles,
      ] as HomepageContent["principles"];

      principles[index] = {
        ...principles[index],
        [field]: {
          ...principles[index][field],
          [locale]: value,
        },
      };

      return {
        ...current,
        principles,
      };
    });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateAdminSiteContent("homepage", content);

      setContent(result.content);
      setLastUpdated(result.updatedAt);
      setSuccess(true);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditorShell
      title="Homepage"
      description="Edit homepage copy while keeping research areas, projects, and logos sourced from their existing systems."
      lastUpdated={lastUpdated}
      loading={loading}
      error={error}
      saving={saving}
      success={success}
      onSubmit={save}
    >
      {content && (
        <>
          <Section title="Hero">
            <BilingualField
              label="Headline"
              value={content.hero.headline}
              onChange={(locale, value) =>
                text("hero", "headline", locale, value)
              }
            />

            <BilingualField
              label="Description"
              value={content.hero.description}
              onChange={(locale, value) =>
                text("hero", "description", locale, value)
              }
              multiline
            />

            <BilingualField
              label="Primary CTA"
              value={content.hero.primaryCta}
              onChange={(locale, value) =>
                text("hero", "primaryCta", locale, value)
              }
            />

            <BilingualField
              label="Secondary CTA"
              value={content.hero.secondaryCta}
              onChange={(locale, value) =>
                text("hero", "secondaryCta", locale, value)
              }
            />

            <Field label="Hero image">
              <ImageField
                value={content.hero.heroImage}
                onChange={(image) =>
                  setContent((current) =>
                    current
                      ? {
                          ...current,
                          hero: { ...current.hero, heroImage: image },
                        }
                      : current,
                  )
                }
              />
            </Field>
          </Section>

          <Section title="RAMS Principles">
            <PrincipleFields
              principles={content.principles}
              onChange={principle}
            />
          </Section>

          <Section title="Head of Laboratory">
            <div className="flex items-center gap-3">
              <input
                id="homepage-show-head"
                type="checkbox"
                className="h-4 w-4 rounded border-black/20 text-[var(--rams-red)] focus:ring-[var(--rams-red)]"
                checked={content.showHeadOfLaboratoryOnHomepage ?? false}
                onChange={(event) =>
                  setContent((current) =>
                    current
                      ? {
                          ...current,
                          showHeadOfLaboratoryOnHomepage: event.target.checked,
                        }
                      : current,
                  )
                }
              />
              <label
                htmlFor="homepage-show-head"
                className="text-sm font-medium text-[var(--rams-charcoal)]"
              >
                Show on Homepage
              </label>
            </div>

            <BilingualField
              label="Eyebrow"
              value={head.eyebrow}
              onChange={(locale, value) => headText("eyebrow", locale, value)}
            />

            <BilingualField
              label="Title"
              value={head.title}
              onChange={(locale, value) => headText("title", locale, value)}
            />

            <BilingualField
              label="Greeting"
              value={head.greeting}
              multiline
              onChange={(locale, value) => headText("greeting", locale, value)}
            />

            <Field label="Name" htmlFor="homepage-head-name">
              <input
                id="homepage-head-name"
                required
                className={inputClass}
                value={head.name}
                onChange={(event) =>
                  setContent((current) =>
                    current
                      ? {
                          ...current,
                          headOfLaboratory: {
                            ...(current.headOfLaboratory ??
                              defaultHeadOfLaboratory),
                            name: event.target.value,
                          },
                        }
                      : current,
                  )
                }
              />
            </Field>

            <BilingualField
              label="Role"
              value={head.role}
              onChange={(locale, value) => headText("role", locale, value)}
            />

            {/* <div className="space-y-5 rounded-md border border-black/8 bg-[var(--rams-gray-light)]/35 p-4">
              <p className="text-sm font-semibold text-[var(--rams-charcoal)]">
                Focus areas
              </p>
              <BilingualField
                label="S1"
                value={head.s1}
                onChange={(locale, value) => headText("s1", locale, value)}
              />
              <BilingualField
                label="S2"
                value={head.s2}
                onChange={(locale, value) => headText("s2", locale, value)}
              />
              <BilingualField
                label="S3"
                value={head.s3}
                onChange={(locale, value) => headText("s3", locale, value)}
              />
            </div> */}

            <Field label="Photo">
              <ImageField
                value={head.image}
                fixedAspectRatio={4 / 5}
                onChange={(image) =>
                  setContent((current) =>
                    current
                      ? {
                          ...current,
                          headOfLaboratory: {
                            ...(current.headOfLaboratory ??
                              defaultHeadOfLaboratory),
                            image,
                          },
                        }
                      : current,
                  )
                }
              />
            </Field>

            {/* <BilingualField
              label="Image alt text"
              value={head.imageAlt}
              onChange={(locale, value) => headText("imageAlt", locale, value)}
            /> */}
          </Section>

          <Section title="Who We Are">
            <div className="flex items-center gap-3">
              <input
                id="homepage-show-who-we-are"
                type="checkbox"
                className="h-4 w-4 rounded border-black/20 text-[var(--rams-red)] focus:ring-[var(--rams-red)]"
                checked={content.showWhoWeAreOnHomepage ?? false}
                onChange={(event) =>
                  setContent((current) =>
                    current
                      ? {
                          ...current,
                          showWhoWeAreOnHomepage: event.target.checked,
                        }
                      : current,
                  )
                }
              />
              <label
                htmlFor="homepage-show-who-we-are"
                className="text-sm font-medium text-[var(--rams-charcoal)]"
              >
                Show on Homepage
              </label>
            </div>
          </Section>

          <Section title="Ecosystem">
            <BilingualField
              label="Section title"
              value={content.ecosystem.title}
              onChange={(locale, value) =>
                text("ecosystem", "title", locale, value)
              }
            />

            <BilingualField
              label="AIS description"
              value={content.ecosystem.aisDescription}
              onChange={(locale, value) =>
                text("ecosystem", "aisDescription", locale, value)
              }
              multiline
            />

            <BilingualField
              label="RAMS description"
              value={
                content.ecosystem.ramsDescription ?? defaultRamsDescription
              }
              onChange={(locale, value) =>
                text("ecosystem", "ramsDescription", locale, value)
              }
              multiline
            />

            <BilingualField
              label="PUI-KEKAL description"
              value={
                content.ecosystem.puiKekalDescription ??
                defaultPuiKekalDescription
              }
              onChange={(locale, value) =>
                text("ecosystem", "puiKekalDescription", locale, value)
              }
              multiline
            />
          </Section>

          <Section title="Research section">
            <BilingualField
              label="Title"
              value={content.research.title}
              onChange={(locale, value) =>
                text("research", "title", locale, value)
              }
            />

            <BilingualField
              label="Description"
              value={content.research.description}
              onChange={(locale, value) =>
                text("research", "description", locale, value)
              }
              multiline
            />

            <BilingualField
              label="Link label"
              value={content.research.linkLabel}
              onChange={(locale, value) =>
                text("research", "linkLabel", locale, value)
              }
            />
          </Section>

          <Section title="Projects section">
            <BilingualField
              label="Title"
              value={content.projects.title}
              onChange={(locale, value) =>
                text("projects", "title", locale, value)
              }
            />
            <Field label="Featured project limit">
              <input
                required
                type="number"
                min="1"
                max="12"
                className={inputClass}
                value={content.projects.featuredLimit ?? 3}
                onChange={(event) =>
                  setContent((current) =>
                    current
                      ? {
                          ...current,
                          projects: {
                            ...current.projects,
                            featuredLimit: Number(event.target.value),
                          },
                        }
                      : current,
                  )
                }
              />
              <p className="mt-1 text-xs text-[var(--rams-gray)]">
                Published projects marked as featured will appear on the
                homepage.
              </p>
            </Field>
          </Section>

          <Section title="Collaboration CTA">
            <BilingualField
              label="Title"
              value={content.cta.title}
              onChange={(locale, value) => text("cta", "title", locale, value)}
              multiline
            />

            <BilingualField
              label="Description"
              value={content.cta.description}
              onChange={(locale, value) =>
                text("cta", "description", locale, value)
              }
              multiline
            />

            <BilingualField
              label="Button label"
              value={content.cta.buttonLabel}
              onChange={(locale, value) =>
                text("cta", "buttonLabel", locale, value)
              }
            />
          </Section>
        </>
      )}
    </EditorShell>
  );
}

function AboutEditor() {
  const [content, setContent] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getAdminSiteContent("about")
      .then((result) => {
        if (!cancelled) {
          setContent(result.content);
          setLastUpdated(result.updatedAt);
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(getUserFacingError(reason));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const set = (
    section:
      | "hero"
      | "researchApproach"
      | "researchFocus"
      | "marineContext"
      | "ecosystem"
      | "profile"
      | "cta",
    field: string,
    locale: "en" | "id",
    value: string,
  ) =>
    setContent((current) =>
      current
        ? ({
            ...current,
            [section]: {
              ...current[section],
              [field]: {
                ...(current[section] as Record<string, BilingualText>)[field],
                [locale]: value,
              },
            },
          } as AboutContent)
        : current,
    );

  const principle = (
    index: number,
    locale: "en" | "id",
    field: "title" | "description",
    value: string,
  ) =>
    setContent((current) => {
      if (!current) {
        return current;
      }

      const items = [
        ...current.principles.items,
      ] as AboutContent["principles"]["items"];

      items[index] = {
        ...items[index],
        [field]: {
          ...items[index][field],
          [locale]: value,
        },
      };

      return {
        ...current,
        principles: {
          ...current.principles,
          items,
        },
      };
    });

  const focus = (index: number, locale: "en" | "id", value: string) =>
    setContent((current) => {
      if (!current) {
        return current;
      }

      const items = [
        ...current.researchFocus.items,
      ] as AboutContent["researchFocus"]["items"];

      items[index] = {
        ...items[index],
        [locale]: value,
      };

      return {
        ...current,
        researchFocus: {
          ...current.researchFocus,
          items,
        },
      };
    });

  const profile = (
    index: number,
    part: "label" | "value",
    locale: "en" | "id",
    value: string,
  ) =>
    setContent((current) => {
      if (!current) {
        return current;
      }

      const items = [
        ...current.profile.items,
      ] as AboutContent["profile"]["items"];

      items[index] = {
        ...items[index],
        [part]: {
          ...items[index][part],
          [locale]: value,
        },
      };

      return {
        ...current,
        profile: {
          ...current.profile,
          items,
        },
      };
    });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateAdminSiteContent("about", content);

      setContent(result.content);
      setLastUpdated(result.updatedAt);
      setSuccess(true);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditorShell
      title="About"
      description="Edit the existing laboratory profile content without changing its layout or assets."
      lastUpdated={lastUpdated}
      loading={loading}
      error={error}
      saving={saving}
      success={success}
      onSubmit={save}
    >
      {content && (
        <>
          <Section title="Hero">
            <BilingualField
              label="Eyebrow"
              value={content.hero.eyebrow}
              onChange={(locale, value) =>
                set("hero", "eyebrow", locale, value)
              }
            />

            <BilingualField
              label="Title"
              value={content.hero.title}
              onChange={(locale, value) => set("hero", "title", locale, value)}
            />

            <BilingualField
              label="Description"
              value={content.hero.description}
              onChange={(locale, value) =>
                set("hero", "description", locale, value)
              }
              multiline
            />
          </Section>

          <Section title="What RAMS means">
            <BilingualField
              label="Heading"
              value={content.principles.heading}
              onChange={(locale, value) =>
                setContent((current) =>
                  current
                    ? {
                        ...current,
                        principles: {
                          ...current.principles,
                          heading: {
                            ...current.principles.heading,
                            [locale]: value,
                          },
                        },
                      }
                    : current,
                )
              }
            />

            <PrincipleFields
              principles={content.principles.items}
              onChange={principle}
            />
          </Section>

          <Section title="Research approach">
            <BilingualField
              label="Eyebrow"
              value={content.researchApproach.eyebrow}
              onChange={(locale, value) =>
                set("researchApproach", "eyebrow", locale, value)
              }
            />

            <BilingualField
              label="Title"
              value={content.researchApproach.title}
              onChange={(locale, value) =>
                set("researchApproach", "title", locale, value)
              }
            />

            <BilingualField
              label="Description"
              value={content.researchApproach.description}
              onChange={(locale, value) =>
                set("researchApproach", "description", locale, value)
              }
              multiline
            />
          </Section>

          <Section title="Research focus">
            <BilingualField
              label="Title"
              value={content.researchFocus.title}
              onChange={(locale, value) =>
                set("researchFocus", "title", locale, value)
              }
            />

            <BilingualField
              label="Description"
              value={content.researchFocus.description}
              onChange={(locale, value) =>
                set("researchFocus", "description", locale, value)
              }
              multiline
            />

            {content.researchFocus.items.map((item, index) => (
              <BilingualField
                key={index}
                label={`Focus item ${index + 1}`}
                value={item}
                onChange={(locale, value) => focus(index, locale, value)}
              />
            ))}
          </Section>

          <Section title="Marine context">
            <BilingualField
              label="Title"
              value={content.marineContext.title}
              onChange={(locale, value) =>
                set("marineContext", "title", locale, value)
              }
            />

            <BilingualField
              label="Description"
              value={content.marineContext.description}
              onChange={(locale, value) =>
                set("marineContext", "description", locale, value)
              }
              multiline
            />
          </Section>

          <Section title="Ecosystem">
            <BilingualField
              label="Title"
              value={content.ecosystem.title}
              onChange={(locale, value) =>
                set("ecosystem", "title", locale, value)
              }
            />
          </Section>

          <Section title="Laboratory profile">
            <BilingualField
              label="Section title"
              value={content.profile.title}
              onChange={(locale, value) =>
                set("profile", "title", locale, value)
              }
            />

            {content.profile.items.map((item, index) => (
              <div
                key={index}
                className="grid gap-5 border-t border-black/8 pt-5 md:grid-cols-2"
              >
                <BilingualField
                  label={`Item ${index + 1} label`}
                  value={item.label}
                  onChange={(locale, value) =>
                    profile(index, "label", locale, value)
                  }
                />

                <BilingualField
                  label={`Item ${index + 1} value`}
                  value={item.value}
                  onChange={(locale, value) =>
                    profile(index, "value", locale, value)
                  }
                />
              </div>
            ))}
          </Section>

          <Section title="Closing CTA">
            <BilingualField
              label="Title"
              value={content.cta.title}
              onChange={(locale, value) => set("cta", "title", locale, value)}
              multiline
            />

            <BilingualField
              label="Description"
              value={content.cta.description}
              onChange={(locale, value) =>
                set("cta", "description", locale, value)
              }
              multiline
            />

            <BilingualField
              label="Button label"
              value={content.cta.buttonLabel}
              onChange={(locale, value) =>
                set("cta", "buttonLabel", locale, value)
              }
            />
          </Section>
        </>
      )}
    </EditorShell>
  );
}

function ContactEditor() {
  const [content, setContent] = useState<ContactContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getAdminSiteContent("contact")
      .then((result) => {
        if (!cancelled) {
          setContent(result.content);
          setLastUpdated(result.updatedAt);
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(getUserFacingError(reason));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const set = (
    section: "hero" | "homePreview" | "details" | "collaboration",
    field: string,
    locale: "en" | "id",
    value: string,
  ) =>
    setContent((current) =>
      current
        ? ({
            ...current,
            [section]: {
              ...current[section],
              [field]: {
                ...(current[section] as Record<string, BilingualText>)[field],
                [locale]: value,
              },
            },
          } as ContactContent)
        : current,
    );

  const address = (index: number, locale: "en" | "id", value: string) =>
    setContent((current) => {
      if (!current) {
        return current;
      }

      const lines = [
        ...current.details.addressLines,
      ] as ContactContent["details"]["addressLines"];

      lines[index] = {
        ...lines[index],
        [locale]: value,
      };

      return {
        ...current,
        details: {
          ...current.details,
          addressLines: lines,
        },
      };
    });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateAdminSiteContent("contact", content);

      setContent(result.content);
      setLastUpdated(result.updatedAt);
      setSuccess(true);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditorShell
      title="Contact"
      description="Edit contact information and collaboration copy used on the Contact page and homepage preview."
      lastUpdated={lastUpdated}
      loading={loading}
      error={error}
      saving={saving}
      success={success}
      onSubmit={save}
    >
      {content && (
        <>
          <Section title="Contact hero">
            <BilingualField
              label="Eyebrow"
              value={content.hero.eyebrow}
              onChange={(locale, value) =>
                set("hero", "eyebrow", locale, value)
              }
            />

            <BilingualField
              label="Title"
              value={content.hero.title}
              onChange={(locale, value) => set("hero", "title", locale, value)}
            />

            <BilingualField
              label="Description"
              value={content.hero.description}
              onChange={(locale, value) =>
                set("hero", "description", locale, value)
              }
              multiline
            />
          </Section>

          <Section title="Homepage contact preview">
            <BilingualField
              label="Eyebrow"
              value={content.homePreview.eyebrow}
              onChange={(locale, value) =>
                set("homePreview", "eyebrow", locale, value)
              }
            />

            <BilingualField
              label="Title"
              value={content.homePreview.title}
              onChange={(locale, value) =>
                set("homePreview", "title", locale, value)
              }
            />

            <BilingualField
              label="Description"
              value={content.homePreview.description}
              onChange={(locale, value) =>
                set("homePreview", "description", locale, value)
              }
              multiline
            />
          </Section>

          <Section title="Contact details">
            <BilingualField
              label="Panel title"
              value={content.details.title}
              onChange={(locale, value) =>
                set("details", "title", locale, value)
              }
            />

            <BilingualField
              label="Email"
              value={content.details.email}
              onChange={(locale, value) =>
                set("details", "email", locale, value)
              }
            />

            {content.details.addressLines.map((line, index) => (
              <BilingualField
                key={index}
                label={`Address line ${index + 1}`}
                value={line}
                onChange={(locale, value) => address(index, locale, value)}
              />
            ))}

            <BilingualField
              label="Social text"
              value={content.details.socialText}
              onChange={(locale, value) =>
                set("details", "socialText", locale, value)
              }
            />
          </Section>

          <Section title="Collaboration">
            <BilingualField
              label="Title"
              value={content.collaboration.title}
              onChange={(locale, value) =>
                set("collaboration", "title", locale, value)
              }
            />

            <BilingualField
              label="Description"
              value={content.collaboration.description}
              onChange={(locale, value) =>
                set("collaboration", "description", locale, value)
              }
              multiline
            />

            <BilingualField
              label="Button label"
              value={content.collaboration.buttonLabel}
              onChange={(locale, value) =>
                set("collaboration", "buttonLabel", locale, value)
              }
            />
          </Section>
        </>
      )}
    </EditorShell>
  );
}

function FooterEditor() {
  const [content, setContent] = useState<FooterContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getAdminSiteContent("footer")
      .then((result) => {
        if (!cancelled) {
          setContent(result.content);
          setLastUpdated(result.updatedAt);
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(getUserFacingError(reason));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const set = (
    field: "description" | "email" | "socialText" | "copyright" | "institution",
    locale: "en" | "id",
    value: string,
  ) =>
    setContent((current) =>
      current
        ? {
            ...current,
            [field]: {
              ...current[field],
              [locale]: value,
            },
          }
        : current,
    );

  const address = (index: number, locale: "en" | "id", value: string) =>
    setContent((current) => {
      if (!current) {
        return current;
      }

      const lines = [...current.addressLines] as FooterContent["addressLines"];

      lines[index] = {
        ...lines[index],
        [locale]: value,
      };

      return {
        ...current,
        addressLines: lines,
      };
    });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateAdminSiteContent("footer", content);

      setContent(result.content);
      setLastUpdated(result.updatedAt);
      setSuccess(true);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditorShell
      title="Footer"
      description="Edit footer copy and institutional contact text. Navigation and ecosystem logos remain frontend-controlled."
      lastUpdated={lastUpdated}
      loading={loading}
      error={error}
      saving={saving}
      success={success}
      onSubmit={save}
    >
      {content && (
        <>
          <Section title="Footer copy">
            <BilingualField
              label="Description"
              value={content.description}
              onChange={(locale, value) => set("description", locale, value)}
              multiline
            />

            <BilingualField
              label="Email"
              value={content.email}
              onChange={(locale, value) => set("email", locale, value)}
            />

            <BilingualField
              label="Social text"
              value={content.socialText}
              onChange={(locale, value) => set("socialText", locale, value)}
            />
          </Section>

          <Section title="Address">
            {content.addressLines.map((line, index) => (
              <BilingualField
                key={index}
                label={`Address line ${index + 1}`}
                value={line}
                onChange={(locale, value) => address(index, locale, value)}
              />
            ))}
          </Section>

          <Section title="Institutional text">
            <BilingualField
              label="Copyright"
              value={content.copyright}
              onChange={(locale, value) => set("copyright", locale, value)}
            />

            <BilingualField
              label="Institution"
              value={content.institution}
              onChange={(locale, value) => set("institution", locale, value)}
            />
          </Section>
        </>
      )}
    </EditorShell>
  );
}

export default function SiteContentEditor({ keyName }: { keyName: string }) {
  if (keyName === "homepage") {
    return <HomepageEditor />;
  }

  if (keyName === "about") {
    return <AboutEditor />;
  }

  if (keyName === "contact") {
    return <ContactEditor />;
  }

  if (keyName === "footer") {
    return <FooterEditor />;
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <ErrorState message="Invalid site content page." />
    </div>
  );
}
