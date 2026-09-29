"use client";

import { useEffect, useState } from "react";
import { Share2, Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function IOSInstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const navigatorWithStandalone = window.navigator as Navigator & {
      standalone?: boolean;
    };
    const isIOS = /iPad|iPhone|iPod/.test(navigatorWithStandalone.userAgent);
    const isStandalone =
      navigatorWithStandalone.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    const dismissed = window.localStorage.getItem(
      "jobtrack.install-hint-dismissed",
    );

    const frame = window.requestAnimationFrame(() => {
      setVisible(isIOS && !isStandalone && !dismissed);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!visible) return null;

  function dismiss() {
    window.localStorage.setItem("jobtrack.install-hint-dismissed", "true");
    setVisible(false);
  }

  return (
    <aside className="mb-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.07] px-4 py-3.5 text-sm shadow-[0_16px_40px_rgba(0,0,0,.14)]">
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Smartphone className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">
          Install JobTrack on this iPhone
        </p>
        <p className="mt-1 leading-5 text-muted-foreground">
          In Safari, tap{" "}
          <Share2 className="mx-1 inline size-3.5" aria-label="Share" />
          then <span className="text-foreground">Add to Home Screen</span>.
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={dismiss}
        aria-label="Dismiss install instructions"
      >
        <X aria-hidden="true" />
      </Button>
    </aside>
  );
}
