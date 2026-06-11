import { ClipboardList, ListChecks, Building2 } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/use-current-user";
import { getActiveHandover, getHandoverHistory } from "@/lib/data/handover";
import { getHotelStaff } from "@/lib/data/staff";
import { canEdit } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewHandoverDialog } from "@/components/handover/new-handover-dialog";
import { CloseHandoverButton } from "@/components/handover/close-handover-button";
import { FollowupChecklist } from "@/components/handover/followup-checklist";
import { formatDateTime } from "@/lib/utils";
import type { ShiftHandover } from "@/types/domain";

export const metadata = {
  title: "Shift Handover — StayFlow",
};

/**
 * Shift Handover module (§1.7, §3.2 item 4) — current active handover with
 * open cases / follow-ups / department updates, plus a history of past
 * handovers.
 */
export default async function HandoverPage() {
  const user = await getCurrentUser();
  const hotelId = user.currentHotel.id;
  const timezone = user.currentHotel.timezone;

  const [active, history, staff] = await Promise.all([
    getActiveHandover(hotelId),
    getHandoverHistory(hotelId),
    getHotelStaff(hotelId),
  ]);

  const canManage = canEdit(user.currentRole, "handover");

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <PageHeader
        title="Shift Handover"
        subtitle="Pass open items and notes between shifts."
        actions={canManage ? <NewHandoverDialog staff={staff} /> : undefined}
      />

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {!active && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No active handover. {canManage && "Start one to pass notes to the next shift."}
              </CardContent>
            </Card>
          )}
          {active && (
            <HandoverDetail handover={active} timezone={timezone} canManage={canManage} />
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {history.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No past handovers yet.
              </CardContent>
            </Card>
          )}
          {history.map((handover) => (
            <HandoverDetail key={handover.id} handover={handover} timezone={timezone} canManage={false} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HandoverDetail({
  handover,
  timezone,
  canManage,
}: {
  handover: ShiftHandover;
  timezone: string;
  canManage: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-data">{handover.handoverNumber}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {handover.shift} shift · {formatDateTime(handover.handoverTime, timezone)}
          </p>
        </div>
        <StatusBadge status={handover.status} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {handover.fromUser?.fullName ?? "—"} → {handover.toUser?.fullName ?? "Unassigned"}
          </span>
          {handover.status === "Active" && canManage && (
            <CloseHandoverButton handoverId={handover.id} />
          )}
        </div>

        {handover.notes && <p className="text-sm border-l-2 border-gold-border pl-3">{handover.notes}</p>}

        <section className="space-y-1.5">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5 text-primary" />
            Open cases / incidents
          </h4>
          {handover.openCases.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : (
            <ul className="text-sm list-disc list-inside space-y-0.5">
              {handover.openCases.map((c) => (
                <li key={c.id}>{c.referenceLabel}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-1.5">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5 text-primary" />
            Follow-ups
          </h4>
          <FollowupChecklist followups={handover.followups} timezone={timezone} />
        </section>

        <section className="space-y-1.5">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            Department updates
          </h4>
          {handover.departmentUpdates.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {handover.departmentUpdates.map((d) => (
                <li key={d.id}>
                  <span className="font-medium">{d.department}:</span> {d.updateText}
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
