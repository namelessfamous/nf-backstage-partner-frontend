/**
 * Client-safe types + view metadata for the Political dashboard.
 *
 * Kept separate from `political.ts` (which imports server-only data helpers)
 * so client components can import these without dragging server code into the
 * browser bundle.
 */

export type PoliticalView = "walk" | "call" | "fundraising";

export const POLITICAL_VIEWS: PoliticalView[] = ["walk", "call", "fundraising"];

export const POLITICAL_VIEW_META: Record<
  PoliticalView,
  { label: string; blurb: string }
> = {
  walk: {
    label: "Walk",
    blurb: "Door-to-door canvass walk lists scoped to the active program.",
  },
  call: {
    label: "Call",
    blurb: "Phone-bank call lists scoped to the active program.",
  },
  fundraising: {
    label: "Fundraising",
    blurb: "Donor and fundraising lists scoped to the active program.",
  },
};

export interface PoliticalColumn {
  key: string;
  label: string;
}

export interface PoliticalFileRow {
  id: string;
  name: string;
  url: string | null;
  mime_type?: string | null;
  size?: number | null;
  view: PoliticalView;
  allowDownload: boolean;
  deliverableName: string;
  projectName?: string;
  clientName?: string;
  columns: PoliticalColumn[];
  cells: Record<string, string>;
  /** Raw file record, passed straight to the in-app file viewer. */
  file: import("@/types/api").DeliverableFile;
}
