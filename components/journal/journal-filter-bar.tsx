"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import { FilterIcon } from "@hugeicons/core-free-icons";

export type JournalEntryType = "all" | "weight" | "sleep" | "glucose" | "medications";

interface JournalFilterBarProps {
  selectedType: JournalEntryType;
  onTypeChange: (type: JournalEntryType) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onClearFilters: () => void;
}

const entryTypes: { value: JournalEntryType; label: string }[] = [
  { value: "all", label: "All Entries" },
  { value: "weight", label: "Weight" },
  { value: "sleep", label: "Sleep" },
  { value: "glucose", label: "Glucose" },
  { value: "medications", label: "Meds & Supplements" },
];

export function JournalFilterBar({
  selectedType,
  onTypeChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClearFilters,
}: JournalFilterBarProps) {
  const hasFilters = selectedType !== "all" || dateFrom || dateTo;

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={FilterIcon} className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedType} onValueChange={(value) => onTypeChange(value as JournalEntryType)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {entryTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="w-[140px]"
          placeholder="From"
        />
        <span className="text-muted-foreground">to</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="w-[140px]"
          placeholder="To"
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
