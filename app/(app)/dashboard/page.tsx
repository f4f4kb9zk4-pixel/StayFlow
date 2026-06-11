import Link from "next/link";
import {
  ArrowRight,
  ArrowLeftRight,
  ClipboardList,
  KanbanSquare,
  Bell as BellIcon,
  DoorOpen,
  Star,
  Wrench,
  ShieldAlert,
  Plus,
} from "lucide-react";

import { getCurrentUser } from "@/lib/auth/use-current-user";
import {
  getOperationalAlerts,
  getOpenIncidents,
  getMyTasks,
  getPendingFollowUps,
  getActiveHandover,
  getDashboardCounts,
} from "@/lib/data/dashboard";
import { getArrivalStats } from "@/lib/data/arrivals";
import { getHotelStaff } from "@/lib/data/staff";
import { PageHeader } from "@/components/shared/page-header";
import { AlertBanner } from "@/components/shared/alert-banner";
import { StatCard } from "@/components/shared/stat-card";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { AvatarInitials } from "@/components/shared/avatar-initials";
import { AddFollowUpDialog } from "@/components/shared/add-followup-dialog";
import { FollowUpCheckbox } from "@/components/shared/followup-checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Dashboard — StayFlow",
};

/**
 * Dashboard Action Center (§0.1, §3.2 item 5) — KPI strip (Arrivals Today,
 * VIP Arrivals, Open Guest Cases, Pending Follow-Ups), Operational Alerts,
 * Open Guest Cases, Task Assignments, Pending Follow-Ups, Shift Handover
 * summary, and a Quick Actions row. This is the post-login landing page for
 * all roles.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  const hotelId = user.currentHotel.id;

  const [alerts, cases, tasks, followUps, handover, staff, counts, arrivalStats] = await Promise.all([
    getOperationalAlerts(hotelId),
    getOpenIncidents(hotelId),
    getMyTasks(hotelId, user.id, user.currentDepartment),
    getPendingFollowUps(hotelId),
    getActiveHandover(hotelId),
    getHotelStaff(hotelId),
    getDashboardCounts(hotelId, user.id, user.currentDepartment),
    getArrivalStats(hotelId),
  ]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={`Welcome back, ${user.profile.fullName.split(" ")[0]}`}
        subtitle={`${user.currentHotel.name} · ${formatDateTime(new Date(), user.currentHotel.timezone)}`}
        actions={
          <Button asChild size="sm">
            <Link href="/incidents">
              <Plus className="h-3.5 w-3.5" />
              New Case
            </Link>
          </Button>
        }
      />

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Arrivals Today"
          value={arrivalStats.total}
          sub={`${arrivalStats.arrived} arrived${arrivalStats.delayed > 0 ? ` · ${arrivalStats.delayed} delayed` : ""}`}
          icon={DoorOpen}
          variant="gold"
        />
        <StatCard
          label="VIP Arrivals"
          value={arrivalStats.vvip + arrivalStats.vip}
          sub={`${arrivalStats.vvip} VVIP · ${arrivalStats.vip} VIP`}
          icon={Star}
          variant="gold"
        />
        <StatCard
          label="Open Cases & Incidents"
          value={counts.openCases}
          sub={`${counts.openCases === 1 ? "item needs" : "items need"} attention`}
          icon={ClipboardList}
          variant={counts.openCases > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Pending Follow-Ups"
          value={counts.pendingFollowUps}
          sub={`${counts.myTasks} ${counts.myTasks === 1 ? "task" : "tasks"} on your board`}
          icon={BellIcon}
          variant={counts.pendingFollowUps > 0 ? "warning" : "default"}
        />
      </section>

      {/* Operational Alerts */}
      {alerts.length > 0 && (
        <section className="space-y-2">
          {alerts.map((alert) => (
            <AlertBanner
              key={alert.id}
              variant={alert.status === "Open" ? "danger" : "warning"}
              title={alert.reason ?? `Escalation on ${alert.sourceTable}`}
              description={
                alert.escalatedToRole
                  ? `Escalated to ${alert.escalatedToRole.replace("_", " ")} · ${formatDateTime(
                      alert.escalatedAt,
                      user.currentHotel.timezone
                    )}`
                  : formatDateTime(alert.escalatedAt, user.currentHotel.timezone)
              }
              action={<StatusBadge status={alert.status} />}
            />
          ))}
        </section>
      )}

      {/* Open Cases & Incidents */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" />
            Open Cases & Incidents
          </CardTitle>
          <Link href="/incidents" className="text-sm text-primary flex items-center gap-1 hover:underline">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {cases.length === 0 && <EmptyRow text="Nothing open right now." />}
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/incidents?incident=${c.id}`}
              className="flex items-center gap-3 rounded-md border border-border px-3 py-2 hover:bg-muted transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {c.incidentNumber}
                  {c.guestName && ` · ${c.guestName}`}
                  {c.room && <span className="text-muted-foreground"> · Room {c.room}</span>}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {c.title}
                  {c.department && ` · ${c.department}`}
                </p>
              </div>
              <PriorityBadge priority={c.priority} />
              <StatusBadge status={c.status} />
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Task Assignments */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <KanbanSquare className="h-4 w-4 text-primary" />
            Your Tasks
          </CardTitle>
          <Link href="/tasks" className="text-sm text-primary flex items-center gap-1 hover:underline">
            Open board <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.length === 0 && <EmptyRow text="No tasks assigned to you right now." />}
          {tasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {t.title}
                  {t.room && <span className="text-muted-foreground"> · Room {t.room}</span>}
                </p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {t.tags.map((tag) => (
                    <Badge key={tag} variant="muted" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <PriorityBadge priority={t.priority} />
              <StatusBadge status={t.columnStatus} />
              {t.assignee && <AvatarInitials name={t.assignee.fullName} size="xs" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pending Follow-Ups */}
      <Card id="followups">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <BellIcon className="h-4 w-4 text-primary" />
            Pending Follow-Ups
          </CardTitle>
          <AddFollowUpDialog staff={staff} triggerLabel="Add" />
        </CardHeader>
        <CardContent className="space-y-2">
          {followUps.length === 0 && <EmptyRow text="No follow-ups pending." />}
          {followUps.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
            >
              <FollowUpCheckbox id={f.id} completed={f.status === "Completed"} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.description}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {f.department ?? "General"}
                  {f.dueAt && ` · Due ${formatDateTime(f.dueAt, user.currentHotel.timezone)}`}
                </p>
              </div>
              <StatusBadge status={f.status} />
              {f.assignee && <AvatarInitials name={f.assignee.fullName} size="xs" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Shift Handover summary */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            Shift Handover
          </CardTitle>
          <Link href="/handover" className="text-sm text-primary flex items-center gap-1 hover:underline">
            View details <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {!handover && <EmptyRow text="No active shift handover." />}
          {handover && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {handover.shift} shift · {formatDateTime(handover.handoverTime, user.currentHotel.timezone)}
                </span>
                <StatusBadge status={handover.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {handover.openCases.length} open case{handover.openCases.length === 1 ? "" : "s"} ·{" "}
                {handover.followups.length} follow-up{handover.followups.length === 1 ? "" : "s"} ·{" "}
                {handover.departmentUpdates.length} dept update
                {handover.departmentUpdates.length === 1 ? "" : "s"}
              </p>
              {handover.notes && <p className="text-sm text-foreground">{handover.notes}</p>}
            </div>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/handover">Go to Shift Handover</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button asChild className="justify-center w-full">
              <Link href="/incidents">
                <ShieldAlert className="h-4 w-4" />
                Log Case / Incident
              </Link>
            </Button>
            <Button asChild variant="secondary" className="justify-center w-full">
              <Link href="/tasks">
                <KanbanSquare className="h-4 w-4" />
                Open Task Board
              </Link>
            </Button>
            <Button asChild variant="secondary" className="justify-center w-full">
              <Link href="/handover">
                <Wrench className="h-4 w-4" />
                Shift Handover
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-4 text-center">{text}</p>;
}
