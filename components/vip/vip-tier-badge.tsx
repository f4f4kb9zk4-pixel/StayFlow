import { Badge } from "@/components/ui/badge";
import type { VipTier } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * Raw Opera VIP code → accent color, so the Tier column reflects each
 * guest's actual VIP level at a glance instead of a single gold tone.
 * VIP1/VIP2/VIP3/VIP4/VIPL are per the hotel's VIP code legend; the rest
 * are reasonable defaults that can be adjusted later without touching this
 * component's styling.
 */
const VIP_CODE_COLORS: Record<string, string> = {
  VIP1: "#ef4444", // red
  VIP2: "#d4af37", // gold
  VIP3: "#3b82f6", // blue
  VIP4: "#06b6d4", // cyan
  VIP5: "#a855f7", // purple
  VIP6: "#f97316", // orange
  VIP7: "#ec4899", // pink
  VIPL: "#22c55e", // green
  VIPR: "#6b7280", // gray
  VVIP: "#18181b", // near-black
};

/**
 * VIP tier pill (§3.2 item 6). When a raw Opera VIP code (e.g. "VIP1",
 * "VIPR", "VVIP") is available, it's shown — with a star — in the color for
 * that code from `VIP_CODE_COLORS`. Tiers without a recognized code fall
 * back to the gold "vip" badge (VIP/VVIP) or a muted "Standard" pill.
 */
export function VipTierBadge({ tier, code }: { tier: VipTier; code?: string | null }) {
  if (tier === "Standard" && !code) {
    return <Badge variant="muted">Standard</Badge>;
  }

  const color = code ? VIP_CODE_COLORS[code] : undefined;
  if (color) {
    return (
      <Badge
        variant="outline"
        className={cn("border", tier === "VVIP" && "font-semibold")}
        style={{
          borderColor: `${color}4d`,
          backgroundColor: `${color}26`,
          color,
        }}
      >
        <span aria-hidden>★</span>
        {code}
      </Badge>
    );
  }

  return (
    <Badge variant="vip" className={cn(tier === "VVIP" && "font-semibold")}>
      <span aria-hidden>★</span>
      {code ?? tier}
    </Badge>
  );
}
