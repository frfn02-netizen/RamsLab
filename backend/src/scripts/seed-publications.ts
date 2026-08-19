import "dotenv/config";
import { connectDatabase } from "../config/database.js";
import { createPublicationIndexes } from "../modules/publications/publication.index.js";
import { getPublicationsCollection, normalizeDoi, normalizePublicationTitle } from "../modules/publications/publication.repository.js";

const demoPublications = [
  { title: "Demo: Reliability mapping for coastal vessel systems", authors: ["RAMS Demo Author", "AIS Demo Researcher"], year: 2026, journal: "RAMS Demonstration Journal", doi: "10.0000/rams.demo.2026.001", pdfUrl: "https://example.com/rams-demo-2026-001.pdf", topics: ["Marine Systems", "Reliability"], methods: ["Numerical Simulation", "Optimization"] },
  { title: "Demo: Hydrodynamic response under irregular sea states", authors: ["RAMS Demo Author", "Marine Systems Demo Group", "Simulation Demo Contributor"], year: 2026, journal: "Journal of RAMS Demonstration Studies", doi: null, pdfUrl: "https://example.com/rams-demo-2026-002.pdf", topics: ["Hydrodynamics", "Marine Structures"], methods: ["CFD", "Experimental"] },
  { title: "Demo: Maintenance prioritization for offshore assets", authors: ["Reliability Demo Group", "RAMS Demo Author"], year: 2026, journal: "Applied Reliability Demo Review", doi: "10.0000/rams.demo.2026.003", pdfUrl: null, topics: ["Maintenance", "Offshore Systems"], methods: ["Machine Learning", "Optimization"] },
  { title: "Demo: A structured risk model for maritime traffic", authors: ["AIS Demo Researcher", "Safety Demo Analyst"], year: 2025, journal: "Maritime Safety Demonstration Quarterly", doi: null, pdfUrl: "https://example.com/rams-demo-2025-001.pdf", topics: ["Maritime Traffic", "Safety"], methods: ["Risk Analysis"] },
  { title: "Demo: Numerical study of propeller wake interaction", authors: ["Marine Systems Demo Group", "RAMS Demo Author"], year: 2025, journal: "Ocean Engineering Demo Notes", doi: "10.0000/rams.demo.2025.002", pdfUrl: null, topics: ["Hydrodynamics", "Ship Design"], methods: ["CFD", "Numerical Simulation"] },
  { title: "Demo: Decision support for condition-based maintenance", authors: ["Maintenance Demo Team", "Reliability Demo Group", "RAMS Demo Author"], year: 2025, journal: "Engineering Decision Demo Journal", doi: null, pdfUrl: "https://example.com/rams-demo-2025-003.pdf", topics: ["Maintenance", "Reliability"], methods: ["Machine Learning", "Optimization"] },
  { title: "Demo: Availability assessment of integrated marine systems", authors: ["RAMS Demo Author", "Systems Engineering Demo Group"], year: 2024, journal: "Systems Reliability Demonstration Journal", doi: "10.0000/rams.demo.2024.001", pdfUrl: null, topics: ["Marine Systems", "Reliability"], methods: ["Reliability Analysis"] },
  { title: "Demo: Experimental observations of a scaled hull model", authors: ["Experimental Demo Group", "Marine Structures Demo Researcher"], year: 2024, journal: "Marine Structures Demo Reports", doi: null, pdfUrl: "https://example.com/rams-demo-2024-002.pdf", topics: ["Marine Structures", "Ship Design"], methods: ["Experimental"] },
  { title: "Demo: Multi-criteria optimization for safer vessel operations", authors: ["Safety Demo Analyst", "Optimization Demo Team"], year: 2024, journal: "Maritime Operations Demonstration Review", doi: "10.0000/rams.demo.2024.003", pdfUrl: null, topics: ["Safety", "Maritime Traffic"], methods: ["Optimization", "Risk Analysis"] },
  { title: "Demo: Failure mode screening for marine equipment", authors: ["Reliability Demo Group"], year: 2023, journal: "RAMS Demonstration Journal", doi: null, pdfUrl: "https://example.com/rams-demo-2023-001.pdf", topics: ["Reliability", "Maintenance"], methods: ["Risk Analysis"] },
  { title: "Demo: Computational analysis of wave-induced loads", authors: ["Marine Systems Demo Group", "Simulation Demo Contributor"], year: 2023, journal: "Computational Marine Demo Engineering", doi: "10.0000/rams.demo.2023.002", pdfUrl: null, topics: ["Hydrodynamics", "Marine Structures"], methods: ["CFD", "Numerical Simulation"] },
  { title: "Demo: Human-centered dashboards for maritime decisions", authors: ["AIS Demo Researcher", "Decision Support Demo Group"], year: 2023, journal: "Marine Informatics Demonstration Notes", doi: null, pdfUrl: "https://example.com/rams-demo-2023-003.pdf", topics: ["Maritime Traffic", "Safety"], methods: ["Machine Learning"] },
  { title: "Demo: Risk-informed inspection planning for offshore structures", authors: ["Offshore Demo Team", "Safety Demo Analyst", "RAMS Demo Author"], year: 2022, journal: "Offshore Reliability Demo Review", doi: "10.0000/rams.demo.2022.001", pdfUrl: null, topics: ["Offshore Systems", "Safety"], methods: ["Risk Analysis", "Optimization"] },
  { title: "Demo: A baseline model for vessel system simulation", authors: ["Simulation Demo Contributor", "RAMS Demo Author"], year: 2022, journal: "Simulation Methods Demonstration Journal", doi: null, pdfUrl: "https://example.com/rams-demo-2022-002.pdf", topics: ["Marine Systems", "Ship Design"], methods: ["Numerical Simulation"] },
  { title: "Demo: Reliability indicators for complex engineering assets", authors: ["Reliability Demo Group", "Systems Engineering Demo Group"], year: 2022, journal: "Engineering Reliability Demo Reports", doi: null, pdfUrl: null, topics: ["Reliability", "Maintenance"], methods: ["Reliability Analysis"] },
];

const demoPublicationTypes = ["Article", "Review", "Conference Paper", "Book Chapter", "Proceedings", "Editorial", "Other"];

async function seedPublications() {
  await connectDatabase();
  await createPublicationIndexes();
  const collection = getPublicationsCollection();
  const now = new Date();
  await collection.bulkWrite(demoPublications.map((publication, index) => ({
    updateOne: {
      filter: publication.doi ? { doi: normalizeDoi(publication.doi) } : { normalizedTitle: normalizePublicationTitle(publication.title), year: publication.year, doi: null },
      update: { $setOnInsert: { ...publication, publicationType: demoPublicationTypes[index % demoPublicationTypes.length], doi: normalizeDoi(publication.doi), pdfUrl: publication.pdfUrl || null, normalizedTitle: normalizePublicationTitle(publication.title), createdAt: now, updatedAt: now } },
      upsert: true,
    },
  })));
  console.log(`✅ ${demoPublications.length} demo publications seeded idempotently`);
  process.exit(0);
}

seedPublications().catch((error) => { console.error("❌ Failed to seed publications:", error); process.exit(1); });
