import { LogOut, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DashboardHeader({
  email,
  onSignOut,
  onAdd,
}: {
  email?: string;
  onSignOut: () => void;
  onAdd: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#071019]/88 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.75rem] max-w-[1480px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 font-mono text-sm font-bold text-primary">
            JT
          </div>
          <div>
            <p className="text-base font-semibold tracking-[-0.025em]">
              JobTrack
            </p>
            <p className="text-xs text-muted-foreground">
              Your job search path starts here.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden max-w-52 truncate text-xs text-muted-foreground md:block">
            {email}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut aria-hidden="true" />
          </Button>
          <Button
            onClick={onAdd}
            className="shadow-[0_0_24px_rgba(94,227,194,0.12)]"
          >
            <Plus aria-hidden="true" />
            <span className="hidden sm:inline">Add application</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
