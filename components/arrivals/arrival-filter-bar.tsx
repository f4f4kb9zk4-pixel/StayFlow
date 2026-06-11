"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ARRIVAL_STATUSES } from "@/types/domain";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FILTERS = ["All", ...ARRIVAL_STATUSES] as const;

function todayDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

/**
 * Arrival & VIP Board filter row (§1.7): status pills, day navigation
 * (defaults to today), and free-text search by guest or room.
 */
export function ArrivalFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const activeFilter = searchParams.get("status") ?? "All";
  const date = searchParams.get("date") ?? todayDate();
  const isToday = date === todayDate();
  const vipOnly = searchParams.get("vipFlag") === "1";

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setParam("status", filter === "All" ? null : filter)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors border",
              activeFilter === filter
                ? "bg-gold-dim text-primary border-gold-border"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {filter}
          </button>
        ))}
        <button
          onClick={() => setParam("vipFlag", vipOnly ? null : "1")}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors border",
            vipOnly
              ? "bg-gold-dim text-primary border-gold-border"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          VIP arrival
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setParam("date", shiftDate(date, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-data min-w-20 text-center">{isToday ? "Today" : date}</span>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setParam("date", shiftDate(date, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <SearchInput
          placeholder="Search guest or room…"
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => setParam("q", e.target.value)}
        />
      </div>
    </div>
  );
}
