import type { VipTier } from "@/types/domain";
import { nightsBetween } from "@/lib/utils";

/**
 * PMS "VIP Guests INH" report importer (§3.2 item 6, VIP Guest Tracking).
 *
 * Opera-style `gibyroom` PDF reports list every VIP-coded guest currently
 * in-house, one row per *named guest profile* — not one row per room. A
 * shared reservation (e.g. a family or wedding party) appears as multiple
 * rows for the same room/stay window: one "main" row carrying the actual
 * Adl./Chl. headcount, and one or more "shared" rows with Adl./Chl. both 0
 * for the other VIP-listed occupants. We group rows by
 * `(room, stayStart, stayEnd)` so each reservation becomes a single
 * `vip_guests` record — the main occupant's name, with the shared
 * occupants' notes/specials merged in. Grouping by the exact stay window
 * (not just room number) keeps a guest checking out and a different VIP
 * guest checking into the same room from being merged together.
 *
 * Like `arrivals-pdf-parser.ts`, this re-derives row-major lines from pdf.js
 * position data (`extractLines`) and pattern-matches each guest's "main"
 * row (room, name, company/TA, Arr./Dep. dates, room type, Adl./Chl., pay
 * method, rate code), then collects the VIP code and any following
 * free-text lines (Share with, Res. Comments, Profile/Background/General
 * Notes, Specials, etc.) until the next guest's main row.
 *
 * Re-running the import is safe — guests are matched on
 * (hotel_id, guest_name, room) and upserted.
 */

export interface ParsedVipGuest {
  room: string;
  guestName: string;
  isRepeatGuest: boolean;
  company: string | null;
  /** ISO YYYY-MM-DD */
  stayStart: string;
  /** ISO YYYY-MM-DD */
  stayEnd: string;
  roomType: string | null;
  adults: number;
  children: number;
  /** Raw Opera VIP code from the report, e.g. "VIP4", "VIPL", "VIPR". */
  vipCode: string | null;
  /** Derived from `vipCode` — "VVIP" only for the literal "VVIP" code, "VIP" otherwise. */
  vipTier: VipTier;
  /** Nights of stay, derived from `stayStart`/`stayEnd`. */
  nights: number;
  /** From "Specials:" lines — Birthday Celebration, Honeymoon Set Up, etc. */
  preferences: string | null;
  /** Combined Share with / Res. Comments / Profile / Background / General Notes lines. */
  notes: string | null;
}

export interface ParseVipGuestsResult {
  hotelName: string | null;
  reportDate: string | null; // YYYY-MM-DD, from the report header
  guests: ParsedVipGuest[];
  warnings: string[];
}

const BOILERPLATE_PATTERNS: RegExp[] = [
  /^VIP Guests INH$/,
  /^VIP Arrival$/,
  /^\d{1,2}:\d{2}$/,
  /^Room Name Company Arr\. Dep\./,
  /^No\. Travel Agent Date Date Type/,
  /^VIP Block Code Source EDT$/,
  /^Filter Room Class All/,
  /^Membership Type All$/,
  /^Include Preferences, VIP only/,
  /^Comment Type All$/,
  /^Including Internal Notes$/,
  /^Sort Order Room No\.,Vip$/,
  /^Total Rooms/,
];

// Room No., optional repeat-guest "*", guest name (+ optional company/TA),
// Arr. Date, Dep. Date, Room Type, Adl., Chl., Pay Mth., Rate Code.
const MAIN_ROW_RE =
  /^(\d{4})\s+(\*)?(.+?)\s+(\d{2}\/\d{2}\/\d{2})\s+(\d{2}\/\d{2}\/\d{2})\s+([A-Z0-9]{4,6})\s+(\d{1,2})\s+(\d{1,2})\s+([A-Z]{2,3})\s+(\S+)\s*$/;

// VIP code line, e.g. "VIP4 12:00", "VIPR 1406WEDD 03:03", "VIPL 12:00".
const VIP_CODE_RE = /^(VVIP|VIP[A-Z0-9]*)\b/;

