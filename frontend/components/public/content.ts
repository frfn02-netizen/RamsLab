export type ResearchAreaCode = "RISK" | "AIS" | "RAM" | "RCM" | "DESIGN" | "SIM";
export const focusAreaKeys = ["reliability", "risk", "marine", "ais", "maintenance", "simulation"] as const;
export const timelineKeys = ["foundation", "collaboration", "recognition", "industry", "today"] as const;
export const maritimeApplicationKeys = ["offshore", "vessel", "port", "infrastructure"] as const;
export type MaritimeApplicationKey = (typeof maritimeApplicationKeys)[number];
