import { Pin } from "lucide-react";

export function PinnedIndicator() {
  return (
    <span title="Pinned" className="shrink-0 text-[#ffb562]">
      <Pin className="size-3.5 fill-current" aria-hidden="true" />
      <span className="sr-only">Pinned</span>
    </span>
  );
}
