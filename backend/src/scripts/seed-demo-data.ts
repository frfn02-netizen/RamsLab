import "dotenv/config";
import { basename } from "node:path";
import { connectDatabase } from "../config/database.js";
import { createPublicationIndexes } from "../modules/publications/publication.index.js";
import {
  getPublicationsCollection,
  normalizeDoi,
  normalizePublicationTitle,
} from "../modules/publications/publication.repository.js";
import { createPublicServiceIndexes } from "../modules/public-service/public-service.index.js";
import { getPublicServiceProjectsCollection } from "../modules/public-service/public-service.repository.js";
import { getVideosCollection } from "../modules/videos/video.repository.js";
import { extractYouTubeVideoId } from "../modules/videos/video.youtube.js";

// ─── PUBLICATION DATA ────────────────────────────────────────────────────────

const TOPICS = [
  "Maritime Safety",
  "Reliability Engineering",
  "Risk Assessment",
  "Marine Transportation",
  "Ship Design",
  "Ship Operation",
  "Port Safety",
  "Marine Terminal",
  "Offshore Engineering",
  "LNG",
  "Oil and Gas",
  "Collision Risk",
  "Grounding",
  "Navigation",
  "Maritime Logistics",
  "Supply Chain",
  "Port Resilience",
  "Vessel Traffic",
  "Human Factors",
  "Safety Management",
  "Asset Management",
  "Maintenance",
  "Structural Reliability",
  "Machinery Reliability",
  "Environmental Safety",
  "Marine Systems",
];

const METHODS = [
  "Risk Analysis",
  "Reliability Analysis",
  "Failure Mode and Effects Analysis",
  "Fault Tree Analysis",
  "Event Tree Analysis",
  "Monte Carlo Simulation",
  "Numerical Simulation",
  "Computational Modeling",
  "Optimization",
  "Statistical Analysis",
  "Data Analysis",
  "Case Study",
  "Experimental Study",
  "System Modeling",
  "Multi-Criteria Decision Analysis",
  "Bayesian Analysis",
  "Sensitivity Analysis",
  "Quantitative Analysis",
  "Qualitative Analysis",
  "Simulation",
];

const PUBLICATION_TYPES = [
  "Article",
  "Conference Paper",
  "Review",
  "Book Chapter",
  "Proceedings",
  "Editorial",
  "Other",
];

