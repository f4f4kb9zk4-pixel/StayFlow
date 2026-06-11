import Link from "next/link";

import type { VipGuest } from "@/types/domain";
import { VipTierBadge } from "@/components/vip/vip-tier-badge";
import { VipInhouseCheckbox } from "@/components/vip/vip-inhouse-checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, nightsBetween, cn } from "@/lib/utils";

interface VipGuestListProps {
  guests: VipGuest[];
  selectedId?: string;
  /** href builder preserving current filter query params */
  buildHref: (vipGuestId: string) => string;
}

/**
 * VIP Guest Tracking list (§3.2 item 6) — table on desktop with columns
 * Guest, Tier, Room, Stay dates, Preferences; stacked cards on mobile.
 * Selecting a row opens the detail drawer.
 */
export function VipGuestList({ guests, selectedId, buildHref }: VipGuestListProps) {
  if (guests.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
        No VIP guests match your filters.
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
              <TableHead>Guest</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Stay</TableHead>
              <TableHead>Nights</TableHead>
              <TableHead>In-house</TableHead>
              <TableHead>Preferences</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guests.map((g) => {
              const nights = nightsBetween(g.stayStart, g.stayEnd);
              return (
                <TableRow
                  key={g.id}
                  className={cn("cursor-pointer", selectedId === g.id && "bg-gold-dim/40")}
                  data-href={buildHref(g.id)}
                >
                  <TableCell className="font-medium">
                    <Link href={buildHref(g.id)} className="block">
                      {g.guestName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={buildHref(g.id)} className="flex items-center gap-1.5">
                      <VipTierBadge tier={g.vipTier} code={g.vipCode} />
                    </Link>
                  </TableCell>
                  <TableCell className="font-data">
                    <Link href={buildHref(g.id)} className="block">
                      {g.room ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="font-data text-muted-foreground">
                    <Link href={buildHref(g.id)} className="block">
                      {g.stayStart && g.stayEnd
                        ? `${formatDate(g.stayStart)} – ${formatDate(g.stayEnd)}`
                        : "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="font-data text-muted-foreground">
                    <Link href={buildHref(g.id)} className="block">
                      {nights !== null ? `${nights} night${nights === 1 ? "" : "s"}` : "—"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <VipInhouseCheckbox vipGuestId={g.id} vipInhouse={g.vipInhouse} />
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <Link href={buildHref(g.id)} className="block truncate text-muted-foreground">
                      {g.preferences ?? "—"}
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {guests.map((g) => {
          const nights = nightsBetween(g.stayStart, g.stayEnd);
          return (
            <Link
              key={g.id}
              href={buildHref(g.id)}
              className={cn(
                "block rounded-lg border border-border p-3 space-y-2",
                selectedId === g.id && "border-gold-border bg-gold-dim/40"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{g.guestName}</span>
                <div className="flex items-center gap-1.5">
                  <VipTierBadge tier={g.vipTier} code={g.vipCode} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-data">
                {g.room && `Room ${g.room}`}
                {g.room && g.stayStart && g.stayEnd && " · "}
                {g.stayStart && g.stayEnd && `${formatDate(g.stayStart)} – ${formatDate(g.stayEnd)}`}
                {nights !== null && ` · ${nights} night${nights === 1 ? "" : "s"}`}
              </p>
              {g.preferences && <p className="text-xs text-muted-foreground truncate">{g.preferences}</p>}
              <VipInhouseCheckbox vipGuestId={g.id} vipInhouse={g.vipInhouse} />
            </Link>
          );
        })}
      </div>
    </>
  );
}
