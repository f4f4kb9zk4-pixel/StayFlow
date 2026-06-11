"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { INCIDENT_CATEGORIES } from "@/types/domain";
import { SearchInput } from "@/components/shared/search-input";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = ["All", "Pending", "In Progress", "Escalated", "Resolved", "Closed"] as const;

/**
 * Incident Tracker filter row (§1.7, §3.2 item 9): status pills, category
 * dropdown pills, and free-text search by title/incident number/room.
 */
export function IncidentFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const activeStatus = searchParams.get("status") ?? "All";
  const activeCategory = searchParams.get("category") ?? "All";

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("incident");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setParam("status", filter === "All" ? null : filter)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors border",
                activeStatus === filter
                  ? "bg-gold-dim text-primary border-gold-border"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
        <SearchInput
          placeholder="Search title, guest, room, incident #…"
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => setParam("q", e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(["All", ...INCIDENT_CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setParam("category", cat === "All" ? null : cat)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors border",
              activeCategory === cat
                ? "bg-gold-dim text-primary border-gold-border"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
