"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Upload, CheckCircle2 } from "lucide-react";

import { importGuestFeedbackFromPdf, type ImportGuestFeedbackState } from "@/lib/actions/incidents";
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

const initialState: ImportGuestFeedbackState = {};

/**
 * "Import PDF" action (§1.7, §3.2 item 9, Incident Tracker) — lets staff
 * upload a "Guest Feedback Report" (PDF) to create or update incidents with
 * guest name, source, case details, cost, status, and department concerned
 * pre-filled. Mirrors the Arrivals "Import PDF" feature.
 */
export function ImportGuestFeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(importGuestFeedbackFromPdf, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) {
      formRef.current?.reset();
    }
  }, [open]);

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
          <DialogTitle>Import guest feedback from PDF</DialogTitle>
          <DialogDescription>
            Upload a &quot;Guest Feedback Report&quot; (PDF) to create or update incidents — guest
            name, source, case details, resolution, cost, status, and department concerned.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="feedback-file">PDF report</Label>
            <input
              id="feedback-file"
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
              <div>
                <p>
                  Imported {state.imported ?? 0} new and updated {state.updated ?? 0} existing
                  case{(state.imported ?? 0) + (state.updated ?? 0) === 1 ? "" : "s"}.
                </p>
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
