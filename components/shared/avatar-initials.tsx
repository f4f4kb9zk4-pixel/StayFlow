import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, getInitials, getAvatarColorVar } from "@/lib/utils";

const SIZE_CLASSES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
};

interface AvatarInitialsProps {
  name: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

/**
 * Initials avatar with a deterministic color derived from the name (§1.4),
 * pulled from the active theme's chart palette so it adapts to white-label
 * branding automatically.
 */
export function AvatarInitials({ name, size = "sm", className }: AvatarInitialsProps) {
  return (
    <Avatar className={cn(SIZE_CLASSES[size], className)}>
      <AvatarFallback
        style={{ backgroundColor: getAvatarColorVar(name), color: "var(--navy)" }}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