const demoPublications: {
  title: string;
  authors: string[];
  year: number;
  journal: string;
  doi: string | null;
  pdfUrl: string | null;
  topics: string[];
  methods: string[];
}[] = [
  // ── 2021 (6) ──
  {
    title:
      "Reliability Assessment of Marine Propulsion Systems Under Operational Uncertainty",
    authors: ["A. Budiarto", "K. B. Artana"],
    year: 2021,
    journal: "Journal of Marine Science and Technology",
    doi: null,
    pdfUrl: null,
    topics: [
      "Reliability Engineering",
      "Machinery Reliability",
      "Marine Systems",
    ],
    methods: ["Reliability Analysis", "Monte Carlo Simulation"],
  },
  {
    title:
      "Collision Risk Evaluation for Vessel Traffic in Congested Port Areas",
    authors: ["D. W. Handani", "E. Pratiwi"],
    year: 2021,
    journal: "Maritime Policy & Management",
    doi: null,
    pdfUrl: null,
    topics: ["Collision Risk", "Vessel Traffic", "Port Safety"],
    methods: ["Risk Analysis", "Statistical Analysis"],
  },
  {
    title:
      "Risk-Based Maintenance Strategy for Offshore Floating Production Units",
    authors: ["F. I. Prastyasari", "I. M. Aria"],
    year: 2021,
    journal: "Ocean Engineering",
    doi: "10.1016/j.oceaneng.2021.001",
    pdfUrl: null,
    topics: ["Offshore Engineering", "Maintenance", "Risk Assessment"],
    methods: ["Failure Mode and Effects Analysis", "Optimization"],
  },
  {
    title:
      "Port Resilience Under Extreme Weather Events: A Simulation Approach",
    authors: ["T. Arafatul Akbar", "A. A. B. Dinarinaya"],
    year: 2021,
    journal: "Reliability Engineering & System Safety",
    doi: null,
    pdfUrl: null,
    topics: ["Port Resilience", "Environmental Safety", "Supply Chain"],
    methods: ["Simulation", "Monte Carlo Simulation"],
  },
  {
    title: "LNG Terminal Safety Assessment Using Bayesian Networks",
    authors: ["K. B. Artana", "D. W. Handani"],
    year: 2021,
    journal: "Process Safety and Environmental Protection",
    doi: null,
    pdfUrl: null,
    topics: ["LNG", "Safety Management", "Risk Assessment"],
    methods: ["Bayesian Analysis", "Fault Tree Analysis"],
  },
  {
    title: "Structural Reliability Analysis of Aged Merchant Vessels",
    authors: ["I. M. Aria", "F. I. Prastyasari"],
    year: 2021,
    journal: "Marine Structures",
    doi: null,
    pdfUrl: null,
    topics: ["Structural Reliability", "Ship Design", "Asset Management"],
    methods: ["Reliability Analysis", "Sensitivity Analysis"],
  },

  // ── 2022 (8) ──
  {
    title:
      "Maritime Logistics Optimization for Inter-Island Cargo Distribution",
    authors: ["A. Budiarto", "T. Arafatul Akbar"],
    year: 2022,
    journal: "Transportation Research Part E",
    doi: "10.1016/j.tre.2022.001",
    pdfUrl: null,
    topics: ["Maritime Logistics", "Supply Chain", "Optimization"],
    methods: ["Optimization", "Computational Modeling"],
  },
  {
    title:
      "Grounding Risk Analysis for Shallow Water Navigation in Indonesian Waters",
    authors: ["D. W. Handani", "E. Pratiwi"],
    year: 2022,
    journal: "Journal of Navigation",
    doi: null,
    pdfUrl: null,
    topics: ["Grounding", "Navigation", "Marine Transportation"],
    methods: ["Risk Analysis", "Numerical Simulation"],
  },
  {
    title:
      "Human Factors in Maritime Accidents: A Systematic Review of Indonesian Studies",
    authors: ["E. Pratiwi", "F. I. Prastyasari"],
    year: 2022,
    journal: "Safety Science",
    doi: null,
    pdfUrl: null,
    topics: ["Human Factors", "Maritime Safety", "Safety Management"],
    methods: ["Qualitative Analysis", "Case Study"],
  },
  {
    title:
      "Reliability-Centered Maintenance for Marine Diesel Engines in Tropical Operations",
    authors: ["I. M. Aria", "A. Budiarto"],
    year: 2022,
    journal: "Ocean Engineering",
    doi: "10.1016/j.oceaneng.2022.001",
    pdfUrl: null,
    topics: ["Machinery Reliability", "Maintenance", "Ship Operation"],
    methods: ["Failure Mode and Effects Analysis", "Data Analysis"],
  },
  {
    title: "Offshore Pipeline Risk Assessment Using Kent Muhlbauer Method",
    authors: ["K. B. Artana", "T. Arafatul Akbar"],
    year: 2022,
    journal: "Pipeline & Gas Journal",
    doi: null,
    pdfUrl: null,
    topics: ["Oil and Gas", "Risk Assessment", "Offshore Engineering"],
    methods: ["Risk Analysis", "Quantitative Analysis"],
  },
  {
    title: "Multi-Criteria Decision Analysis for Port Equipment Selection",
    authors: ["T. Arafatul Akbar", "A. A. B. Dinarinaya"],
    year: 2022,
    journal: "Maritime Economics & Logistics",
    doi: null,
    pdfUrl: null,
    topics: ["Port Safety", "Maritime Logistics", "Asset Management"],
    methods: ["Multi-Criteria Decision Analysis", "Case Study"],
  },
  {
    title:
      "Numerical Simulation of Ship Motion in Irregular Sea States for Safety Assessment",
    authors: ["F. I. Prastyasari", "I. M. Aria"],
    year: 2022,
    journal: "Applied Ocean Research",
    doi: null,
    pdfUrl: null,
    topics: ["Ship Operation", "Marine Systems", "Maritime Safety"],
    methods: ["Numerical Simulation", "Statistical Analysis"],
  },
  {
    title: "Oil Spill Response Optimization for Indonesian Port Waters",
    authors: ["A. A. B. Dinarinaya", "D. W. Handani"],
    year: 2022,
    journal: "Marine Pollution Bulletin",
    doi: null,
    pdfUrl: null,
    topics: ["Environmental Safety", "Oil and Gas", "Port Safety"],
    methods: ["Optimization", "Simulation"],
  },

  // ── 2023 (10) ──
  {
    title:
      "Vessel Traffic Service Optimization for High-Density Shipping Lanes",
    authors: ["D. W. Handani", "A. Budiarto"],
    year: 2023,
    journal: "Transportation Research Part A",
    doi: null,
    pdfUrl: null,
    topics: ["Vessel Traffic", "Navigation", "Marine Transportation"],
    methods: ["Optimization", "Statistical Analysis"],
  },
  {
    title: "Failure Mode Analysis of LNG Carrier Cargo Containment Systems",
    authors: ["K. B. Artana", "F. I. Prastyasari"],
    year: 2023,
    journal: "Marine Structures",
    doi: "10.1016/j.marstruc.2023.001",
    pdfUrl: null,
    topics: ["LNG", "Ship Design", "Structural Reliability"],
    methods: ["Failure Mode and Effects Analysis", "Reliability Analysis"],
  },
  {
    title: "Supply Chain Disruption Risk in Indonesian Maritime Networks",
    authors: ["T. Arafatul Akbar", "E. Pratiwi"],
    year: 2023,
    journal: "International Journal of Logistics Research and Applications",
    doi: null,
    pdfUrl: null,
    topics: ["Supply Chain", "Risk Assessment", "Maritime Logistics"],
    methods: ["Risk Analysis", "Bayesian Analysis"],
  },
  {
    title: "Port Infrastructure Resilience Under Seismic Hazard Scenarios",
    authors: ["I. M. Aria", "A. A. B. Dinarinaya"],
    year: 2023,
    journal: "Reliability Engineering & System Safety",
    doi: null,
    pdfUrl: null,
    topics: ["Port Resilience", "Environmental Safety", "Asset Management"],
    methods: ["Monte Carlo Simulation", "Sensitivity Analysis"],
  },
  {
    title: "Machine Learning Applications in Ship Predictive Maintenance",
    authors: ["F. I. Prastyasari", "A. Budiarto"],
    year: 2023,
    journal: "Ocean Engineering",
    doi: null,
    pdfUrl: null,
    topics: ["Maintenance", "Ship Operation", "Marine Systems"],
    methods: ["Data Analysis", "Computational Modeling"],
  },
  {
    title:
      "Collision Avoidance Decision Support for Autonomous Surface Vehicles",
    authors: ["D. W. Handani", "T. Arafatul Akbar"],
    year: 2023,
    journal: "Journal of Marine Science and Technology",
    doi: "10.1007/s00773-023-001",
    pdfUrl: null,
    topics: ["Collision Risk", "Navigation", "Marine Systems"],
    methods: ["Computational Modeling", "Optimization"],
  },
  {
    title:
      "Offshore Structure Fatigue Life Assessment Using Probabilistic Methods",
    authors: ["I. M. Aria", "K. B. Artana"],
    year: 2023,
    journal: "Marine Structures",
    doi: null,
    pdfUrl: null,
    topics: [
      "Offshore Engineering",
      "Structural Reliability",
      "Risk Assessment",
    ],
    methods: ["Bayesian Analysis", "Reliability Analysis"],
  },
  {
    title:
      "Marine Terminal Operational Risk Under Uncertain Weather Conditions",
    authors: ["E. Pratiwi", "F. I. Prastyasari"],
    year: 2023,
    journal: "Port Technology International",
    doi: null,
    pdfUrl: null,
    topics: ["Marine Terminal", "Risk Assessment", "Ship Operation"],
    methods: ["Monte Carlo Simulation", "Event Tree Analysis"],
  },
  {
    title: "Environmental Impact Assessment of Ship Ballast Water Management",
    authors: ["A. A. B. Dinarinaya", "I. M. Aria"],
    year: 2023,
    journal: "Marine Pollution Bulletin",
    doi: null,
    pdfUrl: null,
    topics: [
      "Environmental Safety",
      "Marine Transportation",
      "Safety Management",
    ],
    methods: ["Quantitative Analysis", "Case Study"],
  },
  {
    title:
      "Safety Case Development for Floating LNG Terminals in Indonesian Waters",
    authors: ["K. B. Artana", "D. W. Handani"],
    year: 2023,
    journal: "Process Safety and Environmental Protection",
    doi: null,
    pdfUrl: null,
    topics: ["LNG", "Marine Terminal", "Safety Management"],
    methods: ["Fault Tree Analysis", "Event Tree Analysis"],
  },

  // ── 2024 (9) ──
  {
    title:
      "Reliability-Centered Maintenance Scheduling for Fleet Operations Using Genetic Algorithms",
    authors: ["A. Budiarto", "F. I. Prastyasari", "I. M. Aria"],
    year: 2024,
    journal: "Ocean Engineering",
    doi: null,
    pdfUrl: null,
    topics: ["Maintenance", "Reliability Engineering", "Ship Operation"],
    methods: [
      "Optimization",
      "Computational Modeling",
      "Monte Carlo Simulation",
    ],
  },
  {
    title:
      "Maritime Safety Culture Assessment in Indonesian Shipping Companies",
    authors: ["E. Pratiwi", "D. W. Handani"],
    year: 2024,
    journal: "Safety Science",
    doi: "10.1016/j.ssci.2024.001",
    pdfUrl: null,
    topics: ["Maritime Safety", "Human Factors", "Safety Management"],
    methods: ["Qualitative Analysis", "Statistical Analysis"],
  },
  {
    title:
      "Probabilistic Risk Assessment of Offshore Platform Structural Systems",
    authors: ["I. M. Aria", "K. B. Artana"],
    year: 2024,
    journal: "Marine Structures",
    doi: null,
    pdfUrl: null,
    topics: ["Offshore Engineering", "Structural Reliability", "Oil and Gas"],
    methods: [
      "Reliability Analysis",
      "Sensitivity Analysis",
      "Numerical Simulation",
    ],
  },
  {
    title: "LNG Bunkering Safety Analysis for Emerging Port Infrastructure",
    authors: ["K. B. Artana", "T. Arafatul Akbar"],
    year: 2024,
    journal: "Journal of Marine Science and Technology",
    doi: null,
    pdfUrl: null,
    topics: ["LNG", "Port Safety", "Marine Terminal"],
    methods: ["Risk Analysis", "Fault Tree Analysis"],
  },
  {
    title:
      "Supply Chain Network Optimization for Multimodal Maritime Transport",
    authors: ["T. Arafatul Akbar", "A. Budiarto"],
    year: 2024,
    journal: "Transportation Research Part E",
    doi: null,
    pdfUrl: null,
    topics: ["Supply Chain", "Maritime Logistics", "Optimization"],
    methods: ["Optimization", "Multi-Criteria Decision Analysis"],
  },
  {
    title:
      "Numerical Investigation of Ship-Bridge Collision Forces Under Variable Conditions",
    authors: ["F. I. Prastyasari", "D. W. Handani"],
    year: 2024,
    journal: "Engineering Structures",
    doi: "10.1016/j.engstruct.2024.001",
    pdfUrl: null,
    topics: [
      "Collision Risk",
      "Marine Transportation",
      "Structural Reliability",
    ],
    methods: ["Numerical Simulation", "Statistical Analysis"],
  },
  {
    title:
      "Data-Driven Approach for Machinery Health Monitoring in Marine Vessels",
    authors: ["A. Budiarto", "F. I. Prastyasari"],
    year: 2024,
    journal: "Ocean Engineering",
    doi: null,
    pdfUrl: null,
    topics: ["Machinery Reliability", "Asset Management", "Marine Systems"],
    methods: ["Data Analysis", "Computational Modeling"],
  },
  {
    title: "Port Operations Efficiency Under Carbon Emission Constraints",
    authors: ["A. A. B. Dinarinaya", "T. Arafatul Akbar"],
    year: 2024,
    journal: "Maritime Economics & Logistics",
    doi: null,
    pdfUrl: null,
    topics: ["Port Safety", "Environmental Safety", "Maritime Logistics"],
    methods: ["Multi-Criteria Decision Analysis", "Optimization"],
  },
  {
    title:
      "Grounding Risk Mitigation Strategies for shallow Draft Vessels in Archipelagic Waters",
    authors: ["D. W. Handani", "E. Pratiwi", "I. M. Aria"],
    year: 2024,
    journal: "Journal of Navigation",
    doi: null,
    pdfUrl: null,
    topics: [
      "Grounding",
      "Navigation",
      "Marine Transportation",
      "Risk Assessment",
    ],
    methods: ["Risk Analysis", "Case Study", "Quantitative Analysis"],
  },

  // ── 2025 (10) ──
  {
    title:
      "Integrated Risk Framework for Autonomous Ship Operations in Coastal Waters",
    authors: ["D. W. Handani", "T. Arafatul Akbar", "A. Budiarto"],
    year: 2025,
    journal: "Ocean Engineering",
    doi: null,
    pdfUrl: null,
    topics: [
      "Navigation",
      "Risk Assessment",
      "Marine Systems",
      "Maritime Safety",
    ],
    methods: ["Computational Modeling", "Bayesian Analysis", "Risk Analysis"],
  },
  {
    title:
      "Structural Health Monitoring for Aging Offshore Structures Using IoT Sensors",
    authors: ["I. M. Aria", "F. I. Prastyasari"],
    year: 2025,
    journal: "Marine Structures",
    doi: "10.1016/j.marstruc.2025.001",
    pdfUrl: null,
    topics: [
      "Offshore Engineering",
      "Asset Management",
      "Structural Reliability",
    ],
    methods: ["Data Analysis", "Experimental Study"],
  },
  {
    title: "Bayesian Network Modeling for LNG Terminal Risk Quantification",
    authors: ["K. B. Artana", "D. W. Handani"],
    year: 2025,
    journal: "Process Safety and Environmental Protection",
    doi: null,
    pdfUrl: null,
    topics: ["LNG", "Risk Assessment", "Marine Terminal"],
    methods: [
      "Bayesian Analysis",
      "Fault Tree Analysis",
      "Event Tree Analysis",
    ],
  },
  {
    title:
      "Human Reliability Assessment in Maritime Emergency Response Operations",
    authors: ["E. Pratiwi", "F. I. Prastyasari"],
    year: 2025,
    journal: "Safety Science",
    doi: null,
    pdfUrl: null,
    topics: ["Human Factors", "Maritime Safety", "Safety Management"],
    methods: ["Quantitative Analysis", "Simulation"],
  },
  {
    title: "Green Ship Design Optimization for Reduced Environmental Footprint",
    authors: ["A. A. B. Dinarinaya", "I. M. Aria"],
    year: 2025,
    journal: "Ocean Engineering",
    doi: null,
    pdfUrl: null,
    topics: ["Ship Design", "Environmental Safety", "Marine Systems"],
    methods: ["Optimization", "Numerical Simulation"],
  },
  {
    title:
      "Multi-Criteria Assessment of Port Resilience to Climate Change Impacts",
    authors: ["T. Arafatul Akbar", "A. A. B. Dinarinaya"],
    year: 2025,
    journal: "Transportation Research Part D",
    doi: "10.1016/j.trd.2025.001",
    pdfUrl: null,
    topics: ["Port Resilience", "Environmental Safety", "Maritime Logistics"],
    methods: ["Multi-Criteria Decision Analysis", "Sensitivity Analysis"],
  },
  {
    title:
      "Predictive Maintenance Scheduling Using Digital Twin Technology for Marine Engines",
    authors: ["A. Budiarto", "I. M. Aria", "F. I. Prastyasari"],
    year: 2025,
    journal: "Ocean Engineering",
    doi: null,
    pdfUrl: null,
    topics: ["Maintenance", "Machinery Reliability", "Ship Operation"],
    methods: ["Computational Modeling", "Simulation", "Data Analysis"],
  },
  {
    title:
      "Vessel Collision Consequence Analysis for Bridge Infrastructure Protection",
    authors: ["D. W. Handani", "K. B. Artana"],
    year: 2025,
    journal: "Engineering Structures",
    doi: null,
    pdfUrl: null,
    topics: [
      "Collision Risk",
      "Structural Reliability",
      "Marine Transportation",
    ],
    methods: ["Numerical Simulation", "Risk Analysis"],
  },
  {
    title:
      "Oil and Gas Offshore Facility Evacuation Risk Analysis Under Harsh Weather",
    authors: ["K. B. Artana", "E. Pratiwi", "T. Arafatul Akbar"],
    year: 2025,
    journal: "Safety Science",
    doi: null,
    pdfUrl: null,
    topics: [
      "Oil and Gas",
      "Offshore Engineering",
      "Risk Assessment",
      "Safety Management",
    ],
    methods: [
      "Event Tree Analysis",
      "Monte Carlo Simulation",
      "Qualitative Analysis",
    ],
  },
  {
    title:
      "Supply Chain Resilience in Indonesian Seaports: A Network Reliability Perspective",
    authors: ["T. Arafatul Akbar", "A. Budiarto", "E. Pratiwi"],
    year: 2025,
    journal: "Reliability Engineering & System Safety",
    doi: null,
    pdfUrl: null,
    topics: ["Supply Chain", "Port Resilience", "Reliability Engineering"],
    methods: ["Reliability Analysis", "Statistical Analysis", "Case Study"],
  },

  // ── 2026 (7) ──
  {
    title:
      "Autonomous Navigation Safety Framework for Intelligent Ship Systems in Restricted Waters",
    authors: ["D. W. Handani", "F. I. Prastyasari", "A. Budiarto"],
    year: 2026,
    journal: "Journal of Marine Science and Technology",
    doi: null,
    pdfUrl: null,
    topics: [
      "Navigation",
      "Marine Systems",
      "Maritime Safety",
      "Ship Operation",
    ],
    methods: ["Computational Modeling", "Risk Analysis", "Experimental Study"],
  },
  {
    title:
      "Reliability Assessment of Floating Offshore Wind Turbine Structural Systems",
    authors: ["I. M. Aria", "K. B. Artana"],
    year: 2026,
    journal: "Ocean Engineering",
    doi: "10.1016/j.oceaneng.2026.001",
    pdfUrl: null,
    topics: [
      "Offshore Engineering",
      "Structural Reliability",
      "Environmental Safety",
    ],
    methods: [
      "Reliability Analysis",
      "Numerical Simulation",
      "Sensitivity Analysis",
    ],
  },
  {
    title:
      "Next-Generation LNG Terminal Risk Management Using AI-Driven Analytics",
    authors: ["K. B. Artana", "T. Arafatul Akbar", "D. W. Handani"],
    year: 2026,
    journal: "Process Safety and Environmental Protection",
    doi: null,
    pdfUrl: null,
    topics: ["LNG", "Marine Terminal", "Risk Assessment"],
    methods: ["Bayesian Analysis", "Data Analysis", "Computational Modeling"],
  },
  {
    title:
      "Maritime Logistics Network Optimization Under Carbon Neutrality Constraints",
    authors: ["T. Arafatul Akbar", "A. A. B. Dinarinaya"],
    year: 2026,
    journal: "Transportation Research Part E",
    doi: null,
    pdfUrl: null,
    topics: ["Maritime Logistics", "Supply Chain", "Environmental Safety"],
    methods: ["Optimization", "Multi-Criteria Decision Analysis"],
  },
  {
    title: "Integrated Safety Management System for Complex Marine Operations",
    authors: ["E. Pratiwi", "F. I. Prastyasari", "I. M. Aria"],
    year: 2026,
    journal: "Safety Science",
    doi: null,
    pdfUrl: null,
    topics: [
      "Safety Management",
      "Maritime Safety",
      "Human Factors",
      "Ship Operation",
    ],
    methods: ["Qualitative Analysis", "Case Study", "Statistical Analysis"],
  },
  {
    title:
      "Digital Twin-Based Condition Assessment for Marine Structural Integrity Monitoring",
    authors: ["I. M. Aria", "A. Budiarto", "F. I. Prastyasari"],
    year: 2026,
    journal: "Marine Structures",
    doi: "10.1016/j.marstruc.2026.001",
    pdfUrl: null,
    topics: ["Structural Reliability", "Asset Management", "Marine Systems"],
    methods: ["Computational Modeling", "Data Analysis", "Simulation"],
  },
  {
    title:
      "Port Safety Performance Benchmarking Using Data Envelopment Analysis",
    authors: ["A. A. B. Dinarinaya", "T. Arafatul Akbar", "D. W. Handani"],
    year: 2026,
    journal: "Maritime Economics & Logistics",
    doi: null,
    pdfUrl: null,
    topics: ["Port Safety", "Maritime Logistics", "Asset Management"],
    methods: [
      "Data Analysis",
      "Multi-Criteria Decision Analysis",
      "Quantitative Analysis",
    ],
  },
];

