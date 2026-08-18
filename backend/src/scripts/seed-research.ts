import "dotenv/config";
import { connectDatabase } from "../config/database.js";
import { getResearchAreasCollection } from "../modules/research/research.repository.js";
import { createResearchAreaIndexes } from "../modules/research/research.index.js";
import type { CreateResearchAreaInput } from "../modules/research/research.schema.js";

const researchAreas: CreateResearchAreaInput[] = [
  {
    code: "RISK",
    slug: "risk-assessment-safety",
    title: { en: "Risk Assessment & Safety", id: "Asesmen Risiko & Keselamatan" },
    description: {
      en: "Structured analysis of hazards, consequences, and safeguards for marine and industrial systems.",
      id: "Analisis terstruktur atas bahaya, konsekuensi, dan pengaman untuk sistem kelautan dan industri.",
    },
    methods: {
      en: ["Hazard identification and risk assessment", "Safety analysis and consequence mapping", "Operational safeguards and decision support"],
      id: ["Identifikasi bahaya dan asesmen risiko", "Analisis keselamatan dan pemetaan konsekuensi", "Pengaman operasional dan dukungan keputusan"],
    },
    applications: { en: "HAZID · HAZOP · SAFETY CASES", id: "HAZID · HAZOP · SAFETY CASES" },
    order: 1,
    published: true,
  },
  {
    code: "AIS",
    slug: "automatic-identification-system",
    title: { en: "Automatic Identification System", id: "Automatic Identification System" },
    description: {
      en: "Maritime traffic intelligence using AIS data to understand movement, patterns, and operational exposure.",
      id: "Intelijen lalu lintas maritim menggunakan data AIS untuk memahami pergerakan, pola, dan paparan operasional.",
    },
    methods: {
      en: ["AIS data preparation and spatial analysis", "Maritime traffic patterns and monitoring", "Operational exposure and route insight"],
      id: ["Penyiapan dan analisis spasial data AIS", "Pola lalu lintas dan pemantauan maritim", "Paparan operasional dan wawasan rute"],
    },
    applications: { en: "TRAFFIC · MONITORING · MARITIME DATA", id: "LALU LINTAS · PEMANTAUAN · DATA MARITIM" },
    order: 2,
    published: true,
  },
  {
    code: "RAM",
    slug: "marine-system-reliability-availability",
    title: { en: "Marine System Reliability & Availability", id: "Keandalan & Ketersediaan Sistem Maritim" },
    description: {
      en: "Reliability and availability models that make complex marine assets easier to operate, maintain, and improve.",
      id: "Model keandalan dan ketersediaan yang membantu aset maritim kompleks dioperasikan, dipelihara, dan ditingkatkan.",
    },
    methods: {
      en: ["FMEA, FTA, and reliability block modeling", "Availability and management analysis", "Lifecycle performance evaluation"],
      id: ["Pemodelan FMEA, FTA, dan blok keandalan", "Analisis ketersediaan dan kemudahan pemeliharaan", "Evaluasi kinerja siklus hidup"],
    },
    applications: { en: "FMEA · FTA · RELIABILITY BLOCKS", id: "FMEA · FTA · BLOK KEANDALAN" },
    order: 3,
    published: true,
  },
  {
    code: "RCM",
    slug: "maintenance-management",
    title: { en: "Maintenance Management", id: "Manajemen Pemeliharaan" },
    description: {
      en: "Maintenance strategies grounded in failure behavior, criticality, and the realities of industrial operations.",
      id: "Strategi pemeliharaan yang berlandaskan perilaku kegagalan, kekritisan, dan realitas operasi industri.",
    },
    methods: {
      en: ["Failure-mode and criticality analysis", "Preventive and condition-based strategies", "Maintenance planning and optimization"],
      id: ["Analisis moda kegagalan dan kekritisan", "Strategi preventif dan berbasis kondisi", "Perencanaan dan optimasi pemeliharaan"],
    },
    applications: { en: "RCM · FMEA · ASSET STRATEGY", id: "RCM · FMEA · STRATEGI ASET" },
    order: 4,
    published: true,
  },
  {
    code: "DESIGN",
    slug: "optimum-design-industrial-facility",
    title: { en: "Optimum Design of Industrial Facility", id: "Desain Optimum Fasilitas Industri" },
    description: {
      en: "Engineering studies that connect facility layout, performance, risk, and lifecycle considerations.",
      id: "Kajian rekayasa yang menghubungkan tata letak fasilitas, kinerja, risiko, dan pertimbangan siklus hidup.",
    },
    methods: {
      en: ["Facility layout and system configuration", "Lifecycle and performance trade-offs", "Industrial design decision support"],
      id: ["Tata letak fasilitas dan konfigurasi sistem", "Trade-off siklus hidup dan kinerja", "Dukungan keputusan desain industri"],
    },
    applications: { en: "LAYOUT · LIFECYCLE · OPTIMIZATION", id: "TATA LETAK · SIKLUS HIDUP · OPTIMASI" },
    order: 5,
    published: true,
  },
  {
    code: "SIM",
    slug: "simulation-modeling",
    title: { en: "Simulation & Modeling", id: "Simulasi & Pemodelan" },
    description: {
      en: "Models and simulations for testing system behavior, capacity, and decision alternatives before implementation.",
      id: "Model dan simulasi untuk menguji perilaku sistem, kapasitas, dan alternatif keputusan sebelum diterapkan.",
    },
    methods: {
      en: ["System behavior and capacity models", "Scenario comparison and sensitivity analysis", "Simulation-informed operations planning"],
      id: ["Model perilaku dan kapasitas sistem", "Perbandingan skenario dan analisis sensitivitas", "Perencanaan operasi berbasis simulasi"],
    },
    applications: { en: "DISCRETE EVENT · SYSTEMS · SCENARIOS", id: "PERISTIWA DISKRIT · SISTEM · SKENARIO" },
    order: 6,
    published: true,
  },
];

async function seedResearch() {
  await connectDatabase();
  await createResearchAreaIndexes();
  const collection = getResearchAreasCollection();
  const now = new Date();

  for (const area of researchAreas) {
    const existing = await collection.findOne({ $or: [{ code: area.code }, { slug: area.slug }] });
    if (existing) {
      await collection.updateOne({ _id: existing._id }, { $set: { ...area, updatedAt: now } });
      console.log(`Updated research area ${area.code}`);
    } else {
      await collection.insertOne({ ...area, createdAt: now, updatedAt: now });
      console.log(`Created research area ${area.code}`);
    }
  }
  console.log("✅ Research areas seeded idempotently");
}

seedResearch().catch((error: unknown) => {
  console.error("❌ Failed to seed research areas:", error);
  process.exitCode = 1;
});
