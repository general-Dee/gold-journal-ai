"use client";

import { useEffect } from "react";
import { Button, Card } from "@/components/ui/primitives";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Card className="max-w-md px-6 py-8 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-loss">Something went wrong</div>
        <h1 className="mt-2 font-display text-xl font-medium text-ink">This page hit an unexpected error</h1>
        <p className="mt-2 text-sm text-muted">
          Your data is safe. Try again, or head back to the dashboard.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="ghost" onClick={() => (window.location.href = "/")}>
            Go to dashboard
          </Button>
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </Card>
    </div>
  );
}
