"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { VIP_TIERS } from "@/types/domain";
import { SearchInput } from "@/components/shared/search-input";
import { cn } from "@/lib/utils";

const FILTERS = ["All", ...VIP_TIERS] as const;

/**
 * VIP guest filter row (§3.2 item 6): All / Standard / VIP / VVIP tier
 * pills + free-text search by guest name or room. Both update URL search
 * params so the list (server component) re-fetches with new filters.
 */
export function VipFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const activeFilter = searchParams.get("tier") ?? "All";
  const inhouseOnly = searchParams.get("inhouse") === "1";

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("vip");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setParam("tier", filter === "All" ? null : filter)}
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
          onClick={() => setParam("inhouse", inhouseOnly ? null : "1")}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors border",
            inhouseOnly
              ? "bg-gold-dim text-primary border-gold-border"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          In-house only
        </button>
      </div>
      <SearchInput
        placeholder="Search guest or room…"
        defaultValue={searchParams.get("vq") ?? ""}
        onChange={(e) => setParam("vq", e.target.value)}
      />
    </div>
  );
}
