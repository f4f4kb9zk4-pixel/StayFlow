import { Suspense } from "react";

import { getCurrentUser } from "@/lib/auth/use-current-user";
import { getIncidents, getIncident, getIncidentEvents, type IncidentFilters } from "@/lib/data/incidents";
import { getHotelStaff } from "@/lib/data/staff";
import { PageHeader } from "@/components/shared/page-header";
import { IncidentFilterBar } from "@/components/incidents/incident-filter-bar";
import { IncidentList } from "@/components/incidents/incident-list";
import { IncidentDetailSheet } from "@/components/incidents/incident-detail-sheet";
import { NewIncidentDialog } from "@/components/incidents/new-incident-dialog";
import { ImportGuestFeedbackDialog } from "@/components/incidents/import-guest-feedback-dialog";
import { ExportGuestFeedbackDialog } from "@/components/incidents/export-guest-feedback-dialog";

export const metadata = {
  title: "Incidents — StayFlow",
};

interface IncidentsPageProps {
  searchParams: Promise<{ status?: string; category?: string; q?: string; incident?: string }>;
}

/**
 * Incident Tracker module (§1.7, §3.2 item 9) — searchable/filterable list
 * with a detail split-view drawer for status, assignment, recovery, and
 * escalation to the General Manager.
 */
export default async function IncidentsPage({ searchParams }: IncidentsPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const hotelId = user.currentHotel.id;

  const filters: IncidentFilters = {
    status: (params.status as IncidentFilters["status"]) ?? "All",
    category: (params.category as IncidentFilters["category"]) ?? "All",
    search: params.q,
  };

  const [incidents, staff, selectedIncident] = await Promise.all([
    getIncidents(hotelId, filters),
    getHotelStaff(hotelId),
    params.incident ? getIncident(hotelId, params.incident) : Promise.resolve(null),
  ]);

  const events = selectedIncident ? await getIncidentEvents(selectedIncident.id) : [];

  function buildHref(incidentId: string) {
    const sp = new URLSearchParams();
    if (params.status && params.status !== "All") sp.set("status", params.status);
    if (params.category && params.category !== "All") sp.set("category", params.category);
    if (params.q) sp.set("q", params.q);
    sp.set("incident", incidentId);
    return `/incidents?${sp.toString()}`;
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeader
        title="Incidents"
        subtitle="Log and track security, complaint, maintenance, and F&B incidents."
        actions={
          <div className="flex items-center gap-2">
            <ExportGuestFeedbackDialog timezone={user.currentHotel.timezone} />
            <ImportGuestFeedbackDialog />
            <NewIncidentDialog />
          </div>
        }
      />
      <Suspense>
        <IncidentFilterBar />
      </Suspense>
      <IncidentList
        incidents={incidents}
        selectedId={selectedIncident?.id}
        buildHref={buildHref}
        timezone={user.currentHotel.timezone}
      />
      <Suspense>
        <IncidentDetailSheet
          incident={selectedIncident}
          events={events}
          staff={staff}
          timezone={user.currentHotel.timezone}
        />
      </Suspense>
    </div>
  );
}
