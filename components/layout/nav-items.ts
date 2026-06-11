import {
  LayoutDashboard,
  ClipboardList,
  KanbanSquare,
  ArrowLeftRight,
  PlaneLanding,
  ShieldAlert,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react";

import type { ModuleKey } from "@/lib/auth/permissions";

export interface NavItem {
  key: ModuleKey;
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Primary navigation (§1.6 sidebar). Order matches §3.2 build priority:
 * Dashboard, Task Board, Shift Handover, Arrivals & VIP, Incidents (which
 * now also covers Guest Cases — the two modules were merged into one table
 * and one page), Notifications, then Settings (admin only, filtered
 * separately).
 */
export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "incidents", label: "Cases & Incidents", href: "/incidents", icon: ShieldAlert },
  { key: "tasks", label: "Task Board", href: "/tasks", icon: KanbanSquare },
  { key: "handover", label: "Shift Handover", href: "/handover", icon: ArrowLeftRight },
  { key: "arrivals", label: "VIPs", href: "/arrivals", icon: PlaneLanding },
  { key: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
];

export const SETTINGS_ITEM: NavItem = {
  key: "settings",
  label: "Settings",
  href: "/settings",
  icon: Settings,
};

/**
 * Mobile bottom tab bar (§3.4) — 5 slots only. "Follow-Ups" surfaces the
 * cross-cutting follow_ups entity via the Dashboard's Pending Follow-Ups
 * block (no dedicated /follow-ups route in the IA), so it links to an
 * in-page anchor.
 */
export const MOBILE_TABS = [
  { key: "dashboard" as ModuleKey, label: "Alerts", href: "/dashboard", icon: LayoutDashboard },
  { key: "incidents" as ModuleKey, label: "Cases", href: "/incidents", icon: ClipboardList },
  { key: "tasks" as ModuleKey, label: "Tasks", href: "/tasks", icon: KanbanSquare },
  { key: "dashboard" as ModuleKey, label: "Follow-Ups", href: "/dashboard#followups", icon: Bell },
  { key: "handover" as ModuleKey, label: "Handover", href: "/handover", icon: ArrowLeftRight },
];
