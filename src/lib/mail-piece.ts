/**
 * Mail-piece field helpers.
 *
 * Mail-piece-specific fields are stored in a dedicated notes block on a
 * BackstageDeliverable:
 *   notes_blocks[i].title === MAIL_PIECE_BLOCK_TITLE
 *   notes_blocks[i].content = JSON.stringify(MailPieceData)
 *
 * The rest of the deliverable (name, status, due_to_client) is used as-is.
 */

export const MAIL_PIECE_BLOCK_TITLE = "mail_piece";

export type MailPieceStatus =
  | "DRAFT"
  | "DESIGN"
  | "APPROVED"
  | "PRINTING"
  | "SCHEDULED"
  | "DROPPED"
  | "HOLD"
  | "CANCELLED";

export const MAIL_PIECE_STATUSES: MailPieceStatus[] = [
  "DRAFT",
  "DESIGN",
  "APPROVED",
  "PRINTING",
  "SCHEDULED",
  "DROPPED",
  "HOLD",
  "CANCELLED",
];

export interface MailPieceData {
  pieceNumber?: number;
  universe?: string;
  units?: number;
  size?: string;
  unitCost?: number;
  totalCost?: number;
  designer?: string;
  printStatus?: string;
  invoiced?: boolean;
  orderLabel?: string;
  mailStatus?: MailPieceStatus;
}

/**
 * Extract MailPieceData from a deliverable's notes_blocks.
 * Returns sensible defaults when the block is absent or malformed.
 */
export function parseMailPieceData(
  notesBlocks?: Array<{ title?: string; content?: string }>,
): MailPieceData {
  if (!notesBlocks) return {};
  const block = notesBlocks.find(
    (b) => b.title?.trim() === MAIL_PIECE_BLOCK_TITLE,
  );
  if (!block?.content) return {};
  try {
    const parsed = JSON.parse(block.content);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as MailPieceData;
    }
  } catch {
    // malformed JSON — return empty
  }
  return {};
}

/**
 * Serialize MailPieceData back into a notes_blocks array, replacing any
 * existing mail_piece block while preserving all other blocks.
 */
export function serializeMailPieceData(
  existingBlocks: Array<{ title?: string; content?: string }> | undefined,
  data: MailPieceData,
): Array<{ title: string; content: string }> {
  const others = (existingBlocks ?? []).filter(
    (b) => b.title?.trim() !== MAIL_PIECE_BLOCK_TITLE,
  );
  return [
    ...others.map((b) => ({ title: b.title ?? "", content: b.content ?? "" })),
    { title: MAIL_PIECE_BLOCK_TITLE, content: JSON.stringify(data) },
  ];
}

/** Format a decimal number as currency. */
export function fmtCurrency(value?: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

/** Format a plain number with commas. */
export function fmtNumber(value?: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString("en-US");
}
