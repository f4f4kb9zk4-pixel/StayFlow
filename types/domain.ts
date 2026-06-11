/**
 * Shared domain enums & types — mirror the Postgres enums defined in
 * supabase/migrations/0001_init.sql. Keep these in sync with the database;
 * once Supabase is provisioned, `types/database.types.ts` becomes the
 * source of truth and these can be re-derived from it (`Database["public"]["Enums"]`).
 */

export type PriorityLevel = "low" | "medium" | "high" | "critical";

export const PRIORITY_LEVELS: PriorityLevel[] = [
  "low",
  "medium",
  "high",
  "critical",
];

export type Department =
  | "Front Office"
  | "Housekeeping"
  | "Engineering"
  | "F&B"
  | "Security"
  | "Concierge"
  | "Finance";

export const DEPARTMENTS: Department[] = [
  "Front Office",
  "Housekeeping",
  "Engineering",
  "F&B",
  "Security",
  "Concierge",
  "Finance",
];

export type VipTier = "Standard" | "VIP" | "VVIP";

export const VIP_TIERS: VipTier[] = ["Standard", "VIP", "VVIP"];

/** Raw Opera VIP codes — see VIP_CODE_COLORS in vip-tier-badge.tsx for the colors. */
export const VIP_CODES: string[] = [
  "VIP1",
  "VIP2",
  "VIP3",
  "VIP4",
  "VIP5",
  "VIP6",
  "VIP7",
  "VIPL",
  "VIPR",
  "VVIP",
];

export type FollowupStatus = "Pending" | "Completed" | "Overdue";

export type EscalationStatus = "Open" | "Acknowledged" | "Resolved";

export type TaskColumn =
  | "New"
  | "Assigned"
  | "In Progress"
  | "Waiting"
  | "Completed";

export const TASK_COLUMNS: TaskColumn[] = [
  "New",
  "Assigned",
  "In Progress",
  "Waiting",
  "Completed",
];

export const TASK_TAGS = [
  "Urgent",
  "Overdue",
  "VIP",
  "Blocked",
  "Evening",
  "Aesthetic",
  "Maintenance",
] as const;

export type TaskTag = (typeof TASK_TAGS)[number];

export type ShiftType = "Morning" | "Afternoon" | "Evening" | "Night";

export const SHIFT_TYPES: ShiftType[] = ["Morning", "Afternoon", "Evening", "Night"];

export type HandoverStatus = "Active" | "Closed";

export type ArrivalStatus = "Confirmed" | "En Route" | "Flight Delayed" | "Arrived";

export const ARRIVAL_STATUSES: ArrivalStatus[] = [
  "Confirmed",
  "En Route",
  "Flight Delayed",
  "Arrived",
];

export type IncidentCategory =
  | "Security"
  | "Guest Complaint"
  | "Maintenance"
  | "F&B";

export const INCIDENT_CATEGORIES: IncidentCategory[] = [
  "Security",
  "Guest Complaint",
  "Maintenance",
  "F&B",
];

export type IncidentStatus =
  | "Pending"
  | "In Progress"
  | "Escalated"
  | "Resolved"
  | "Closed";

export const INCIDENT_STATUSES: IncidentStatus[] = [
  "Pending",
  "In Progress",
  "Escalated",
  "Resolved",
  "Closed",
];

export type NotificationType =
  | "escalation"
  | "task"
  | "complaint"
  | "followup"
  | "alert"
  | "vip";

export type UserRole =
  | "super_admin"
  | "general_manager"
  | "duty_manager"
  | "front_office"
  | "housekeeping"
  | "engineering"
  | "fnb"
  | "security"
  | "concierge"
  | "staff";

/**
 * Convenience domain models — shaped after the relational tables but
 * flattened/joined for UI consumption (e.g. assignee name resolved from
 * profiles). Server Actions / data-access functions in lib/actions/* should
 * return data already shaped like this.
 */

export interface Profile {
  id: string;
  fullName: string;
  avatarColor?: string | null;
  role?: UserRole;
  department?: Department | null;
}

export interface Task {
  id: string;
  taskNumber: string;
  hotelId: string;
  title: string;
  room?: string | null;
  department: Department;
  priority: PriorityLevel;
  columnStatus: TaskColumn;
  assignee?: Profile | null;
  dueAt?: string | null;
  position: number;
  tags: TaskTag[];
}

export interface ShiftHandover {
  id: string;
  handoverNumber: string;
  hotelId: string;
  shift: ShiftType;
  shiftDate: string;
  fromUser?: Profile | null;
  toUser?: Profile | null;
  handoverTime: string;
  notes?: string | null;
  status: HandoverStatus;
  openCases: { id: string; referenceLabel: string }[];
  followups: {
    id: string;
    task: string;
    dueAt?: string | null;
    department?: Department | null;
    completed: boolean;
  }[];
  departmentUpdates: { id: string; department: Department; updateText: string }[];
}

