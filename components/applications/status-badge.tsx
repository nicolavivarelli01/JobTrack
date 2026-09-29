import { Badge } from "@/components/ui/badge";
import type { Outcome, Stage } from "@/lib/applications";

function stageBadgeClass(stage: Stage) {
  switch (stage) {
    case "Assessment":
      return "border-[#7aa7ff]/30 bg-[#7aa7ff]/10 text-[#a8c4ff]";
    case "Recruiter screen":
      return "border-[#a998ff]/30 bg-[#a998ff]/10 text-[#c9bdff]";
    case "Interview 1":
    case "Interview 2":
    case "Interview 3":
    case "Interview 4+":
      return "border-[#ffb562]/30 bg-[#ffb562]/10 text-[#ffd09a]";
    case "Offer":
      return "border-[#5ee3c2]/30 bg-[#5ee3c2]/10 text-[#8cf0d7]";
    default:
      return "border-[#71869b]/30 bg-[#71869b]/10 text-[#a9bac9]";
  }
}

function outcomeBadgeClass(outcome: Outcome) {
  switch (outcome) {
    case "Rejected":
      return "border-[#ff6b74]/30 bg-[#ff6b74]/10 text-[#ff9da4]";
    case "Offer":
      return "border-[#5ee3c2]/30 bg-[#5ee3c2]/10 text-[#8cf0d7]";
    case "Withdrawn":
      return "border-[#71869b]/30 bg-[#71869b]/10 text-[#a9bac9]";
    default:
      return "border-[#5ee3c2]/20 bg-[#5ee3c2]/8 text-[#8cf0d7]";
  }
}

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <Badge variant="outline" className={stageBadgeClass(stage)}>
      {stage}
    </Badge>
  );
}

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  return (
    <Badge variant="outline" className={outcomeBadgeClass(outcome)}>
      {outcome}
    </Badge>
  );
}