// ─── PUBLIC SERVICE DATA ─────────────────────────────────────────────────────

const YEAR_GROUPS = ["2023-2024", "2025", "2026"] as const;

const EXECUTING_ENTITIES = [
  "PT ITS",
  "ITS Laboratory",
  "RAMS Laboratory",
  "Marine Engineering Division",
  "Naval Architecture Team",
  "Maritime Safety Research Group",
  "Reliability Engineering Team",
  "Offshore Systems Research Group",
];

const CLIENTS = [
  "PT Pelabuhan Indonesia",
  "PT Pertamina",
  "SKK Migas",
  "Direktorat Jenderal Perhubungan Laut",
  "PT Pelayaran Nusantara",
  "PT Energi Maritim",
  "Port Authority",
  "Offshore Operations Division",
  "PT Indonesia Power",
  "PT PLN (Persero)",
];

const demoPublicServiceProjects: {
  yearGroup: string;
  title: { en: string; id: string };
  executingEntity: string;
  client: string;
  period: string;
  order: number;
  published: boolean;
}[] = [
  // ── 2023-2024 (25) ──
  {
    yearGroup: "2023-2024",
    title: {
      en: "Marine Terminal Safety Assessment",
      id: "Penilaian Keselamatan Terminal Maritim",
    },
    executingEntity: "RAMS Laboratory",
    client: "PT Pelabuhan Indonesia",
    period: "15 Januari 2023 - 30 Juni 2023",
    order: 0,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Ship Operational Risk Assessment for Offshore Supply Vessels",
      id: "Penilaian Risiko Operasional Kapal untuk Vessel Suplai Lepas Pantai",
    },
    executingEntity: "Maritime Safety Research Group",
    client: "PT Pertamina",
    period: "01 Februari 2023 - 31 Agustus 2023",
    order: 1,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Reliability Assessment of Marine Propulsion System Under Varying Load Conditions",
      id: "Penilaian Keandalan Sistem Propulsi Maritim di Bawah Kondisi Beban Variabel",
    },
    executingEntity: "Reliability Engineering Team",
    client: "PT Pelayaran Nusantara",
    period: "10 Maret 2023 - 15 Oktober 2023",
    order: 2,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Navigation Safety Study for Straits of Malacca Traffic Separation Scheme",
      id: "Studi Keselamatan Navigasi untuk Skema Pemisahan Lalu Lintas Selat Malaka",
    },
    executingEntity: "ITS Laboratory",
    client: "Direktorat Jenderal Perhubungan Laut",
    period: "01 April 2023 - 30 November 2023",
    order: 3,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "LNG Terminal Risk Evaluation for East Java Region",
      id: "Evaluasi Risiko Terminal LNG untuk Wilayah Jawa Timur",
    },
    executingEntity: "PT ITS",
    client: "PT Energi Maritim",
    period: "01 Mei 2023 - 31 Desember 2023",
    order: 4,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Port Resilience Assessment Against Natural Hazards",
      id: "Penilaian Ketahanan Pelabuhan Terhadap Bencana Alam",
    },
    executingEntity: "Marine Engineering Division",
    client: "PT Pelabuhan Indonesia",
    period: "15 Juni 2023 - 15 Januari 2024",
    order: 5,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Offshore Facility Reliability Study for Deep Water Operations",
      id: "Studi Keandalan Fasilitas Lepas Pantai untuk Operasi Perairan Dalam",
    },
    executingEntity: "Offshore Systems Research Group",
    client: "SKK Migas",
    period: "01 Juli 2023 - 28 Februari 2024",
    order: 6,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Marine Traffic Safety Analysis for Port Approach Channels",
      id: "Analisis Keselamatan Lalu Lintas Maritim untuk Alur Pendekatan Pelabuhan",
    },
    executingEntity: "Naval Architecture Team",
    client: "Port Authority",
    period: "01 Agustus 2023 - 31 Maret 2024",
    order: 7,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Ship Machinery Condition Assessment Program for Aging Fleet",
      id: "Program Penilaian Kondisi Mesin Kapal untuk Armada Tua",
    },
    executingEntity: "Reliability Engineering Team",
    client: "PT Pelayaran Nusantara",
    period: "15 September 2023 - 30 April 2024",
    order: 8,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Maritime Transportation Risk Study for Indonesian Archipelagic Waters",
      id: "Studi Risiko Transportasi Maritim untuk Perairan Kepulauan Indonesia",
    },
    executingEntity: "Maritime Safety Research Group",
    client: "Direktorat Jenderal Perhubungan Laut",
    period: "01 Oktober 2023 - 31 Mei 2024",
    order: 9,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Mooring System Assessment for Large Crude Carriers",
      id: "Penilaian Sistem Moor untuk Kapal Tanker Besar",
    },
    executingEntity: "Marine Engineering Division",
    client: "PT Pertamina",
    period: "15 November 2023 - 30 Juni 2024",
    order: 10,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Marine Structure Integrity Assessment for Container Vessels",
      id: "Penilaian Integritas Struktur Maritim untuk Kapal Kontainer",
    },
    executingEntity: "Naval Architecture Team",
    client: "PT Indonesia Power",
    period: "01 Desember 2023 - 31 Juli 2024",
    order: 11,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Collision Risk Analysis for Vessel Traffic Management in Busy Ports",
      id: "Analisis Risiko Tabrakan untuk Manajemen Lalu Lintas Kapal di Pelabuhan Ramai",
    },
    executingEntity: "ITS Laboratory",
    client: "Port Authority",
    period: "15 Januari 2024 - 15 Agustus 2024",
    order: 12,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Environmental Impact Study for Ship Recycling Facilities",
      id: "Studi Dampak Lingkungan untuk Fasilitas Daur Ulang Kapal",
    },
    executingEntity: "RAMS Laboratory",
    client: "PT Energi Maritim",
    period: "01 Februari 2024 - 30 September 2024",
    order: 13,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Risk-Based Inspection Planning for Offshore Platforms",
      id: "Perencanaan Inspeksi Berbasis Risiko untuk Platform Lepas Pantai",
    },
    executingEntity: "Offshore Systems Research Group",
    client: "SKK Migas",
    period: "10 Maret 2024 - 31 Oktober 2024",
    order: 14,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Supply Chain Reliability for Maritime Spare Parts Distribution",
      id: "Keandalan Rantai Pasok untuk Distribusi Suku Cadang Maritim",
    },
    executingEntity: "Reliability Engineering Team",
    client: "PT PLN (Persero)",
    period: "01 April 2024 - 30 November 2024",
    order: 15,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Human Error Assessment in Marine Engine Room Operations",
      id: "Penilaian Kesalahan Manusia dalam Operasi Ruang Mesin Maritim",
    },
    executingEntity: "Maritime Safety Research Group",
    client: "PT Pelayaran Nusantara",
    period: "15 Mei 2024 - 31 Desember 2024",
    order: 16,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Structural Reliability of FPSO Hull Under Cyclic Loading",
      id: "Keandalan Struktur Hull FPSO di Bawah Beban Siklik",
    },
    executingEntity: "PT ITS",
    client: "PT Pertamina",
    period: "01 Juni 2024 - 31 Januari 2025",
    order: 17,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Safety Management System Audit for Passenger Ferry Operations",
      id: "Audit Sistem Manajemen Keselamatan untuk Operasi Kapal Feri Penumpang",
    },
    executingEntity: "Marine Engineering Division",
    client: "Direktorat Jenderal Perhubungan Laut",
    period: "15 Juli 2024 - 28 Februari 2025",
    order: 18,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Gas Detection System Reliability for LNG Carrier Cargo Operations",
      id: "Keandalan Sistem Deteksi Gas untuk Operasi Kargo LNG Carrier",
    },
    executingEntity: "RAMS Laboratory",
    client: "PT Energi Maritim",
    period: "01 Agustus 2024 - 31 Maret 2025",
    order: 19,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Vessel Speed Optimization for Fuel Efficiency and Emission Reduction",
      id: "Optimasi Kecepatan Kapal untuk Efisiensi Bahan Bakar dan Pengurangan Emisi",
    },
    executingEntity: "Naval Architecture Team",
    client: "PT Pelabuhan Indonesia",
    period: "15 September 2024 - 30 April 2025",
    order: 20,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Port Crane Reliability Analysis and Maintenance Optimization",
      id: "Analisis Keandalan Crane Pelabuhan dan Optimasi Pemeliharaan",
    },
    executingEntity: "ITS Laboratory",
    client: "PT Pelabuhan Indonesia",
    period: "01 Oktober 2024 - 31 Mei 2025",
    order: 21,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Underwater Inspection Protocol for Ship Hull Integrity Verification",
      id: "Protokol Inspeksi Bawah Air untuk Verifikasi Integritas Hull Kapal",
    },
    executingEntity: "Marine Engineering Division",
    client: "PT Pelayaran Nusantara",
    period: "15 November 2024 - 30 Juni 2025",
    order: 22,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Fire Risk Assessment for Offshore Processing Facilities",
      id: "Penilaian Risiko Kebakaran untuk Fasilitas Pemrosesan Lepas Pantai",
    },
    executingEntity: "Offshore Systems Research Group",
    client: "PT Pertamina",
    period: "01 Desember 2024 - 31 Juli 2025",
    order: 23,
    published: true,
  },
  {
    yearGroup: "2023-2024",
    title: {
      en: "Corrosion Management Strategy for Marine Structures in Tropical Waters",
      id: "Strategi Manajemen Korosi untuk Struktur Maritim di Perairan Tropis",
    },
    executingEntity: "Reliability Engineering Team",
    client: "PT Indonesia Power",
    period: "15 Januari 2025 - 15 Agustus 2025",
    order: 24,
    published: true,
  },

  // ── 2025 (25) ──
  {
    yearGroup: "2025",
    title: {
      en: "Autonomous Ship Navigation Safety Protocol Development",
      id: "Pengembangan Protokol Keselamatan Navigasi Kapal Otonom",
    },
    executingEntity: "ITS Laboratory",
    client: "Direktorat Jenderal Perhubungan Laut",
    period: "01 Januari 2025 - 30 Juni 2025",
    order: 0,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "LNG Bunkering Safety Assessment for Port Infrastructure",
      id: "Penilaian Keselamatan Bunkering LNG untuk Infrastruktur Pelabuhan",
    },
    executingEntity: "RAMS Laboratory",
    client: "PT Energi Maritim",
    period: "15 Februari 2025 - 31 Juli 2025",
    order: 1,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Structural Fatigue Life Prediction for Offshore Wind Turbine Foundations",
      id: "Prediksi Masa Kelelahan Struktur untuk Fondasi Turbin Angin Lepas Pantai",
    },
    executingEntity: "Naval Architecture Team",
    client: "PT PLN (Persero)",
    period: "01 Maret 2025 - 31 Agustus 2025",
    order: 2,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Digital Twin Implementation for Port Equipment Monitoring",
      id: "Implementasi Digital Twin untuk Monitoring Peralatan Pelabuhan",
    },
    executingEntity: "Marine Engineering Division",
    client: "PT Pelabuhan Indonesia",
    period: "15 April 2025 - 30 September 2025",
    order: 3,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Risk Assessment Framework for Arctic Shipping Routes",
      id: "Kerangka Penilaian Risiko untuk Rute Pelayaran Arktik",
    },
    executingEntity: "Maritime Safety Research Group",
    client: "PT Pertamina",
    period: "01 Mei 2025 - 31 Oktober 2025",
    order: 4,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Marine Diesel Engine Reliability Enhancement Through Predictive Analytics",
      id: "Peningkatan Keandalan Mesin Diesel Maritim Melalui Analitik Prediktif",
    },
    executingEntity: "Reliability Engineering Team",
    client: "PT Pelayaran Nusantara",
    period: "15 Juni 2025 - 30 November 2025",
    order: 5,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Carbon Capture Storage Facility Risk Analysis for Offshore Applications",
      id: "Analisis Risiko Fasilitas Carbon Capture Storage untuk Aplikasi Lepas Pantai",
    },
    executingEntity: "Offshore Systems Research Group",
    client: "SKK Migas",
    period: "01 Juli 2025 - 31 Desember 2025",
    order: 6,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Vessel Traffic Management System Optimization for Indonesian Ports",
      id: "Optimasi Sistem Manajemen Lalu Lintas Kapal untuk Pelabuhan Indonesia",
    },
    executingEntity: "ITS Laboratory",
    client: "Port Authority",
    period: "15 Agustus 2025 - 31 Januari 2026",
    order: 7,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Ballast Water Management Compliance and Safety Evaluation",
      id: "Evaluasi Kepatuhan dan Keselamatan Manajemen Ballast Air",
    },
    executingEntity: "RAMS Laboratory",
    client: "Direktorat Jenderal Perhubungan Laut",
    period: "01 September 2025 - 28 Februari 2026",
    order: 8,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Mooring Line Failure Analysis for LNG Carrier Berthing Operations",
      id: "Analisis Kegagalan Tali Moor untuk Operasi Sandar LNG Carrier",
    },
    executingEntity: "Marine Engineering Division",
    client: "PT Energi Maritim",
    period: "15 Oktober 2025 - 31 Maret 2026",
    order: 9,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Offshore Platform Emergency Response System Reliability Study",
      id: "Studi Keandalan Sistem Tanggap Darurat Platform Lepas Pantai",
    },
    executingEntity: "Offshore Systems Research Group",
    client: "SKK Migas",
    period: "01 November 2025 - 30 April 2026",
    order: 10,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Port Security Risk Assessment Under Cyber Threat Landscape",
      id: "Penilaian Risiko Keamanan Pelabuhan di Bawah Ancaman Siber",
    },
    executingEntity: "Maritime Safety Research Group",
    client: "PT Pelabuhan Indonesia",
    period: "15 Desember 2025 - 31 Mei 2026",
    order: 11,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Ship-to-Ship Bunkering Safety Protocol for LNG Fuelled Vessels",
      id: "Protokol Keselamatan Bunkering Ship-to-Ship untuk Kapal Bahan Bakar LNG",
    },
    executingEntity: "RAMS Laboratory",
    client: "PT Pertamina",
    period: "01 Januari 2026 - 30 Juni 2026",
    order: 12,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Marine Propulsion System Redundancy Analysis for Critical Operations",
      id: "Analisis Redundansi Sistem Propulsi Maritim untuk Operasi Kritis",
    },
    executingEntity: "Reliability Engineering Team",
    client: "PT Pelayaran Nusantara",
    period: "15 Februari 2026 - 31 Juli 2026",
    order: 13,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Structural Integrity Assessment for Converted FPSO Vessels",
      id: "Penilaian Integritas Struktur untuk Kapal FPSO yang Dikonversi",
    },
    executingEntity: "Naval Architecture Team",
    client: "PT Pertamina",
    period: "01 Maret 2026 - 31 Agustus 2026",
    order: 14,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Hydrodynamic Analysis of Ship Maneuvering in Restricted Waterways",
      id: "Analisis Hidrodinamika Manuver Kapal di Perairan Terbatas",
    },
    executingEntity: "ITS Laboratory",
    client: "Direktorat Jenderal Perhubungan Laut",
    period: "15 April 2026 - 30 September 2026",
    order: 15,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Condition-Based Maintenance Framework for Marine Auxiliary Systems",
      id: "Kerangka Pemeliharaan Berbasis Kondisi untuk Sistem Bantu Maritim",
    },
    executingEntity: "Marine Engineering Division",
    client: "PT Indonesia Power",
    period: "01 Mei 2026 - 31 Oktober 2026",
    order: 16,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Oil Spill Containment and Recovery System Efficiency Study",
      id: "Studi Efisiensi Sistem Penahanan dan Pemulihan Tumpahan Minyak",
    },
    executingEntity: "Maritime Safety Research Group",
    client: "PT Pertamina",
    period: "15 Juni 2026 - 30 November 2026",
    order: 17,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Subsea Pipeline Integrity Management for Deepwater Field Development",
      id: "Manajemen Integritas Pipa Bawah Laut untuk Pengembangan Lapangan Perairan Dalam",
    },
    executingEntity: "Offshore Systems Research Group",
    client: "SKK Migas",
    period: "01 Juli 2026 - 31 Desember 2026",
    order: 18,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Passenger Ferry Safety Compliance Audit for Inter-Island Routes",
      id: "Audit Kepatuhan Keselamatan Kapal Feri Penumpang untuk Rute Antar Pulau",
    },
    executingEntity: "RAMS Laboratory",
    client: "Direktorat Jenderal Perhubungan Laut",
    period: "15 Agustus 2026 - 31 Januari 2027",
    order: 19,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Marine Renewable Energy Device Reliability Assessment",
      id: "Penilaian Keandalan Perangkat Energi Terbarukan Maritim",
    },
    executingEntity: "Reliability Engineering Team",
    client: "PT PLN (Persero)",
    period: "01 September 2026 - 28 Februari 2027",
    order: 20,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Anchor Handling Tug Supply Vessel Operational Safety Study",
      id: "Studi Keselamatan Operasional Kapal Anchor Handling Tug Supply",
    },
    executingEntity: "Marine Engineering Division",
    client: "PT Pertamina",
    period: "15 Oktober 2026 - 31 Maret 2027",
    order: 21,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Port Container Terminal Automation Risk Assessment",
      id: "Penilaian Risiko Otomatisasi Terminal Kontainer Pelabuhan",
    },
    executingEntity: "ITS Laboratory",
    client: "PT Pelabuhan Indonesia",
    period: "01 November 2026 - 30 April 2027",
    order: 22,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Maritime Cybersecurity Risk Framework for Connected Ship Systems",
      id: "Kerangka Risiko Keamanan Siber Maritim untuk Sistem Kapal Terhubung",
    },
    executingEntity: "Naval Architecture Team",
    client: "Port Authority",
    period: "15 Desember 2026 - 31 Mei 2027",
    order: 23,
    published: true,
  },
  {
    yearGroup: "2025",
    title: {
      en: "Floating Storage and Offloading Unit Safety Case Development",
      id: "Pengembangan Kasus Keselamatan Unit Penyimpanan dan Pemrosesan Terapung",
    },
    executingEntity: "Offshore Systems Research Group",
    client: "SKK Migas",
    period: "01 Januari 2027 - 30 Juni 2027",
    order: 24,
    published: true,
  },

  // ── 2026 (20) ──
  {
    yearGroup: "2026",
    title: {
      en: "Next-Generation Maritime Autonomous Surface Ship Safety Framework",
      id: "Kerangka Keselamatan Kapal Permukaan Otonom Maritim Generasi Berikutnya",
    },
    executingEntity: "ITS Laboratory",
    client: "Direktorat Jenderal Perhubungan Laut",
    period: "01 Januari 2026 - 30 Juni 2026",
    order: 0,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "Green Hydrogen Production Facility Safety Assessment for Marine Applications",
      id: "Penilaian Keselamatan Fasilitas Produksi Hidrogen Hijau untuk Aplikasi Maritim",
    },
    executingEntity: "RAMS Laboratory",
    client: "PT Energi Maritim",
    period: "15 Februari 2026 - 31 Juli 2026",
    order: 1,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "Deepwater Offshore Structure Design Optimization for Extreme Sea States",
      id: "Optimasi Desain Struktur Lepas Pantai Perairan Dalam untuk Kondisi Laut Ekstrem",
    },
    executingEntity: "Naval Architecture Team",
    client: "SKK Migas",
    period: "01 Maret 2026 - 31 Agustus 2026",
    order: 2,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "Smart Port Infrastructure Monitoring Using Edge Computing and IoT",
      id: "Monitoring Infrastruktur Pelabuhan Cerdas Menggunakan Edge Computing dan IoT",
    },
    executingEntity: "Marine Engineering Division",
    client: "PT Pelabuhan Indonesia",
    period: "15 April 2026 - 30 September 2026",
    order: 3,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "Multi-Hazard Risk Assessment for Integrated Maritime Energy Hubs",
      id: "Penilaian Risiko Multi-Bahaya untuk Hub Energi Maritim Terintegrasi",
    },
    executingEntity: "Maritime Safety Research Group",
    client: "PT Pertamina",
    period: "01 Mei 2026 - 31 Oktober 2026",
    order: 4,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "Ship Autonomous Decision-Making System Reliability Under Uncertainty",
      id: "Keandalan Sistem Pengambilan Keputusan Otonom Kapal di Bawah Ketidakpastian",
    },
    executingEntity: "Reliability Engineering Team",
    client: "PT Pelayaran Nusantara",
    period: "15 Juni 2026 - 30 November 2026",
    order: 5,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "Floating Solar Panel Structural Integrity for Coastal Marina Applications",
      id: "Integritas Struktur Panel Surya Terapung untuk Aplikasi Marina Pesisir",
    },
    executingEntity: "Offshore Systems Research Group",
    client: "PT PLN (Persero)",
    period: "01 Juli 2026 - 31 Desember 2026",
    order: 6,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "Maritime Supply Chain Disruption Prediction Using Machine Learning",
      id: "Prediksi Gangguan Rantai Pasok Maritim Menggunakan Pembelajaran Mesin",
    },
    executingEntity: "ITS Laboratory",
    client: "PT Pelabuhan Indonesia",
    period: "15 Agustus 2026 - 31 Januari 2027",
    order: 7,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "Biofouling Management Strategy for Marine Hull Efficiency Optimization",
      id: "Strategi Manajemen Biofouling untuk Optimasi Efisiensi Hull Maritim",
    },
    executingEntity: "RAMS Laboratory",
    client: "PT Pelayaran Nusantara",
    period: "01 September 2026 - 28 Februari 2027",
    order: 8,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "Offshore Wind Farm Installation Vessel Safety Protocol",
      id: "Protokol Keselamatan Kapal Instalasi Farm Angin Lepas Pantai",
    },
    executingEntity: "Marine Engineering Division",
    client: "PT Indonesia Power",
    period: "15 Oktober 2026 - 31 Maret 2027",
    order: 9,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "Port Carbon Footprint Reduction Through Operational Process Optimization",
      id: "Pengurangan Jejak Karbon Pelabuhan Melalui Optimasi Proses Operasional",
    },
    executingEntity: "Maritime Safety Research Group",
    client: "PT Pelabuhan Indonesia",
    period: "01 November 2026 - 30 April 2027",
    order: 10,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "Subsea Robotics Reliability for Deepwater Inspection and Maintenance",
      id: "Keandalan Robotika Bawah Laut untuk Inspeksi dan Pemeliharaan Perairan Dalam",
    },
    executingEntity: "Offshore Systems Research Group",
    client: "SKK Migas",
    period: "15 Desember 2026 - 31 Mei 2027",
    order: 11,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "Maritime Incident Investigation Data Analytics Platform Development",
      id: "Pengembangan Platform Analitik Data Investigasi Insiden Maritim",
    },
    executingEntity: "Naval Architecture Team",
    client: "Direktorat Jenderal Perhubungan Laut",
    period: "01 Januari 2027 - 30 Juni 2027",
    order: 12,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "LNG Carrier Cargo System Integrity Assessment Under Cryogenic Conditions",
      id: "Penilaian Integritas Sistem Kargo LNG Carrier di Bawah Kondisi Kriogenik",
    },
    executingEntity: "Reliability Engineering Team",
    client: "PT Energi Maritim",
    period: "15 Februari 2027 - 31 Juli 2027",
    order: 13,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "Smart Navigation Aid System Reliability for Coastal Waterway Management",
      id: "Keandalan Sistem Alat Bantu Navigasi Cerdas untuk Manajemen Perairan Pesisir",
    },
    executingEntity: "ITS Laboratory",
    client: "Port Authority",
    period: "01 Maret 2027 - 31 Agustus 2027",
    order: 14,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "Marine Biodiversity Impact Assessment for Offshore Construction Activities",
      id: "Penilaian Dampak Keanekaragaman Hayati Maritim untuk Aktivitas Konstruksi Lepas Pantai",
    },
    executingEntity: "RAMS Laboratory",
    client: "PT Pertamina",
    period: "15 April 2027 - 30 September 2027",
    order: 15,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "Fleet Performance Optimization Through Integrated Data Analytics",
      id: "Optimasi Kinerja Armada Melalui Analitik Data Terintegrasi",
    },
    executingEntity: "Marine Engineering Division",
    client: "PT Pelayaran Nusantara",
    period: "01 Mei 2027 - 31 Oktober 2027",
    order: 16,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "Offshore Decommissioning Risk and Environmental Impact Study",
      id: "Studi Risiko dan Dampak Lingkungan Pemadaman Lepas Pantai",
    },
    executingEntity: "Offshore Systems Research Group",
    client: "SKK Migas",
    period: "15 Juni 2027 - 30 November 2027",
    order: 17,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "Coastal Erosion Mitigation Through Engineered Reef Systems for Port Protection",
      id: "Mitigasi Erosi Pesisir Melalui Sistem Terumbu Rekayasa untuk Perlindungan Pelabuhan",
    },
    executingEntity: "Naval Architecture Team",
    client: "PT Pelabuhan Indonesia",
    period: "01 Juli 2027 - 31 Desember 2027",
    order: 18,
    published: true,
  },
  {
    yearGroup: "2026",
    title: {
      en: "Maritime Workforce Safety Training Effectiveness Evaluation Using Simulation-Based Assessment",
      id: "Evaluasi Efektivitas Pelatihan Keselamatan Tenaga Kerja Maritim Menggunakan Penilaian Berbasis Simulasi",
    },
    executingEntity: "Maritime Safety Research Group",
    client: "Direktorat Jenderal Perhubungan Laut",
    period: "15 Agustus 2027 - 31 Januari 2028",
    order: 19,
    published: true,
  },
];

