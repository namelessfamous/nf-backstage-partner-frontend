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

export interface PaginatedResponse<T> {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}
