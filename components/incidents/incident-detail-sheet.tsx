"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AlertTriangle, FileDown } from "lucide-react";

import type { Incident, IncidentEvent, IncidentStatus } from "@/types/domain";
import { DEPARTMENTS, INCIDENT_CATEGORIES, INCIDENT_STATUSES, PRIORITY_LEVELS } from "@/types/domain";
import type { StaffMember } from "@/lib/data/staff";
import {
  updateIncidentStatus,
  assignIncident,
  updateIncidentRecovery,
  updateIncidentGuestDetails,
  addIncidentNote,
  escalateIncident,
  exportIncidentReportPdf,
  type ActionState,
} from "@/lib/actions/incidents";
import { downloadBase64Pdf } from "@/lib/client/download-base64-pdf";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { AvatarInitials } from "@/components/shared/avatar-initials";
import { AddFollowUpDialog } from "@/components/shared/add-followup-dialog";
import { formatDateTime, toDatetimeLocalValue } from "@/lib/utils";

interface IncidentDetailSheetProps {
  incident: Incident | null;
  events: IncidentEvent[];
  staff: StaffMember[];
  timezone: string;
}

const initialState: ActionState = {};

/**
 * Incident Tracker detail drawer (§1.5 split-view, §1.7, §3.2 item 9) —
 * timeline, status & assignee controls, recovery/resolution fields, and a
 * dedicated "Escalate to GM" action.
 */
export function IncidentDetailSheet({ incident, events, staff, timezone }: IncidentDetailSheetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const open = !!incident;

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("incident");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" className="flex flex-col gap-4">
        {incident && <IncidentDetailBody incident={incident} events={events} staff={staff} timezone={timezone} />}
      </SheetContent>
    </Sheet>
  );
}

