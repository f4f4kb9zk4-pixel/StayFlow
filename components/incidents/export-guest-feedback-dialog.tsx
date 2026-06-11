"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";

import { exportGuestFeedbackReportPdf } from "@/lib/actions/incidents";
import { downloadBase64Pdf } from "@/lib/client/download-base64-pdf";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function todayYmd(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

interface ExportGuestFeedbackDialogProps {
  timezone: string;
}

/**
 * "Export Report" action — generates a Guest Feedback Report PDF for all
 * incidents logged within a chosen date range, formatted to match the
 * imported PMS report's grid layout.
 */
export function ExportGuestFeedbackDialog({ timezone }: ExportGuestFeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const today = todayYmd(timezone);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setPending(true);
    setError(null);
    try {
      const result = await exportGuestFeedbackReportPdf(from, to);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      downloadBase64Pdf(result.base64, result.filename);
      setOpen(false);
    } catch {
      setError("Could not generate the report. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FileDown className="h-4 w-4" />
          Export Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Guest Feedback Report</DialogTitle>
          <DialogDescription>
            Generate a PDF for incidents logged in this date range, laid out like the imported Guest
            Feedback Report.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="export-from">From</Label>
            <Input
              id="export-from"
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="export-to">To</Label>
            <Input
              id="export-to"
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <DialogFooter>
          <Button type="button" onClick={handleExport} disabled={pending}>
            {pending ? "Generating…" : "Export PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
