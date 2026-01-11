"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  WeightScale01Icon,
  SleepingIcon,
  TestTube02Icon,
  Delete02Icon,
  Edit02Icon,
} from "@hugeicons/core-free-icons";
import { format } from "date-fns";

export type EntryType = "weight" | "sleep" | "glucose";

interface JournalEntryCardProps {
  id: string;
  type: EntryType;
  date: Date;
  value: string;
  unit: string;
  subtext?: string;
  notes?: string | null;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const typeConfig: Record<EntryType, { icon: typeof WeightScale01Icon; color: string; label: string }> = {
  weight: {
    icon: WeightScale01Icon,
    color: "bg-blue-500/10 text-blue-500",
    label: "Weight",
  },
  sleep: {
    icon: SleepingIcon,
    color: "bg-purple-500/10 text-purple-500",
    label: "Sleep",
  },
  glucose: {
    icon: TestTube02Icon,
    color: "bg-amber-500/10 text-amber-500",
    label: "Glucose",
  },
};

export function JournalEntryCard({
  id,
  type,
  date,
  value,
  unit,
  subtext,
  notes,
  onEdit,
  onDelete,
}: JournalEntryCardProps) {
  const config = typeConfig[type];

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.color}`}>
            <HugeiconsIcon icon={config.icon} className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold">{value}</span>
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {config.label}
              {subtext && <span className="ml-1">({subtext})</span>}
            </div>
            {notes && (
              <p className="text-sm text-muted-foreground mt-1 italic">{notes}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground mr-2">
            {format(date, "MMM d, yyyy")}
          </span>
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(id)}
            >
              <HugeiconsIcon icon={Edit02Icon} className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(id)}
            >
              <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
