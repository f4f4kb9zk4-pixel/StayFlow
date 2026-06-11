"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import type { Task, TaskColumn } from "@/types/domain";
import { TASK_COLUMNS } from "@/types/domain";
import { moveTask } from "@/lib/actions/tasks";
import { TaskCard } from "@/components/tasks/task-card";
import { cn } from "@/lib/utils";

interface TaskBoardProps {
  tasks: Task[];
  timezone: string;
}

function groupByColumn(tasks: Task[]) {
  const groups = new Map<TaskColumn, Task[]>();
  for (const column of TASK_COLUMNS) groups.set(column, []);
  for (const task of tasks) {
    const list = groups.get(task.columnStatus) ?? [];
    list.push(task);
    groups.set(task.columnStatus, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.position - b.position);
  }
  return groups;
}

/**
 * Task Board (§1.7) — 5-column kanban with dnd-kit drag-and-drop. Maintains
 * optimistic local ordering and persists moves via the `moveTask` action.
 */
export function TaskBoard({ tasks, timezone }: TaskBoardProps) {
  const [items, setItems] = useState(tasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const columns = groupByColumn(items);

  function findTask(id: string) {
    return items.find((t) => t.id === id) ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(findTask(String(event.active.id)));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    setItems((current) => {
      const activeTask = current.find((t) => t.id === activeId);
      if (!activeTask) return current;

      const overTask = current.find((t) => t.id === overId);
      const overColumn = overTask ? overTask.columnStatus : (overId as TaskColumn);

      if (!TASK_COLUMNS.includes(overColumn as TaskColumn) && !overTask) return current;

      if (activeTask.columnStatus === overColumn && overTask) {
        // Reorder within the same column
        const columnItems = current.filter((t) => t.columnStatus === overColumn);
        const oldIndex = columnItems.findIndex((t) => t.id === activeId);
        const newIndex = columnItems.findIndex((t) => t.id === overId);
        if (oldIndex === newIndex) return current;

        const reordered = [...columnItems];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);

        const others = current.filter((t) => t.columnStatus !== overColumn);
        return [...others, ...reordered];
      }

      // Move to a different column
      return current.map((t) =>
        t.id === activeId ? { ...t, columnStatus: overColumn as TaskColumn } : t
      );
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active } = event;
    setActiveTask(null);

    const moved = items.find((t) => t.id === String(active.id));
    if (!moved) return;

    const columnItems = items
      .filter((t) => t.columnStatus === moved.columnStatus)
      .sort((a, b) => a.position - b.position);
    const newPosition = columnItems.findIndex((t) => t.id === moved.id);

    // Persist the move; recompute positions for the destination column.
    const updated = columnItems.map((t, index) => ({ ...t, position: index }));
    setItems((current) =>
      current.map((t) => updated.find((u) => u.id === t.id) ?? t)
    );

    void moveTask(moved.id, moved.columnStatus, Math.max(newPosition, 0));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5 md:items-start">
        {TASK_COLUMNS.map((column) => (
          <BoardColumn key={column} column={column} tasks={columns.get(column) ?? []} timezone={timezone} />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} timezone={timezone} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumn({ column, tasks, timezone }: { column: TaskColumn; tasks: Task[]; timezone: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: column });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border bg-secondary/30 p-2 min-h-[120px]",
        isOver && "ring-1 ring-gold-border"
      )}
    >
      <div className="flex items-center justify-between px-1 pt-1">
        <h3 className="text-sm font-semibold">{column}</h3>
        <span className="text-xs text-muted-foreground font-data">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} timezone={timezone} />
          ))}
          {tasks.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No tasks</p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