// ─── VIDEO DATA ──────────────────────────────────────────────────────────────

const demoVideos: {
  youtubeUrl: string;
  title: string | null;
  isFeatured: boolean;
  order: number;
  published: boolean;
}[] = [
  {
    youtubeUrl: "https://youtu.be/SzDMDHOd1Oc?si=FuXgzjFin7dMVE8e",
    title: "RAMS Laboratory Introduction",
    isFeatured: true,
    order: 0,
    published: true,
  },
  {
    youtubeUrl: "https://youtu.be/XPZQYl3BHuM?si=MmzHs7kklqZMLXzd",
    title: "RAMS Laboratory Research Overview",
    isFeatured: false,
    order: 1,
    published: true,
  },
  {
    youtubeUrl: "https://youtu.be/dgd6Wn_nOJg?si=UL2NHubOoN6WhyiO",
    title: "RAMS Laboratory Activities",
    isFeatured: false,
    order: 2,
    published: true,
  },
  {
    youtubeUrl: "https://youtu.be/9ry3kKPBAyg?si=Xs7yaTH4WYidJnZu",
    title: "RAMS Laboratory Featured Video",
    isFeatured: false,
    order: 3,
    published: true,
  },
];

// ─── SEED FUNCTIONS ──────────────────────────────────────────────────────────

