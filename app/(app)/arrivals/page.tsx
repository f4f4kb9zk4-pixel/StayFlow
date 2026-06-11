import { Suspense } from "react";
import { PlaneLanding, Star, CheckCircle2, Clock } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/use-current-user";
import { canEdit } from "@/lib/auth/permissions";
import { getArrivals, getArrivalStats, type ArrivalFilters } from "@/lib/data/arrivals";
import { getVipGuests, getVipGuest, type VipGuestFilters } from "@/lib/data/vip-guests";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrivalFilterBar } from "@/components/arrivals/arrival-filter-bar";
import { ArrivalList } from "@/components/arrivals/arrival-list";
import { NewArrivalDialog } from "@/components/arrivals/new-arrival-dialog";
import { VipFilterBar } from "@/components/vip/vip-filter-bar";
import { VipGuestList } from "@/components/vip/vip-guest-list";
import { VipGuestDetailSheet } from "@/components/vip/vip-guest-detail-sheet";
import { NewVipGuestDialog } from "@/components/vip/new-vip-guest-dialog";
import { ImportPmsReportDialog } from "@/components/shared/import-pms-report-dialog";

export const metadata = {
  title: "Arrivals & VIP — StayFlow",
};

interface ArrivalsPageProps {
  searchParams: Promise<{
    status?: string;
    date?: string;
    q?: string;
    vipFlag?: string;
    tier?: string;
    vq?: string;
    vip?: string;
    inhouse?: string;
  }>;
}

function todayDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

/**
 * Arrival & VIP Board (§1.7, §3.2 item 7) — daily arrivals board with stat
 * tiles plus a VIP Guest Tracking tab (§3.2 item 6, cross-cutting
 * `vip_guests`).
 */
export default async function ArrivalsPage({ searchParams }: ArrivalsPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const hotelId = user.currentHotel.id;
  const canManage = canEdit(user.currentRole, "arrivals");

  const date = params.date ?? todayDate();

  const arrivalFilters: ArrivalFilters = {
    status: (params.status as ArrivalFilters["status"]) ?? "All",
    date,
    search: params.q,
    vipArrival: params.vipFlag === "1",
  };

  const vipFilters: VipGuestFilters = {
    tier: (params.tier as VipGuestFilters["tier"]) ?? "All",
    search: params.vq,
    inhouse: params.inhouse === "1",
  };

  const [arrivals, stats, vipGuests, selectedVipGuest] = await Promise.all([
    getArrivals(hotelId, arrivalFilters),
    getArrivalStats(hotelId, date),
    getVipGuests(hotelId, vipFilters),
    params.vip ? getVipGuest(hotelId, params.vip) : Promise.resolve(null),
  ]);

  function buildVipHref(vipGuestId: string) {
    const sp = new URLSearchParams();
    if (params.tier && params.tier !== "All") sp.set("tier", params.tier);
    if (params.vq) sp.set("vq", params.vq);
    if (params.inhouse === "1") sp.set("inhouse", "1");
    sp.set("vip", vipGuestId);
    return `/arrivals?${sp.toString()}`;
  }

  const activeTab = params.vip ? "vip" : "arrivals";

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeader
        title="VIPs"
        subtitle="Today's expected guests, room readiness, and the VIP guest list."
        actions={canManage && <ImportPmsReportDialog />}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="VVIP" value={stats.vvip} icon={Star} variant="gold" />
        <StatCard label="VIP" value={stats.vip} icon={Star} variant="gold" />
        <StatCard label="Arrived" value={stats.arrived} icon={CheckCircle2} variant="success" />
        <StatCard label="Delayed" value={stats.delayed} icon={Clock} variant="warning" />
      </div>

      <Tabs key={activeTab} defaultValue={activeTab}>
        <TabsList>
          <TabsTrigger value="arrivals" className="gap-1.5">
            <PlaneLanding className="h-3.5 w-3.5" />
            Arrivals
          </TabsTrigger>
          <TabsTrigger value="vip" className="gap-1.5">
            <Star className="h-3.5 w-3.5" />
            VIP Guests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="arrivals" className="space-y-4">
          <div className="flex justify-end gap-2">
            {canManage && <NewArrivalDialog date={date} />}
          </div>
          <Suspense>
            <ArrivalFilterBar />
          </Suspense>
          <ArrivalList arrivals={arrivals} />
        </TabsContent>

        <TabsContent value="vip" className="space-y-4">
          <div className="flex justify-end gap-2">
            {canManage && <NewVipGuestDialog />}
          </div>
          <Suspense>
            <VipFilterBar />
          </Suspense>
          <VipGuestList guests={vipGuests} selectedId={selectedVipGuest?.id} buildHref={buildVipHref} />
          <Suspense>
            <VipGuestDetailSheet vipGuest={selectedVipGuest} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
