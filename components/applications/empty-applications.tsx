import { BriefcaseBusiness, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EmptyApplications({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
        <BriefcaseBusiness className="size-5" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">Add your first application</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        Your dashboard and response flow will update automatically.
      </p>
      <Button className="mt-5" onClick={onAdd}>
        <Plus aria-hidden="true" />
        Add application
      </Button>
    </div>
  );
}
