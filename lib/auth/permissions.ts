import type { UserRole, Department } from "@/types/domain";

/**
 * Role → permission map (§2.6). This is the initial cut and should be
 * confirmed with stakeholders before RLS write-policies are finalized
 * (see open question #8 in the architecture plan).
 */

export type ModuleKey =
  | "dashboard"
  | "tasks"
  | "handover"
  | "arrivals"
  | "incidents"
  | "notifications"
  | "settings";

export type AccessLevel = "none" | "view" | "own_dept" | "full";

const PERMISSIONS: Record<UserRole, Record<ModuleKey, AccessLevel>> = {
  super_admin: {
    dashboard: "full",
    tasks: "full",
    handover: "full",
    arrivals: "full",
    incidents: "full",
    notifications: "full",
    settings: "full",
  },
  general_manager: {
    dashboard: "full",
    tasks: "full",
    handover: "full",
    arrivals: "full",
    incidents: "full",
    notifications: "full",
    settings: "full",
  },
  duty_manager: {
    dashboard: "full",
    tasks: "full",
    handover: "full",
    arrivals: "full",
    incidents: "full",
    notifications: "full",
    settings: "own_dept",
  },
  front_office: {
    dashboard: "view",
    tasks: "own_dept",
    handover: "view",
    arrivals: "full",
    incidents: "own_dept",
    notifications: "view",
    settings: "none",
  },
  housekeeping: {
    dashboard: "view",
    tasks: "own_dept",
    handover: "view",
    arrivals: "view",
    incidents: "own_dept",
    notifications: "view",
    settings: "none",
  },
  engineering: {
    dashboard: "view",
    tasks: "own_dept",
    handover: "view",
    arrivals: "view",
    incidents: "own_dept",
    notifications: "view",
    settings: "none",
  },
  fnb: {
    dashboard: "view",
    tasks: "own_dept",
    handover: "view",
    arrivals: "view",
    incidents: "own_dept",
    notifications: "view",
    settings: "none",
  },
  security: {
    dashboard: "view",
    tasks: "own_dept",
    handover: "view",
    arrivals: "view",
    incidents: "own_dept",
    notifications: "view",
    settings: "none",
  },
  concierge: {
    dashboard: "view",
    tasks: "own_dept",
    handover: "view",
    arrivals: "view",
    incidents: "own_dept",
    notifications: "view",
    settings: "none",
  },
  staff: {
    dashboard: "view",
    tasks: "own_dept",
    handover: "view",
    arrivals: "view",
    incidents: "view",
    notifications: "view",
    settings: "none",
  },
};

export function getAccess(role: UserRole, module: ModuleKey): AccessLevel {
  return PERMISSIONS[role]?.[module] ?? "none";
}

export function canAccess(role: UserRole, module: ModuleKey): boolean {
  return getAccess(role, module) !== "none";
}

export function canEdit(role: UserRole, module: ModuleKey): boolean {
  const level = getAccess(role, module);
  return level === "full" || level === "own_dept";
}

/** Whether a user with `role`/`department` can act on an item belonging to `itemDept` */
export function canActOnDepartment(
  role: UserRole,
  module: ModuleKey,
  userDept: Department | null | undefined,
  itemDept: Department | null | undefined
): boolean {
  const level = getAccess(role, module);
  if (level === "full") return true;
  if (level === "own_dept") return !itemDept || itemDept === userDept;
  return false;
}

/**
 * Role → label + nav visibility. Used by components/layout/sidebar.tsx and
 * the mobile bottom-tab bar to filter nav items per §1.6 / §3.4.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  general_manager: "General Manager",
  duty_manager: "Duty Manager",
  front_office: "Front Office",
  housekeeping: "Housekeeping",
  engineering: "Engineering",
  fnb: "F&B",
  security: "Security",
  concierge: "Concierge",
  staff: "Staff",
};

/** Roles assignable from the "Add user" form — Super Admin must be granted separately. */
export const ASSIGNABLE_ROLES: UserRole[] = [
  "general_manager",
  "duty_manager",
  "front_office",
  "housekeeping",
  "engineering",
  "fnb",
  "security",
  "concierge",
  "staff",
];
