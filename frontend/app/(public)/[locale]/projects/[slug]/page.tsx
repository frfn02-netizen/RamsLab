import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PublicProjectDetail from "@/components/public/project-detail";
import type { Locale } from "@/i18n/routing";
import { getPublicProject } from "@/lib/api/modules";
import { localizedMetadata } from "@/lib/i18n/metadata";

type Props = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;

  const fallback = await getTranslations({
    locale,
    namespace: "projects",
  });

  try {
    const project = await getPublicProject(slug);

    return localizedMetadata({
      locale: locale as Locale,
      title: project.title,
      description: project.description.slice(0, 160),
      path: `/projects/${project.slug}`,
    });
  } catch {
    return localizedMetadata({
      locale: locale as Locale,
      title: fallback("notFound"),
      description: fallback("error"),
      path: `/projects/${slug}`,
    });
  }
}

export default async function PublicProjectDetailPage({ params }: Props) {
  const { slug } = await params;

  let initialProject = null;

  try {
    initialProject = await getPublicProject(slug);
  } catch {
    // The client component renders a safe error state.
  }

  return <PublicProjectDetail slug={slug} initialProject={initialProject} />;
}