export interface Arrival {
  id: string;
  arrivalNumber: string;
  hotelId: string;
  guestName: string;
  nationality?: string | null;
  room?: string | null;
  eta?: string | null;
  flightNumber?: string | null;
  transferType?: string | null;
  vipTier: VipTier;
  vipGuestId?: string | null;
  roomReady: boolean;
  specialRequests?: string | null;
  status: ArrivalStatus;
  arrivalDate: string;
  /** §PMS import — departure date from the Opera "Arrivals: Detailed" report. */
  departureDate?: string | null;
  /** §PMS import — PMS room type code, e.g. "LXOCK". */
  roomType?: string | null;
  /** §PMS import — PMS confirmation number, used to dedupe re-imports. */
  confirmationNumber?: string | null;
  /** §PMS import — length of stay in nights. */
  nights?: number | null;
  /** §PMS import — number of adults on the reservation. */
  adults?: number | null;
  /** §PMS import — combined Reservation/Profile/General notes + traces. */
  pmsNotes?: string | null;
  /** Flag marking this arrival for VIP attention — auto-set on PDF import from PMS notes keywords, toggleable by staff. */
  vipArrival: boolean;
  /** §PMS import — short bulleted summary of important info auto-extracted from pmsNotes. */
  notesSummary?: string | null;
}

export interface Incident {
  id: string;
  incidentNumber: string;
  hotelId: string;
  category: IncidentCategory;
  title: string;
  room?: string | null;
  department?: Department | null;
  priority: PriorityLevel;
  status: IncidentStatus;
  assignedTo?: Profile | null;
  reportedAt: string;
  recoveryAction?: string | null;
  resolution?: string | null;
  /** §Guest Feedback import — guest name(s) from the report. */
  guestName?: string | null;
  /** §Guest Feedback import — booking source, e.g. "CHR.COM", a travel agent. */
  source?: string | null;
  /** §Guest Feedback import — finer-grained case subtype. */
  caseSubtype?: string | null;
  /** §Guest Feedback import — full guest complaint details. */
  details?: string | null;
  /** §Guest Feedback import — service recovery / compensation cost. */
  cost?: number | null;
  /** §Guest Feedback import — currency for `cost`, e.g. "THB". */
  currency?: string | null;
  /** §Guest Feedback import — staff member who logged the case. */
  loggedBy?: string | null;
  /** §Guest Feedback import — "Period of stay" / "Nationality" lines. */
  guestNotes?: string | null;
  /** §Guest Feedback import — raw "Department Concerned" text, e.g. "S&M , FB". */
  departmentRaw?: string | null;
  /** Period of stay, e.g. "10 Jun - 12 Jun 2026" — report export field. */
  periodOfStay?: string | null;
  /** Guest nationality, e.g. "Thai" — report export field. */
  nationality?: string | null;
  /** Finer-grained location within the hotel (e.g. "Lobby", "Pool deck"), distinct from `room` — report export field. */
  location?: string | null;
}

export interface IncidentEvent {
  id: string;
  incidentId: string;
  occurredAt: string;
  message: string;
  createdBy?: Profile | null;
}

export interface FollowUp {
  id: string;
  hotelId: string;
  description: string;
  department?: Department | null;
  dueAt?: string | null;
  status: FollowupStatus;
  assignee?: Profile | null;
  sourceTable?: string | null;
  sourceId?: string | null;
}

export interface Escalation {
  id: string;
  hotelId: string;
  sourceTable: string;
  sourceId: string;
  escalatedBy?: Profile | null;
  escalatedToRole?: UserRole | null;
  escalatedToUser?: Profile | null;
  reason?: string | null;
  status: EscalationStatus;
  escalatedAt: string;
}

export interface VipGuest {
  id: string;
  hotelId: string;
  guestName: string;
  vipTier: VipTier;
  /** Raw Opera VIP code from a PMS import, e.g. "VIP1".."VIP7", "VIPL", "VIPR", "VVIP". Null for manually-added guests. */
  vipCode?: string | null;
  room?: string | null;
  stayStart?: string | null;
  stayEnd?: string | null;
  preferences?: string | null;
  notes?: string | null;
  /** Flag marking this VIP guest as currently in-house, separate from the stay_start/stay_end window. */
  vipInhouse: boolean;
}

export interface AppNotification {
  id: string;
  hotelId: string;
  recipientId?: string | null;
  recipientRole?: UserRole | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  department?: Department | null;
  priority?: PriorityLevel | null;
  sourceTable?: string | null;
  sourceId?: string | null;
  read: boolean;
  lineDeliveryStatus?: string | null;
  createdAt: string;
}

export interface HotelBranding {
  hotelId: string;
  productName: string;
  tagline: string;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  faviconUrl?: string | null;
  dashboardWelcomeImageUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  sidebarColor: string;
  fontFamilySans: string;
  fontFamilyMono: string;
  borderRadius: string;
  iconStyle: "lucide-default" | "rounded" | "sharp";
  backgroundStyle: "solid" | "subtle-gradient" | "pattern";
  defaultThemeMode: "dark" | "light";
  allowUserModeToggle: boolean;
}