function IncidentDetailBody({
  incident,
  events,
  staff,
  timezone,
}: {
  incident: Incident;
  events: IncidentEvent[];
  staff: StaffMember[];
  timezone: string;
}) {
  const [, startTransition] = useTransition();
  const [escalating, setEscalating] = useState(false);
  const [status, setStatus] = useState<IncidentStatus>(incident.status);
  const [assigneeId, setAssigneeId] = useState<string>(incident.assignedTo?.id ?? "unassigned");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(incident.status);
    setAssigneeId(incident.assignedTo?.id ?? "unassigned");
  }, [incident.id, incident.status, incident.assignedTo?.id]);

  const [reportedDateValue, reportedTimeValue] = toDatetimeLocalValue(incident.reportedAt, timezone).split("T");

  const [recoveryState, recoveryAction, recoveryPending] = useActionState(updateIncidentRecovery, initialState);
  const [guestDetailsState, guestDetailsAction, guestDetailsPending] = useActionState(
    updateIncidentGuestDetails,
    initialState
  );
  const [noteState, noteAction, notePending] = useActionState(addIncidentNote, initialState);

  function onStatusChange(value: string) {
    const next = value as IncidentStatus;
    setStatus(next);
    startTransition(() => {
      updateIncidentStatus(incident.id, next);
    });
  }

  function onAssigneeChange(value: string) {
    setAssigneeId(value);
    startTransition(() => {
      assignIncident(incident.id, value === "unassigned" ? null : value);
    });
  }

  function onEscalate() {
    setEscalating(true);
    startTransition(() => {
      escalateIncident(incident.id).finally(() => {
        setEscalating(false);
        setStatus("Escalated");
      });
    });
  }

  async function onExportPdf() {
    setExporting(true);
    setExportError(null);
    try {
      const result = await exportIncidentReportPdf(incident.id);
      if ("error" in result) {
        setExportError(result.error);
        return;
      }
      downloadBase64Pdf(result.base64, result.filename);
    } catch {
      setExportError("Could not generate the report. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-data">{incident.incidentNumber}</SheetTitle>
        <SheetDescription>
          {incident.title}
          {incident.room && ` · Room ${incident.room}`}
        </SheetDescription>
      </SheetHeader>

      {/* Edit incident details — pulled in from an imported report and editable afterwards */}
      <form action={guestDetailsAction} className="grid grid-cols-3 gap-2">
        <input type="hidden" name="incidentId" value={incident.id} />
        <div className="col-span-3 space-y-1.5">
          <Label htmlFor="title" className="text-xs">Title</Label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={incident.title ?? ""}
            placeholder="e.g. Pool gate left unlocked overnight, Noise complaint"
            className="h-8 text-sm"
          />
        </div>
        <div className="col-span-3 space-y-1.5">
          <Label htmlFor="guestName" className="text-xs">Guest name</Label>
          <Input
            id="guestName"
            name="guestName"
            defaultValue={incident.guestName ?? ""}
            placeholder="e.g. Mr. Somchai"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="periodOfStay" className="text-xs">Period of stay</Label>
          <Input
            id="periodOfStay"
            name="periodOfStay"
            defaultValue={incident.periodOfStay ?? ""}
            placeholder="e.g. 10-12 Jun 2026"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nationality" className="text-xs">Nationality</Label>
          <Input
            id="nationality"
            name="nationality"
            defaultValue={incident.nationality ?? ""}
            placeholder="e.g. Thai"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location" className="text-xs">Location</Label>
          <Input
            id="location"
            name="location"
            defaultValue={incident.location ?? ""}
            placeholder="e.g. Lobby"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="room" className="text-xs">Room</Label>
          <Input
            id="room"
            name="room"
            defaultValue={incident.room ?? ""}
            placeholder="e.g. Pool deck"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category" className="text-xs">Category</Label>
          <Select name="category" defaultValue={incident.category}>
            <SelectTrigger id="category" className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INCIDENT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="department" className="text-xs">Department</Label>
          <Select name="department" defaultValue={incident.department ?? "none"}>
            <SelectTrigger id="department" className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="priority" className="text-xs">Priority</Label>
          <Select name="priority" defaultValue={incident.priority}>
            <SelectTrigger id="priority" className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_LEVELS.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="source" className="text-xs">Source</Label>
          <Input
            id="source"
            name="source"
            defaultValue={incident.source ?? ""}
            placeholder="e.g. Exotic Voyage Co.,Ltd., (Head Office)"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="caseSubtype" className="text-xs">Case subtype</Label>
          <Input
            id="caseSubtype"
            name="caseSubtype"
            defaultValue={incident.caseSubtype ?? ""}
            placeholder="e.g. Thai Set Menu"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loggedBy" className="text-xs">Logged by</Label>
          <Input
            id="loggedBy"
            name="loggedBy"
            defaultValue={incident.loggedBy ?? ""}
            placeholder="e.g. Michelle"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cost" className="text-xs">Cost</Label>
          <Input
            id="cost"
            name="cost"
            inputMode="decimal"
            defaultValue={incident.cost ?? ""}
            placeholder="e.g. 3000"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="currency" className="text-xs">Currency</Label>
          <Input
            id="currency"
            name="currency"
            defaultValue={incident.currency ?? ""}
            placeholder="e.g. THB"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="departmentRaw" className="text-xs">Dept. concerned</Label>
          <Input
            id="departmentRaw"
            name="departmentRaw"
            defaultValue={incident.departmentRaw ?? ""}
            placeholder="e.g. S&M, FB"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reportedDate" className="text-xs">Reported date</Label>
          <Input
            id="reportedDate"
            name="reportedDate"
            type="date"
            defaultValue={reportedDateValue}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reportedTime" className="text-xs">Reported time</Label>
          <Input
            id="reportedTime"
            name="reportedTime"
            type="time"
            defaultValue={reportedTimeValue}
            className="h-8 text-sm"
          />
        </div>
        <div className="col-span-3 space-y-1.5">
          <Label htmlFor="details" className="text-xs">Details</Label>
          <Textarea
            id="details"
            name="details"
            defaultValue={incident.details ?? ""}
            placeholder="Details extracted from the imported report…"
            rows={3}
            className="text-sm"
          />
        </div>
        <div className="col-span-3 flex items-center gap-2">
          <Button type="submit" size="sm" variant="secondary" disabled={guestDetailsPending}>
            {guestDetailsPending ? "Saving…" : "Save details"}
          </Button>
          {guestDetailsState?.error && <p className="text-sm text-danger">{guestDetailsState.error}</p>}
        </div>
      </form>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline">{incident.category}</Badge>
        <PriorityBadge priority={incident.priority} />
        <StatusBadge status={status} />
        <span className="text-xs text-muted-foreground font-data ml-auto">
          Reported {formatDateTime(incident.reportedAt, timezone)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AddFollowUpDialog
          staff={staff}
          sourceTable="incidents"
          sourceId={incident.id}
          defaultDepartment={incident.department}
          triggerLabel="Add follow-up"
        />
        <Button type="button" size="sm" variant="outline" onClick={onExportPdf} disabled={exporting}>
          <FileDown className="h-4 w-4" />
          {exporting ? "Generating…" : "Export PDF"}
        </Button>
        {status !== "Escalated" && (
          <Button type="button" size="sm" variant="danger" onClick={onEscalate} disabled={escalating}>
            <AlertTriangle className="h-4 w-4" />
            {escalating ? "Escalating…" : "Escalate to GM"}
          </Button>
        )}
      </div>
      {exportError && <p className="text-sm text-danger">{exportError}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INCIDENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Assignee</Label>
          <Select value={assigneeId} onValueChange={onAssigneeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {staff.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Recovery / resolution */}
      <form action={recoveryAction} className="space-y-3">
        <input type="hidden" name="incidentId" value={incident.id} />
        <div className="space-y-1.5">
          <Label htmlFor="recoveryAction">Recovery action</Label>
          <Textarea
            id="recoveryAction"
            name="recoveryAction"
            defaultValue={incident.recoveryAction ?? ""}
            placeholder="e.g. Gate re-secured, security briefed for night shift…"
            rows={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="resolution">Resolution notes</Label>
          <Textarea
            id="resolution"
            name="resolution"
            defaultValue={incident.resolution ?? ""}
            placeholder="Summarize how this incident was resolved…"
            rows={2}
          />
        </div>
        {recoveryState?.error && <p className="text-sm text-danger">{recoveryState.error}</p>}
        <Button type="submit" size="sm" disabled={recoveryPending}>
          {recoveryPending ? "Saving…" : "Save recovery details"}
        </Button>
      </form>

      <Separator />

      {/* Timeline */}
      <div className="flex-1 min-h-0 flex flex-col">
        <Label className="mb-2">Timeline</Label>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-64">
          {events.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
          {events.map((event) => (
            <div key={event.id} className="flex gap-2">
              <AvatarInitials name={event.createdBy?.fullName ?? "System"} size="xs" className="mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm">{event.message}</p>
                <p className="text-xs text-muted-foreground font-data">
                  {event.createdBy?.fullName ?? "System"} · {formatDateTime(event.occurredAt, timezone)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <form action={noteAction} className="mt-3 flex gap-2">
          <input type="hidden" name="incidentId" value={incident.id} />
          <Textarea name="message" placeholder="Add a note…" rows={1} className="min-h-[40px] flex-1" />
          <Button type="submit" size="sm" variant="secondary" disabled={notePending}>
            Add
          </Button>
        </form>
        {noteState?.error && <p className="text-sm text-danger mt-1">{noteState.error}</p>}
      </div>
    </>
  );
}
