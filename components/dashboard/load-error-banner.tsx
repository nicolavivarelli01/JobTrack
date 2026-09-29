import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LoadErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 sm:flex-row sm:items-center">
      <p className="flex items-start gap-2 text-sm text-[#ffadb2]">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>Could not load your applications. {message}</span>
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="self-start text-[#ffadb2] hover:bg-destructive/10 hover:text-white sm:self-auto"
        onClick={onRetry}
      >
        Try again
      </Button>
    </div>
  );
}
