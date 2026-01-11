"use client";

import { useState } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  WeightScale01Icon,
  SleepingIcon,
  TestTube02Icon,
  Medicine01Icon,
  Dna01Icon,
} from "@hugeicons/core-free-icons";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Import form components (to be created)
import { WeightEntryForm } from "@/components/journal/forms/weight-entry-form";
import { SleepEntryForm } from "@/components/journal/forms/sleep-entry-form";
import { GlucoseEntryForm } from "@/components/journal/forms/glucose-entry-form";
import { MedicationForm } from "@/components/journal/forms/medication-form";
import { SupplementForm } from "@/components/journal/forms/supplement-form";

type EntryType = "weight" | "sleep" | "glucose" | "medication" | "supplement";

interface AddJournalEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: EntryType;
}

const entryTypes: {
  type: EntryType;
  label: string;
  description: string;
  icon: IconSvgElement;
  colorClass: string;
}[] = [
  {
    type: "weight",
    label: "Weight",
    description: "Log your weight and body measurements",
    icon: WeightScale01Icon,
    colorClass: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  },
  {
    type: "sleep",
    label: "Sleep",
    description: "Track your sleep duration and quality",
    icon: SleepingIcon,
    colorClass: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
  },
  {
    type: "glucose",
    label: "Glucose",
    description: "Record blood glucose readings",
    icon: TestTube02Icon,
    colorClass: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
  },
  {
    type: "medication",
    label: "Medication",
    description: "Add a new medication to track",
    icon: Medicine01Icon,
    colorClass: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20",
  },
  {
    type: "supplement",
    label: "Supplement",
    description: "Add a supplement you're taking",
    icon: Dna01Icon,
    colorClass: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
  },
];

export function AddJournalEntryModal({
  open,
  onOpenChange,
  defaultType,
}: AddJournalEntryModalProps) {
  const [selectedType, setSelectedType] = useState<EntryType | null>(defaultType ?? null);

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => setSelectedType(null), 200);
  };

  const handleSuccess = () => {
    handleClose();
  };

  const handleBack = () => {
    setSelectedType(null);
  };

  const renderForm = () => {
    switch (selectedType) {
      case "weight":
        return <WeightEntryForm onSuccess={handleSuccess} onCancel={handleBack} />;
      case "sleep":
        return <SleepEntryForm onSuccess={handleSuccess} onCancel={handleBack} />;
      case "glucose":
        return <GlucoseEntryForm onSuccess={handleSuccess} onCancel={handleBack} />;
      case "medication":
        return <MedicationForm onSuccess={handleSuccess} onCancel={handleBack} />;
      case "supplement":
        return <SupplementForm onSuccess={handleSuccess} onCancel={handleBack} />;
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {selectedType ? `Add ${entryTypes.find((t) => t.type === selectedType)?.label}` : "Add Entry"}
          </SheetTitle>
          <SheetDescription>
            {selectedType
              ? entryTypes.find((t) => t.type === selectedType)?.description
              : "Choose the type of entry you want to add"}
          </SheetDescription>
        </SheetHeader>

        {selectedType ? (
          <SheetBody>{renderForm()}</SheetBody>
        ) : (
          <SheetBody>
            <div className="grid gap-3">
              {entryTypes.map(({ type, label, description, icon, colorClass }) => (
                <Button
                  key={type}
                  variant="outline"
                  className="h-auto p-4 justify-start text-left"
                  onClick={() => setSelectedType(type)}
                >
                  <div className={cn("p-2 rounded-lg mr-3", colorClass)}>
                    <HugeiconsIcon icon={icon} className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </SheetBody>
        )}
      </SheetContent>
    </Sheet>
  );
}
