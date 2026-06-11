"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Upload, CheckCircle2 } from "lucide-react";

import { importPmsReportFromPdf, type ImportPmsReportState } from "@/lib/actions/pms-import";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const initialState: ImportPmsReportState = {};

/**
 * Combined "Import PDF" action (§3.2 items 6 & 7) — a single button that
 * accepts any Opera PMS export covering the Arrival & VIP Board. The same
 * file may contain an "Arrivals: Detailed" report, a "VIP Guests INH"
 * report, or both across different pages (one section can be empty while
 * another has data); whichever rows are recognized get imported.
 */
export function ImportPmsReportDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(importPmsReportFromPdf, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) {
      formRef.current?.reset();
    }
  }, [open]);

  const arrivalsCount = (state?.arrivalsImported ?? 0) + (state?.arrivalsUpdated ?? 0);
  const vipCount = (state?.vipImported ?? 0) + (state?.vipUpdated ?? 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="h-4 w-4" />
          Import PDF
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import from PMS report</DialogTitle>
          <DialogDescription>
            Upload an Opera PMS export — &quot;Arrivals: Detailed&quot;, &quot;VIP Guests
            INH&quot;, or a combined report containing both. Each recognized section is
            imported into the matching list.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pms-import-file">PDF report</Label>
            <input
              id="pms-import-file"
              name="file"
              type="file"
              accept="application/pdf,.pdf"
              required
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-secondary/80"
            />
          </div>

          {state?.error && <p className="text-sm text-danger">{state.error}</p>}

          {state?.success && (
            <div className="flex items-start gap-2 rounded-md border border-border bg-secondary/30 p-3 text-sm">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-success shrink-0" />
              <div className="space-y-0.5">
                {state.arrivalsImported !== undefined && (
                  <p>
                    Arrivals: imported {state.arrivalsImported} new and updated{" "}
                    {state.arrivalsUpdated ?? 0} existing arrival
                    {arrivalsCount === 1 ? "" : "s"}.
                  </p>
                )}
                {state.vipImported !== undefined && (
                  <p>
                    VIP guests: imported {state.vipImported} new and updated{" "}
                    {state.vipUpdated ?? 0} existing guest
                    {vipCount === 1 ? "" : "s"}.
                  </p>
                )}
                {state.warnings && state.warnings.length > 0 && (
                  <ul className="mt-1 list-disc list-inside text-xs text-muted-foreground">
                    {state.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {state?.success ? (
              <Button type="button" onClick={() => setOpen(false)}>
                Done
              </Button>
            ) : (
              <Button type="submit" disabled={pending}>
                {pending ? "Importing…" : "Import"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
