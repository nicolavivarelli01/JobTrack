import { MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Application } from "@/lib/applications";

export function ApplicationActions({
  application,
  onEdit,
  onTogglePin,
  onDelete,
}: {
  application: Application;
  onEdit: (application: Application) => void;
  onTogglePin: (application: Application) => void;
  onDelete: (application: Application) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${application.company}`}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onSelect={() => onEdit(application)}>
          <Pencil aria-hidden="true" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onTogglePin(application)}>
          {application.pinned ? (
            <>
              <PinOff aria-hidden="true" /> Unpin
            </>
          ) : (
            <>
              <Pin aria-hidden="true" /> Pin
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => onDelete(application)}
        >
          <Trash2 aria-hidden="true" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
