import { getDatabase } from "../config/database.js";
import {
  getPublicationsCollection,
  normalizePublicationTitle,
} from "../modules/publications/publication.repository.js";
import { getResearchHighlightsCollection } from "../modules/research-highlights/research-highlight.repository.js";

const text = (en: string, id: string) => ({ en, id });

export const developmentResearchHighlights = [
  {
    question: text(
      "What happens when a ship collision turns into an oil spill disaster?",
      "Apa yang terjadi ketika tubrukan kapal berubah menjadi bencana tumpahan minyak?",
    ),
    publication:
      "Risk Assessment of Ship Collision on FSO Abherka and Oil Spill Modelling Due to Structural Damage",
  },
  {
    question: text(
      "How much hidden risk lies beneath an oil pipeline?",
      "Seberapa besar risiko tersembunyi di balik jaringan pipa minyak?",
    ),
    publication:
      "Risk Assessment of Balikpapan-Samarinda Oil Distribution Pipeline Using Kent Muhlbauer Method",
  },
  {
    question: text(
      "How can we deliver LNG to more places using fewer resources?",
      "Bagaimana LNG dapat didistribusikan ke lebih banyak tempat dengan sumber daya yang lebih sedikit?",
    ),
    publication:
      "LNG Distribution Optimization using Set Partitioning Problem Method",
  },
  {
    question: text(
      "Is going green at sea really worth the cost?",
      "Apakah menjadi lebih hijau di laut benar-benar sepadan dengan biayanya?",
    ),
    publication:
      "Economic feasibility study due to implementation of dual fuel engine of mini-LNG carrier in LNG distribution to power plants in Bali and Lombok",
  },
  {
    question: text(
      "Can an old ship become green without breaking the bank?",
      "Bisakah kapal lama menjadi lebih hijau tanpa menghabiskan terlalu banyak biaya?",
    ),
    publication:
      "Technical and Economical Feasibility Impact on Landing Craft Ship Conversion to Comply with Greenship Requirements",
  },
] as const;

export async function seedDevelopmentResearchHighlights() {
  const publications = getPublicationsCollection();
  const highlights = getResearchHighlightsCollection();
  const now = new Date();

  for (const [order, item] of developmentResearchHighlights.entries()) {
    const publication = await publications.findOne({
      normalizedTitle: normalizePublicationTitle(item.publication),
    });
    if (!publication?._id) continue;

    await highlights.updateOne(
      { publicationId: publication._id },
      {
        $setOnInsert: {
          headline: item.question,
          publicationId: publication._id,
          order,
          published: true,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }
}

export async function printResearchHighlightSeedStatus() {
  const count = await getDatabase()
    .collection("research_highlights")
    .countDocuments();
  console.log(`Research highlights available after seed: ${count}`);
}
