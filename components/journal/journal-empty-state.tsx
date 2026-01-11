"use client";

import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, BookOpen01Icon } from "@hugeicons/core-free-icons";

interface JournalEmptyStateProps {
  onAddEntry: () => void;
}

export function JournalEmptyState({ onAddEntry }: JournalEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <HugeiconsIcon icon={BookOpen01Icon} className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No journal entries yet</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        Start tracking your health by adding your first journal entry.
        Log your weight, sleep, or glucose readings to monitor your progress over time.
      </p>
      <Button onClick={onAddEntry}>
        <HugeiconsIcon icon={Add01Icon} className="mr-2 h-4 w-4" />
        Add Your First Entry
      </Button>
    </div>
  );
}
