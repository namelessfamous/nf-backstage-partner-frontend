export interface Partner {
  id: string;
  slug: string;
  name: string;
  description?: string;
  website?: string;
  created_at: string;
  members?: PartnerUser[];
}

export interface PartnerUser {
  id: string;
  email: string;
  name?: string;
  sub_role: "owner" | "admin" | "editor" | "viewer";
}

export interface Client {
  id: string;
  slug: string;
  name: string;
  description?: string;
  website?: string;
  partner?: string | null;
  partner_name?: string;
  client_type?: string;
  /** Free-form client metadata (niche, tags, etc.) from the backstage API. */
  meta?: Record<string, unknown>;
  /** Brand config blob; may also carry a `niche` hint. */
  brand_info?: Record<string, unknown>;
  created_at: string;
}

export type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "archived";

export interface Project {
  id: string;
  slug: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  client?: string | null;
  client_name?: string;
  client_slug?: string;
  is_top_level?: boolean;
  created_at: string;
  updated_at: string;
}

export type DeliverableStatus =
  | "not_started"
  | "in_progress"
  | "in_review"
  | "delivered"
  | "cancelled";

export interface Deliverable {
  id: string;
  title: string;
  description?: string;
  status: DeliverableStatus;
  due_date?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

/** Real backstage deliverable shape — /api/v1/deliverables/ (ProjectDeliverableSerializer) */
export type BackstageDeliverableStatus =
  | "pending"
  | "in_progress"
  | "review"
  | "approved"
  | "delivered";

export interface DeliverableFileMeta {
  allow_download?: boolean;
  view_template?: string;
  [key: string]: unknown;
}

export interface DeliverableFile {
  id: string;
  name: string;
  url: string | null;
  mime_type?: string | null;
  size?: number | null;
  meta?: DeliverableFileMeta;
}

export interface DeliverableMilestone {
  label?: string;
  date?: string;
  note?: string;
  done?: boolean;
}

export interface DeliverableNotesBlock {
  title?: string;
  content?: string;
}

export interface BackstageDeliverable {
  id: string;
  project: string;
  project_name?: string;
  project_slug?: string;
  client_id?: string | null;
  client_name?: string;
  task?: string | null;
  task_name?: string;
  name: string;
  deliverable_type?: "creative" | "strategy" | string;
  status: BackstageDeliverableStatus | string;
  content_md?: string;
  dropbox_url?: string;
  google_drive_url?: string;
  youtube_url?: string;
  file_details?: DeliverableFile[];
  notes_blocks?: DeliverableNotesBlock[];
  notes?: string;
  milestones?: DeliverableMilestone[];
  due_to_client?: string | null;
  due_date?: string | null;
  delivered_to_client?: string | null;
  approved_by_client?: string | null;
  delivered?: string | null;
  completed?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectNote {
  id: string;
  content: string;
  author?: string;
  author_name?: string;
  created_at: string;
}

export interface ProjectDetail extends Project {
  deliverables?: Deliverable[];
  notes?: ProjectNote[];
  subprojects?: Project[];
  memberships?: ProjectMembership[];
}

export interface ProjectMembership {
  id: string;
  user: string;
  user_name?: string;
  user_email?: string;
  role: string;
}

export interface ClientDetail extends Client {
  projects?: Project[];
  members?: ClientUser[];
}

export interface ClientUser {
  id: string;
  email: string;
  name?: string;
  role: string;
}

// ── Proposals ───────────────────────────────────────────────────────────────
// Mirrors apps.proposals serializers on the backstage API.
//   Proposal → versions[] → sections[] → line_items[]

export type ProposalStatus =
  | "proposal.draft"
  | "proposal.ready"
  | "proposal.revision_request"
  | "proposal.approved"
  | "proposal.void"
  | "proposal.cancelled";

export interface ProposalLineItem {
  id: string;
  section: string;
  description: string;
  quantity: string; // DecimalField serialized as string
  unit: string;
  unit_cost: string;
  total: string;
  notes: string;
  order: number;
  approved: boolean;
}

export interface ProposalSection {
  id: string;
  version: string;
  name: string;
  order: number;
  subtotal: string;
  line_items: ProposalLineItem[];
}

export interface ProposalVersion {
  id: string;
  proposal: string;
  name: string;
  order: number;
  total: string;
  is_approved: boolean;
  sections: ProposalSection[];
}

/** List shape — GET /api/v1/proposals/ (ProposalListSerializer) */
export interface ProposalListItem {
  id: string;
  name: string;
  client?: string | null;
  client_name?: string;
  project?: string | null;
  project_name?: string;
  lead?: string | null;
  lead_name?: string;
  status: ProposalStatus | string;
  version_count: number;
  created_at: string;
}

/** Detail shape — GET /api/v1/proposals/<id>/ (ProposalSerializer) */
export interface ProposalDetail {
  id: string;
  client?: string | null;
  client_name?: string;
  project?: string | null;
  project_name?: string;
  lead?: string | null;
  lead_name?: string;
  name: string;
  status: ProposalStatus | string;
  notes: string;
  versions: ProposalVersion[];
  version_count: number;
  share_enabled: boolean;
  share_password: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

// ── Brands / Brand Guide ─────────────────────────────────────────────────────
// Mirrors apps.brands serializers on the backstage API.
//   Brand → typography[] + colors{role → { base, tones, contrast }}

export type BrandFontType = "heading" | "subheading" | "body" | "accent" | string;

export interface BrandFont {
  type: BrandFontType;
  family: string;
  source?: "google" | "adobe" | "custom" | string;
  weight?: string;
  style?: string;
  variable?: boolean;
  variable_options?: { weight_range?: string } | null;
  google_import_url?: string | null;
  adobe_project_id?: string | null;
}

export interface BrandColorRole {
  base: string;
  tones?: Record<string, string>;
  contrast?: Record<string, string>;
}

export type BrandColors = Record<string, BrandColorRole>;

/** A named logo package attached to a brand, with converted deliverables. */
export interface BrandLogoPackage {
  id: string;
  brand: string;
  name: string;
  notes?: string;
  source_file_url?: string | null;
  source_format?: string;
  /** pending | processing | ready | error */
  status: string;
  error?: string;
  /** map of format key (svg/png/jpg/pdf/eps/ai) -> download URL */
  outputs: Record<string, string>;
  created_at: string;
  updated_at: string;
}

/** List shape — GET /api/v1/brands/ (BrandListSerializer) */
export interface BrandListItem {
  id: string;
  name: string;
  slug: string;
  client?: string | null;
  client_name?: string;
  logo_url?: string;
  tagline?: string;
  created_at: string;
}

/** Detail shape — GET /api/v1/brands/<id>/ or /by-slug/<slug>/ (BrandSerializer) */
export interface BrandDetail {
  id: string;
  name: string;
  slug: string;
  typography: BrandFont[];
  colors: BrandColors;
  logo_url?: string;
  tagline?: string;
  brand_voice?: string;
  meta?: Record<string, unknown>;
  client?: string | null;
  client_name?: string;
  logo_packages?: BrandLogoPackage[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}
