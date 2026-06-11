"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { DEPARTMENTS } from "@/types/domain";
import { cn } from "@/lib/utils";

const FILTERS = ["All", ...DEPARTMENTS] as const;

/**
 * Task Board department filter (§1.7) — pill row that updates the
 * `?department=` search param so the board (server component) re-fetches.
 */
export function DepartmentFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const active = searchParams.get("department") ?? "All";

  function setDepartment(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "All") {
      params.delete("department");
    } else {
      params.set("department", value);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {FILTERS.map((filter) => (
        <button
          key={filter}
          onClick={() => setDepartment(filter)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors border",
            active === filter
              ? "bg-gold-dim text-primary border-gold-border"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
