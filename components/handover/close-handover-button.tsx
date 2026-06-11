"use client";

import { useTransition } from "react";

import { closeHandover } from "@/lib/actions/handover";
import { Button } from "@/components/ui/button";

/** Closes the active handover without starting a new one. */
export function CloseHandoverButton({ handoverId }: { handoverId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await closeHandover(handoverId);
        })
      }
    >
      {pending ? "Closing…" : "Close handover"}
    </Button>
  );
}
