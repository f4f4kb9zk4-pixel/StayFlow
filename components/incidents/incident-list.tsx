import Link from "next/link";

import type { Incident } from "@/types/domain";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { AvatarInitials } from "@/components/shared/avatar-initials";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, cn } from "@/lib/utils";

interface IncidentListProps {
  incidents: Incident[];
  selectedId?: string;
  /** href builder preserving current filter query params */
  buildHref: (incidentId: string) => string;
  timezone: string;
}

/**
 * Incident Tracker list (§1.7, §3.2 item 9) — table on desktop with columns
 * Incident ID, Title, Category, Room, Priority, Department, Assignee,
 * Status, Reported; stacked cards on mobile.
 */
export function IncidentList({ incidents, selectedId, buildHref, timezone }: IncidentListProps) {
  if (incidents.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
        No incidents match your filters.
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Incident ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reported</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.map((i) => (
              <TableRow
                key={i.id}
                className={cn("cursor-pointer", selectedId === i.id && "bg-gold-dim/40")}
                data-href={buildHref(i.id)}
              >
                <TableCell className="font-data">
                  <Link href={buildHref(i.id)} className="block">
                    {i.incidentNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={buildHref(i.id)} className="block">
                    {i.title}
                    {i.guestName && (
                      <span className="block text-xs text-muted-foreground truncate">{i.guestName}</span>
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={buildHref(i.id)} className="block">
                    <Badge variant="outline">{i.category}</Badge>
                  </Link>
                </TableCell>
                <TableCell className="font-data">
                  <Link href={buildHref(i.id)} className="block">
                    {i.room ?? "—"}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={buildHref(i.id)} className="block">
                    <PriorityBadge priority={i.priority} />
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={buildHref(i.id)} className="block">
                    {i.department ?? "—"}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={buildHref(i.id)} className="flex items-center gap-2">
                    {i.assignedTo ? (
                      <>
                        <AvatarInitials name={i.assignedTo.fullName} size="xs" />
                        <span className="truncate">{i.assignedTo.fullName}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={buildHref(i.id)} className="block">
                    <StatusBadge status={i.status} />
                  </Link>
                </TableCell>
                <TableCell className="font-data text-muted-foreground">
                  <Link href={buildHref(i.id)} className="block">
                    {formatDateTime(i.reportedAt, timezone)}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {incidents.map((i) => (
          <Link
            key={i.id}
            href={buildHref(i.id)}
            className={cn(
              "block rounded-lg border border-border p-3 space-y-2",
              selectedId === i.id && "border-gold-border bg-gold-dim/40"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-data text-sm font-medium">{i.incidentNumber}</span>
              <StatusBadge status={i.status} />
            </div>
            <p className="text-sm font-medium">
              {i.title}
              {i.room && <span className="text-muted-foreground"> · Room {i.room}</span>}
            </p>
            {i.guestName && <p className="text-xs text-muted-foreground truncate">{i.guestName}</p>}
            <div className="flex items-center gap-1.5">
              <Badge variant="outline">{i.category}</Badge>
              {i.department && <span className="text-xs text-muted-foreground">{i.department}</span>}
            </div>
            <div className="flex items-center justify-between">
              <PriorityBadge priority={i.priority} />
              {i.assignedTo ? (
                <AvatarInitials name={i.assignedTo.fullName} size="xs" />
              ) : (
                <span className="text-xs text-muted-foreground">Unassigned</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