function pick<T>(arr: T[], count: number, start: number): T[] {
  return Array.from({ length: count }, (_, i) => arr[(start + i) % arr.length]);
}

function seedDemoPublicationsData() {
  return demoPublications.map((pub, index) => {
    const types = PUBLICATION_TYPES;
    return {
      title: pub.title,
      authors: pub.authors,
      year: pub.year,
      journal: pub.journal,
      doi: pub.doi,
      pdfUrl: pub.pdfUrl,
      topics: pub.topics,
      methods: pub.methods,
      publicationType: types[index % types.length],
      normalizedTitle: normalizePublicationTitle(pub.title),
    };
  });
}

async function seedPublications() {
  await connectDatabase();
  await createPublicationIndexes();
  const collection = getPublicationsCollection();
  const now = new Date();
  const data = seedDemoPublicationsData();

  const result = await collection.bulkWrite(
    data.map((pub) => ({
      updateOne: {
        filter: pub.doi
          ? { doi: normalizeDoi(pub.doi) }
          : {
              normalizedTitle: normalizePublicationTitle(pub.title),
              year: pub.year,
              doi: null,
            },
        update: {
          $setOnInsert: {
            ...pub,
            doi: normalizeDoi(pub.doi),
            pdfUrl: pub.pdfUrl || null,
            normalizedTitle: normalizePublicationTitle(pub.title),
            createdAt: now,
            updatedAt: now,
          },
        },
        upsert: true,
      },
    })),
  );

  const inserted = result.upsertedCount;
  const matched = result.matchedCount;
  console.log(
    `✅ Publications: ${inserted} inserted, ${matched} already existed (${data.length} total processed)`,
  );
}

