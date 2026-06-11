"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/use-current-user";
import { parseArrivalsPdf } from "@/lib/pms/arrivals-pdf-parser";
import { parseVipGuestsPdf } from "@/lib/pms/vip-guests-pdf-parser";
import { upsertArrivals } from "./arrivals";
import { upsertVipGuests } from "./vip-guests";

export interface ImportPmsReportState {
  error?: string;
  success?: boolean;
  arrivalsImported?: number;
  arrivalsUpdated?: number;
  vipImported?: number;
  vipUpdated?: number;
  warnings?: string[];
}

/**
 * Combined "Import PDF" action for the VIP Guests page (§3.2 items 6 & 7).
 * A single Opera PMS export can bundle multiple report sections across its
 * pages — e.g. an empty "VIP Arrival" page 1 followed by a "VIP Guests INH"
 * report on later pages. Rather than requiring staff to know which report
 * format their file contains (and erroring out if one section is blank),
 * this tries both parsers against the same upload and imports whatever it
 * recognizes: "Arrivals: Detailed" rows go to the Arrival & VIP Board via
 * `upsertArrivals`, and "VIP Guests INH" rows go to VIP Guest Tracking via
 * `upsertVipGuests`. Only fails if neither format yields any rows.
 */
export async function importPmsReportFromPdf(
  _prev: ImportPmsReportState,
  formData: FormData
): Promise<ImportPmsReportState> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const hotelId = user.currentHotel.id;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a PDF file to import." };
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "Please upload a PDF file." };
  }

  let data: Uint8Array;
  try {
    data = new Uint8Array(await file.arrayBuffer());
  } catch (err) {
    console.error("importPmsReportFromPdf: failed to read file", err);
    return { error: "Could not read this PDF. Please check the file and try again." };
  }

  const warnings: string[] = [];

  // pdf.js's getDocument({ data }) transfers the Uint8Array's underlying
  // ArrayBuffer to its worker, detaching it after the first call — so each
  // parser needs its own copy of the bytes, or the second call fails.
  let arrivalsParsed: Awaited<ReturnType<typeof parseArrivalsPdf>> | null = null;
  try {
    arrivalsParsed = await parseArrivalsPdf(data.slice());
  } catch (err) {
    console.error("importPmsReportFromPdf: arrivals parser failed", err);
  }

  let vipParsed: Awaited<ReturnType<typeof parseVipGuestsPdf>> | null = null;
  try {
    vipParsed = await parseVipGuestsPdf(data.slice());
  } catch (err) {
    console.error("importPmsReportFromPdf: VIP guests parser failed", err);
  }

  const hasArrivals = (arrivalsParsed?.arrivals.length ?? 0) > 0;
  const hasVipGuests = (vipParsed?.guests.length ?? 0) > 0;

  if (!hasArrivals && !hasVipGuests) {
    if (arrivalsParsed) warnings.push(...arrivalsParsed.warnings);
    if (vipParsed) warnings.push(...vipParsed.warnings);
    return {
      error: "No reservations or VIP guests were recognized in this PDF.",
      warnings,
    };
  }

  const result: ImportPmsReportState = { success: true };

  if (hasArrivals && arrivalsParsed) {
    const { imported, updated } = await upsertArrivals(supabase, hotelId, arrivalsParsed.arrivals);
    result.arrivalsImported = imported;
    result.arrivalsUpdated = updated;
    warnings.push(...arrivalsParsed.warnings);
  }

  if (hasVipGuests && vipParsed) {
    const { imported, updated } = await upsertVipGuests(supabase, hotelId, vipParsed.guests);
    result.vipImported = imported;
    result.vipUpdated = updated;
    warnings.push(...vipParsed.warnings);
  }

  result.warnings = warnings;

  revalidatePath("/arrivals");
  revalidatePath("/dashboard");

  return result;
}
