import { Suspense } from "react";

import { getCurrentUser } from "@/lib/auth/use-current-user";
import { getTasks, type TaskFilters } from "@/lib/data/tasks";
import { getHotelStaff } from "@/lib/data/staff";
import { PageHeader } from "@/components/shared/page-header";
import { DepartmentFilter } from "@/components/tasks/department-filter";
import { TaskBoard } from "@/components/tasks/task-board";
import { NewTaskDialog } from "@/components/tasks/new-task-dialog";

export const metadata = {
  title: "Task Board — StayFlow",
};

interface TasksPageProps {
  searchParams: Promise<{ department?: string }>;
}

/**
 * Task Board module (§1.7, §3.2 item 3) — 5-column kanban with department
 * filtering and drag-and-drop reordering.
 */
export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const hotelId = user.currentHotel.id;

  const filters: TaskFilters = {
    department: (params.department as TaskFilters["department"]) ?? "All",
  };

  const [tasks, staff] = await Promise.all([
    getTasks(hotelId, filters),
    getHotelStaff(hotelId),
  ]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeader
        title="Task Board"
        subtitle="Track operational tasks across departments."
        actions={<NewTaskDialog staff={staff} />}
      />
      <Suspense>
        <DepartmentFilter />
      </Suspense>
      <TaskBoard tasks={tasks} timezone={user.currentHotel.timezone} />
    </div>
  );
}