async function seedPublicServiceProjects() {
  await connectDatabase();
  await createPublicServiceIndexes();
  const collection = getPublicServiceProjectsCollection();
  const now = new Date();

  const result = await collection.bulkWrite(
    demoPublicServiceProjects.map((project) => ({
      updateOne: {
        filter: {
          yearGroup: project.yearGroup,
          "title.en": project.title.en,
        },
        update: {
          $setOnInsert: {
            ...project,
            createdAt: now,
            updatedAt: now,
          },
        },
        upsert: true,
      },
    })),
  );

  const inserted = result.upsertedCount;
  const matched = result.matchedCount;
  console.log(
    `✅ Public Service Projects: ${inserted} inserted, ${matched} already existed (${demoPublicServiceProjects.length} total processed)`,
  );
}

async function seedVideos() {
  await connectDatabase();
  const collection = getVideosCollection();
  const now = new Date();

  const result = await collection.bulkWrite(
    demoVideos.map((video) => {
      const videoId = extractYouTubeVideoId(video.youtubeUrl);
      if (!videoId)
        throw new Error(
          `Invalid YouTube URL in seed data: ${video.youtubeUrl}`,
        );
      return {
        updateOne: {
          filter: { youtubeVideoId: videoId },
          update: {
            $setOnInsert: {
              youtubeUrl: video.youtubeUrl,
              youtubeVideoId: videoId,
              title: video.title,
              thumbnailUrl: null,
              isFeatured: video.isFeatured,
              order: video.order,
              published: video.published,
              createdAt: now,
              updatedAt: now,
            },
          },
          upsert: true,
        },
      };
    }),
  );

  const inserted = result.upsertedCount;
  const matched = result.matchedCount;
  console.log(
    `✅ Videos: ${inserted} inserted, ${matched} already existed (${demoVideos.length} total processed)`,
  );
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Refusing to seed demo data in production");
    process.exit(1);
  }

  await seedPublications();
  await seedPublicServiceProjects();
  await seedVideos();
  console.log("\n✅ Demo data seeding complete");
}

if (basename(process.argv[1] ?? "") === "seed-demo-data.ts") {
  main().catch((error) => {
    console.error("❌ Failed to seed demo data:", error);
    process.exit(1);
  });
}
