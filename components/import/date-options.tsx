import { AlertTriangle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { DateOrderChoice } from "@/lib/import/saved-settings";
import type { DateOrder } from "@/lib/import/types";

const dateOrderLabels: Record<DateOrder, string> = {
  mdy: "MM/DD/YYYY",
  dmy: "DD/MM/YYYY",
};

export function DateOptionsSection({
  dateOrderChoice,
  detected,
  onDateOrderChange,
  useFallbackDate,
  onUseFallbackDateChange,
  fallbackDate,
  onFallbackDateChange,
}: {
  dateOrderChoice: DateOrderChoice;
  detected: { order: DateOrder; ambiguous: boolean };
  onDateOrderChange: (choice: DateOrderChoice) => void;
  useFallbackDate: boolean;
  onUseFallbackDateChange: (enabled: boolean) => void;
  fallbackDate: string;
  onFallbackDateChange: (date: string) => void;
}) {
  return (
    <section className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="import-date-order">Date format</Label>
        <NativeSelect
          id="import-date-order"
          className="w-full"
          value={dateOrderChoice}
          onChange={(event) =>
            onDateOrderChange(event.target.value as DateOrderChoice)
          }
        >
          <NativeSelectOption value="auto">
            Auto-detect ({dateOrderLabels[detected.order]})
          </NativeSelectOption>
          <NativeSelectOption value="mdy">
            {dateOrderLabels.mdy}
          </NativeSelectOption>
          <NativeSelectOption value="dmy">
            {dateOrderLabels.dmy}
          </NativeSelectOption>
        </NativeSelect>
        {dateOrderChoice === "auto" && detected.ambiguous && (
          <p className="flex items-start gap-1.5 text-xs leading-5 text-[#ffd09a]">
            <AlertTriangle
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            Every date in this file fits both formats. Pick the one your
            spreadsheet uses.
          </p>
        )}
        <p className="text-xs text-[#71869b]">
          ISO dates (2025-09-23) and written dates always work.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={useFallbackDate}
            onChange={(event) => onUseFallbackDateChange(event.target.checked)}
            className="size-4 accent-[#5ee3c2]"
          />
          Fallback applied date
        </label>
        <Input
          type="date"
          value={fallbackDate}
          onChange={(event) => onFallbackDateChange(event.target.value)}
          disabled={!useFallbackDate}
          aria-label="Fallback applied date"
        />
        <p className="text-xs leading-5 text-[#71869b]">
          Used for rows without a readable applied date. Otherwise those rows
          are skipped.
        </p>
      </div>
    </section>
  );
}
