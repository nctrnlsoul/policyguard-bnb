// Shared visual tokens for the PolicyGuard UI, lifted verbatim from the locked
// design (PolicyGuard.dc.html). Kept as plain constants so the components can
// reproduce the design's inline styles faithfully.

export const ACCENT = "#F0B90B"; // BNB gold
export const INK = "#11151C";

export const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";
export const MONO = "'IBM Plex Mono', monospace";

export const GREEN = { dot: "#16A34A", text: "#15803D", bg: "#F1FAF4", border: "#D2EFDE" };
export const RED = { dot: "#E5484D", text: "#C2241F", bg: "#FEF1F0", border: "#F4C2BF" };
export const NEUTRAL = { dot: "#9AA1AC", text: "#5B626D", bg: "#F6F8F9", border: "#E6EAEE" };

// Per-chip verdict, derived from real on-chain reads in page.tsx.
export type ChipState = "pass" | "ok" | "fail" | "idle";

export type Chip = {
  label: string;
  state: ChipState;
};
