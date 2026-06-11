import type { Arrival } from "@/types/domain";
import { VipTierBadge } from "@/components/vip/vip-tier-badge";
import { ArrivalStatusSelect } from "@/components/arrivals/arrival-status-select";
import { RoomReadyCheckbox } from "@/components/arrivals/room-ready-checkbox";
import { VipArrivalCheckbox } from "@/components/arrivals/vip-arrival-checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ArrivalListProps {
  arrivals: Arrival[];
}

/** Renders a Postgres `time` value (HH:MM:SS) as HH:MM, 24h. */
function formatEta(eta: string | null | undefined): string {
  if (!eta) return "—";
  return eta.slice(0, 5);
}

/** Renders room type + length of stay from a PMS import, e.g. "LXOCK · 3 nights". */
function formatStay(roomType: string | null | undefined, nights: number | null | undefined): string {
  const parts: string[] = [];
  if (roomType) parts.push(roomType);
  if (nights != null) parts.push(`${nights} night${nights === 1 ? "" : "s"}`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

/**
 * Arrival & VIP Board list (§1.7, §3.2 item 7) — table on desktop with
 * columns Guest+nationality, Room, Stay, ETA, Flight, Transfer, VIP tier,
 * Room Ready, Special Requests, Status; stacked cards on mobile.
 * PMS-imported reservations (§3.2 item 7 PDF import) additionally surface
 * room type, length of stay, and Conf. No.
 */
export function ArrivalList({ arrivals }: ArrivalListProps) {
  if (arrivals.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
        No arrivals match your filters.
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden lg:block rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Stay</TableHead>
              <TableHead>ETA</TableHead>
              <TableHead>Flight</TableHead>
              <TableHead>Transfer</TableHead>
              <TableHead>VIP</TableHead>
              <TableHead>Room Ready</TableHead>
              <TableHead>Special Requests</TableHead>
              <TableHead>Notes summary</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {arrivals.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <div className="font-medium">{a.guestName}</div>
                  {a.nationality && <div className="text-xs text-muted-foreground">{a.nationality}</div>}
                  {a.confirmationNumber && (
                    <div className="text-xs text-muted-foreground font-data">Conf. {a.confirmationNumber}</div>
                  )}
                </TableCell>
                <TableCell className="font-data">{a.room ?? "—"}</TableCell>
                <TableCell className="font-data text-xs">{formatStay(a.roomType, a.nights)}</TableCell>
                <TableCell className="font-data">{formatEta(a.eta)}</TableCell>
                <TableCell className="font-data">{a.flightNumber ?? "—"}</TableCell>
                <TableCell>{a.transferType ?? "—"}</TableCell>
                <TableCell className="space-y-1.5">
                  <VipTierBadge tier={a.vipTier} />
                  <VipArrivalCheckbox arrivalId={a.id} vipArrival={a.vipArrival} />
                </TableCell>
                <TableCell>
                  <RoomReadyCheckbox arrivalId={a.id} roomReady={a.roomReady} />
                </TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {a.specialRequests ?? "—"}
                </TableCell>
                <TableCell className="max-w-xs">
                  {a.notesSummary ? (
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">
                      {a.notesSummary}
                    </p>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <ArrivalStatusSelect arrivalId={a.id} status={a.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile / tablet cards */}
      <div className="lg:hidden space-y-2">
        {arrivals.map((a) => (
          <div key={a.id} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{a.guestName}</p>
                {a.nationality && <p className="text-xs text-muted-foreground">{a.nationality}</p>}
                {a.confirmationNumber && (
                  <p className="text-xs text-muted-foreground font-data">Conf. {a.confirmationNumber}</p>
                )}
              </div>
              <VipTierBadge tier={a.vipTier} />
            </div>
            <p className="text-xs text-muted-foreground font-data">
              {a.room && `Room ${a.room}`}
              {a.room && " · "}
              ETA {formatEta(a.eta)}
              {a.flightNumber && ` · ${a.flightNumber}`}
              {a.transferType && ` · ${a.transferType}`}
              {(a.roomType || a.nights != null) && ` · ${formatStay(a.roomType, a.nights)}`}
            </p>
            {a.specialRequests && <p className="text-xs text-muted-foreground">{a.specialRequests}</p>}
            {a.notesSummary ? (
              <p className="text-xs text-muted-foreground whitespace-pre-line">{a.notesSummary}</p>
            ) : (
              a.pmsNotes && (
                <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">{a.pmsNotes}</p>
              )
            )}
            <div className="flex items-center justify-between gap-2 pt-1">
              <RoomReadyCheckbox arrivalId={a.id} roomReady={a.roomReady} />
              <ArrivalStatusSelect arrivalId={a.id} status={a.status} />
            </div>
            <VipArrivalCheckbox arrivalId={a.id} vipArrival={a.vipArrival} />
          </div>
        ))}
      </div>
    </>
  );
}