// A wrapped continuation of the guest name (the name column wraps onto a
// second line for long names), e.g. "Rachel,Ms." or "Alejandro,Mr. (THAILAND)"
// — the trailing parenthesised part, if any, is a wrapped company name.
const NAME_CONTINUATION_RE =
  /^([A-Z][A-Za-z .'-]*,(?:Mr|Mrs|Ms|Miss|Dr|Master)\.?)(?:\s+(\(.+\)))?$/;

const SPECIALS_RE = /^Specials:\s*(.*)$/;

/** Convert a PMS DD/MM/YY date to an ISO YYYY-MM-DD date (assumes 20YY). */
function toIsoDate(ddmmyy: string): string {
  const [dd, mm, yy] = ddmmyy.split("/");
  return `20${yy}-${mm}-${dd}`;
}

/**
 * Map an Opera VIP code (VIP1-VIP7, VIPL, VIPR, VVIP, ...) to the app's
 * three-tier system. Only the literal "VVIP" code maps to the "VVIP" tier —
 * every other VIP-prefixed code (and a missing code) maps to "VIP", per the
 * "VIP Guests" framing of this report. Staff can upgrade individual guests
 * to VVIP afterwards.
 */
function tierFromVipCode(vipCode: string | null): VipTier {
  return vipCode === "VVIP" ? "VVIP" : "VIP";
}

/**
 * Format a "Last,First[,Title]" PMS name as "First Last [Title]". Falls back
 * to the raw string if it doesn't look like a comma-separated name.
 */
function formatGuestName(raw: string): string {
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const [last, first, title] = parts;
    return [first, last, title].filter(Boolean).join(" ");
  }
  return raw.trim();
}

/** Split "<name> T- <company/travel agent>" into its two parts. */
function splitNameAndCompany(raw: string): { name: string; company: string | null } {
  const idx = raw.indexOf(" T- ");
  if (idx === -1) return { name: raw.trim(), company: null };
  return { name: raw.slice(0, idx).trim(), company: raw.slice(idx + 4).trim() };
}

// A standalone wrapped continuation of a (possibly already-truncated)
// company name, e.g. "(THAILAND)" on its own line.
const COMPANY_CONTINUATION_RE = /^\(.+\)$/;

function isBoilerplate(line: string): boolean {
  return BOILERPLATE_PATTERNS.some((re) => re.test(line));
}

/**
 * Reconstruct row-major text lines from a PDF buffer using pdf.js position
 * data — see `arrivals-pdf-parser.ts` for the full rationale. Groups text
 * items by y-coordinate (rows) with a small tolerance, then orders items
 * within a row by x-coordinate.
 */
async function extractLines(data: Uint8Array): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    const { createRequire } = await import("module");
    const nodeRequire = createRequire(import.meta.url);
    pdfjsLib.GlobalWorkerOptions.workerSrc = nodeRequire.resolve(
      "pdfjs-dist/legacy/build/pdf.worker.mjs"
    );
  }

  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;

  const lines: string[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    interface Item {
      str: string;
      x: number;
      y: number;
      width: number;
    }

    const items: Item[] = [];
    for (const raw of content.items) {
      const it = raw as { str?: string; transform?: number[]; width?: number };
      if (!it.str || !it.str.trim() || !it.transform) continue;
      items.push({
        str: it.str,
        x: it.transform[4],
        y: it.transform[5],
        width: it.width ?? 0,
      });
    }

    items.sort((a, b) => b.y - a.y || a.x - b.x);

    const rows: Item[][] = [];
    for (const item of items) {
      const lastRow = rows[rows.length - 1];
      if (lastRow && Math.abs(lastRow[0].y - item.y) < 2.5) {
        lastRow.push(item);
      } else {
        rows.push([item]);
      }
    }

    for (const row of rows) {
      row.sort((a, b) => a.x - b.x);
      let text = "";
      let prevEndX: number | null = null;
      for (const item of row) {
        if (prevEndX !== null) {
          const gap = item.x - prevEndX;
          text += gap > 1 ? " " : "";
        }
        text += item.str;
        prevEndX = item.x + item.width;
      }
      const trimmed = text.replace(/\s+/g, " ").trim();
      if (trimmed) lines.push(trimmed);
    }

    await page.cleanup();
  }

  return lines;
}

interface RawEntry {
  room: string;
  guestName: string;
  isRepeatGuest: boolean;
  company: string | null;
  stayStart: string;
  stayEnd: string;
  roomType: string | null;
  adults: number;
  children: number;
  vipCode: string | null;
  noteLines: string[];
}

/**
 * Parse an Opera-style "VIP Guests INH" PMS PDF report into structured
 * records ready to be upserted into the `vip_guests` table — one record per
 * room/stay window, with shared occupants merged in.
 */
