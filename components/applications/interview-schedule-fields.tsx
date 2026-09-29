import { CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationDraft } from "@/lib/applications";
import { fromDateTimeInputValue, toDateTimeInputValue } from "@/lib/dates";

type InterviewField = "interviewAt" | "interviewLink" | "interviewDetails";

export function InterviewScheduleFields({
  visible,
  values,
  onAdd,
  onRemove,
  onChange,
}: {
  visible: boolean;
  values: Pick<ApplicationDraft, InterviewField>;
  onAdd: () => void;
  onRemove: () => void;
  onChange: (field: InterviewField, value: string | undefined) => void;
}) {
  return (
    <section className="sm:col-span-2 rounded-xl border border-[#ffb562]/20 bg-[#ffb562]/[0.045] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#ffb562]/10 text-[#ffca8d]">
            <CalendarClock className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">
              Interview schedule
            </h3>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Save the next interview and everything needed to join it.
            </p>
          </div>
        </div>
        {visible ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={onRemove}
          >
            Remove
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            Add interview
          </Button>
        )}
      </div>

      {visible && (
        <div className="mt-5 grid gap-4 border-t border-white/[0.07] pt-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="interview-date">Date and time</Label>
            <Input
              id="interview-date"
              type="datetime-local"
              value={toDateTimeInputValue(values.interviewAt)}
              onChange={(event) =>
                onChange(
                  "interviewAt",
                  fromDateTimeInputValue(event.target.value),
                )
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interview-link">Meeting link</Label>
            <Input
              id="interview-link"
              type="url"
              value={values.interviewLink ?? ""}
              onChange={(event) =>
                onChange("interviewLink", event.target.value)
              }
              placeholder="Zoom, Teams, or Google Meet link"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="interview-details">Interview details</Label>
            <Textarea
              id="interview-details"
              value={values.interviewDetails ?? ""}
              onChange={(event) =>
                onChange("interviewDetails", event.target.value)
              }
              placeholder="Interviewers, format, topics to prepare, or special instructions…"
              className="min-h-24 resize-y"
              maxLength={5000}
            />
          </div>
        </div>
      )}
    </section>
  );
}
