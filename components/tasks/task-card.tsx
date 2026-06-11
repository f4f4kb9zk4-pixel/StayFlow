"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, MapPin } from "lucide-react";

import type { Task } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { AvatarInitials } from "@/components/shared/avatar-initials";
import { cn, formatTime } from "@/lib/utils";

const TAG_VARIANT: Record<string, "danger" | "warning" | "vip" | "muted" | "info"> = {
  Urgent: "danger",
  Overdue: "danger",
  VIP: "vip",
  Blocked: "warning",
  Evening: "info",
  Aesthetic: "muted",
  Maintenance: "muted",
};

interface TaskCardProps {
  task: Task;
  timezone: string;
}

/**
 * Task Board kanban card (§1.7) — sortable via dnd-kit, shows title, room,
 * priority, department, tags, assignee, and due time.
 */
export function TaskCard({ task, timezone }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "rounded-lg border border-border bg-card p-3 space-y-2 shadow-sm cursor-grab active:cursor-grabbing touch-none",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        <span className="text-xs text-muted-foreground font-data shrink-0">{task.taskNumber}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={task.priority} />
        <Badge variant="outline">{task.department}</Badge>
        {task.tags.map((tag) => (
          <Badge key={tag} variant={TAG_VARIANT[tag] ?? "muted"}>
            {tag}
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-data">
          {task.room && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {task.room}
            </span>
          )}
          {task.dueAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(task.dueAt, timezone)}
            </span>
          )}
        </div>
        {task.assignee && <AvatarInitials name={task.assignee.fullName} size="xs" />}
      </div>
    </div>
  );
}