export async function parseVipGuestsPdf(data: Uint8Array): Promise<ParseVipGuestsResult> {
  const allLines = await extractLines(data);
  const warnings: string[] = [];

  let hotelName: string | null = null;
  let reportDate: string | null = null;

  const filtered: string[] = [];
  for (const line of allLines) {
    // "<Hotel Name> DD/MM/YY" header line, repeated on every page — capture
    // once, then skip (every occurrence, not just the first, is boilerplate).
    if (line.startsWith("Centara ")) {
      if (!hotelName) {
        const m = /^(.*?)\s+(\d{2}\/\d{2}\/\d{2})$/.exec(line);
        if (m) {
          hotelName = m[1].trim();
          reportDate = toIsoDate(m[2]);
        }
      }
      continue;
    }
    if (isBoilerplate(line)) continue;
    filtered.push(line);
  }

  const entries: RawEntry[] = [];
  let i = 0;

  while (i < filtered.length) {
    const line = filtered[i];
    const main = MAIN_ROW_RE.exec(line);
    if (!main) {
      i += 1;
      continue;
    }

    const [, room, star, nameAndCompany, arr, dep, roomType, adl, chl] = main;
    const { name, company } = splitNameAndCompany(nameAndCompany);
    let fullName = name;
    let fullCompany = company;
    i += 1;

    // Optional wrapped name continuation (e.g. "Rachel,Ms." or
    // "Alejandro,Mr. (THAILAND)" — the latter also carries a wrapped company
    // name in parentheses).
    if (i < filtered.length) {
      const cont = NAME_CONTINUATION_RE.exec(filtered[i]);
      if (cont) {
        fullName = `${fullName} ${cont[1]}`;
        if (cont[2]) {
          fullCompany = fullCompany ? `${fullCompany} ${cont[2]}` : cont[2];
        }
        i += 1;
      } else if (COMPANY_CONTINUATION_RE.test(filtered[i])) {
        // A standalone "(...)" line continues a truncated company name.
        fullCompany = fullCompany ? `${fullCompany} ${filtered[i]}` : filtered[i];
        i += 1;
      }
    }

    let vipCode: string | null = null;
    const noteLines: string[] = [];
    while (i < filtered.length && !MAIN_ROW_RE.test(filtered[i])) {
      const vipMatch = VIP_CODE_RE.exec(filtered[i]);
      if (vipMatch && vipCode === null) {
        vipCode = vipMatch[1];
        i += 1;
        continue;
      }
      noteLines.push(filtered[i]);
      i += 1;
    }

    entries.push({
      room: String(parseInt(room, 10)),
      guestName: formatGuestName(fullName),
      isRepeatGuest: Boolean(star),
      company: fullCompany,
      stayStart: toIsoDate(arr),
      stayEnd: toIsoDate(dep),
      roomType,
      adults: Number(adl),
      children: Number(chl),
      vipCode,
      noteLines,
    });
  }

  // Group rows sharing the same room AND stay window into one reservation —
  // this also keeps a checkout guest and a different incoming VIP guest in
  // the same room (different stay windows) from being merged together.
  const groups = new Map<string, RawEntry[]>();
  for (const entry of entries) {
    const key = `${entry.room}|${entry.stayStart}|${entry.stayEnd}`;
    const group = groups.get(key);
    if (group) group.push(entry);
    else groups.set(key, [entry]);
  }

  const guests: ParsedVipGuest[] = [];
  for (const group of groups.values()) {
    // The "main" occupant is the one row carrying the actual headcount;
    // shared occupants (e.g. spouse/children also VIP-listed) show 0/0.
    const main = group.find((e) => e.adults > 0 || e.children > 0) ?? group[0];
    const others = group.filter((e) => e !== main);

    const seenLines = new Set<string>();
    const noteLines: string[] = [];
    const specials: string[] = [];

    for (const entry of [main, ...others]) {
      for (const l of entry.noteLines) {
        const specialsMatch = SPECIALS_RE.exec(l);
        if (specialsMatch) {
          if (specialsMatch[1] && !specials.includes(specialsMatch[1])) {
            specials.push(specialsMatch[1]);
          }
          continue;
        }
        if (!seenLines.has(l)) {
          seenLines.add(l);
          noteLines.push(l);
        }
      }
    }

    let notes: string | null = null;
    if (noteLines.length > 0) {
      const joined = noteLines.join("\n").trim();
      notes = joined.length > 4000 ? `${joined.slice(0, 4000)}…` : joined;
    }

    guests.push({
      room: main.room,
      guestName: main.guestName,
      isRepeatGuest: main.isRepeatGuest,
      company: main.company,
      stayStart: main.stayStart,
      stayEnd: main.stayEnd,
      roomType: main.roomType,
      adults: main.adults,
      children: main.children,
      vipCode: main.vipCode ?? others.find((o) => o.vipCode)?.vipCode ?? null,
      vipTier: tierFromVipCode(main.vipCode ?? others.find((o) => o.vipCode)?.vipCode ?? null),
      nights: nightsBetween(main.stayStart, main.stayEnd) ?? 0,
      preferences: specials.length > 0 ? specials.join(", ") : null,
      notes,
    });
  }

  if (guests.length === 0) {
    warnings.push("No VIP in-house guest rows could be recognized in this PDF.");
  }

  return { hotelName, reportDate, guests, warnings };
}
