"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useSelectedMember } from "@/contexts/selected-member-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HealthExportUpload } from "@/components/upload/health-export-upload";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  WeightScale01Icon,
  SleepingIcon,
  TestTube02Icon,
  Medicine01Icon,
  ArrowLeft02Icon,
  SmartPhone01Icon,
} from "@hugeicons/core-free-icons";
import { format, isWithinInterval, parseISO } from "date-fns";
import {
  JournalFilterBar,
  JournalEntryCard,
  JournalEmptyState,
  MedicationsList,
  WeightEntryForm,
  SleepEntryForm,
  GlucoseEntryForm,
  MedicationForm,
  SupplementForm,
  type JournalEntryType,
  type EntryType,
} from "@/components/journal";

type AddStep = "select" | "weight" | "sleep" | "glucose" | "medication" | "supplement" | "import";

export default function JournalPage() {
  const searchParams = useSearchParams();
  const initialType = (searchParams.get("type") as JournalEntryType) || "all";
  const { selectedMemberId } = useSelectedMember();

  const [selectedType, setSelectedType] = useState<JournalEntryType>(initialType);
  const [activeTab, setActiveTab] = useState<string>(initialType === "medications" ? "medications" : "entries");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addStep, setAddStep] = useState<AddStep>("select");
  const [deleteEntry, setDeleteEntry] = useState<string | null>(null);
  const [showInactiveMeds, setShowInactiveMeds] = useState(false);

  // Wait for member selection before querying
  const shouldQuery = !!selectedMemberId;

  // Fetch journal entries (filtered by selected household member)
  const { data: journalEntries, isLoading: entriesLoading } = trpc.journal.getAll.useQuery({
    type: selectedType === "all" || selectedType === "medications" ? undefined : selectedType,
    householdMemberId: selectedMemberId,
  }, { enabled: shouldQuery });

  // Fetch medications and supplements
  const { data: medicationsData, isLoading: medsLoading } = trpc.medications.getAllMedications.useQuery({});
  const { data: supplementsData, isLoading: suppsLoading } = trpc.medications.getAllSupplements.useQuery({});

  const utils = trpc.useUtils();

  const handleImportComplete = () => {
    // Refresh journal data after import
    utils.journal.getAll.invalidate();
    utils.journal.getLatestByType.invalidate();
    utils.journal.getWeeklyStats.invalidate();
  };

  const deleteEntryMutation = trpc.journal.delete.useMutation({
    onSuccess: () => {
      utils.journal.invalidate();
      setDeleteEntry(null);
    },
  });

  // Filter entries by date
  const filteredEntries = journalEntries?.filter((entry) => {
    const entryDate = parseISO(entry.entryDate);
    if (dateFrom && dateTo) {
      return isWithinInterval(entryDate, {
        start: parseISO(dateFrom),
        end: parseISO(dateTo),
      });
    }
    if (dateFrom) {
      return entryDate >= parseISO(dateFrom);
    }
    if (dateTo) {
      return entryDate <= parseISO(dateTo);
    }
    return true;
  });

  // Group entries by date
  const groupedEntries = filteredEntries?.reduce((groups, entry) => {
    const date = entry.entryDate;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {} as Record<string, typeof filteredEntries>);

  const sortedDates = Object.keys(groupedEntries || {}).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const handleClearFilters = () => {
    setSelectedType("all");
    setDateFrom("");
    setDateTo("");
  };

  const handleAddSuccess = () => {
    setIsAddOpen(false);
    setAddStep("select");
  };

  const handleDeleteConfirm = () => {
    if (deleteEntry) {
      deleteEntryMutation.mutate({ id: deleteEntry });
    }
  };

  const getEntryValue = (entry: NonNullable<typeof journalEntries>[0]): { value: string; unit: string; subtext?: string } => {
    if (entry.entryType === "weight" && entry.weightEntry) {
      return {
        value: entry.weightEntry.weight,
        unit: "kg",
        subtext: entry.weightEntry.bodyFatPercentage
          ? `Body fat: ${Number(entry.weightEntry.bodyFatPercentage).toFixed(1)}%`
          : undefined,
      };
    }
    if (entry.entryType === "sleep" && entry.sleepEntry) {
      const hours = entry.sleepEntry.durationMinutes / 60;
      return {
        value: hours.toFixed(1),
        unit: "hours",
        subtext: entry.sleepEntry.quality ? `Quality: ${entry.sleepEntry.quality}/5` : undefined,
      };
    }
    if (entry.entryType === "glucose" && entry.glucoseEntry) {
      const readingLabels: Record<string, string> = {
        fasting: "Fasting",
        post_meal: "Post-meal",
        random: "Random",
      };
      return {
        value: entry.glucoseEntry.value,
        unit: "mmol/L",
        subtext: readingLabels[entry.glucoseEntry.readingType] || entry.glucoseEntry.readingType,
      };
    }
    if (entry.entryType === "heart_rate" && entry.heartRateEntry) {
      const hr = entry.heartRateEntry;
      // Show resting HR as primary, with HRV as subtext
      if (hr.restingHeartRate) {
        return {
          value: hr.restingHeartRate.toString(),
          unit: "bpm",
          subtext: hr.heartRateVariability ? `HRV: ${Number(hr.heartRateVariability).toFixed(0)}ms` : undefined,
        };
      }
      // If no resting HR, show HRV
      if (hr.heartRateVariability) {
        return { value: Number(hr.heartRateVariability).toFixed(0), unit: "ms HRV" };
      }
      return { value: "—", unit: "" };
    }
    if (entry.entryType === "activity" && entry.activityEntry) {
      const act = entry.activityEntry;
      // Show steps as primary metric
      if (act.steps) {
        const subtexts = [];
        if (act.activeCalories) subtexts.push(`${act.activeCalories} kcal`);
        if (act.exerciseMinutes) subtexts.push(`${act.exerciseMinutes} min`);
        return {
          value: act.steps.toLocaleString(),
          unit: "steps",
          subtext: subtexts.length > 0 ? subtexts.join(", ") : undefined,
        };
      }
      // Fallback to calories or exercise minutes
      if (act.activeCalories) {
        return { value: act.activeCalories.toString(), unit: "kcal" };
      }
      if (act.exerciseMinutes) {
        return { value: act.exerciseMinutes.toString(), unit: "min exercise" };
      }
      return { value: "—", unit: "" };
    }
    if (entry.entryType === "blood_pressure" && entry.bloodPressureEntry) {
      const bp = entry.bloodPressureEntry;
      return {
        value: `${bp.systolic}/${bp.diastolic}`,
        unit: "mmHg",
        subtext: bp.pulse ? `Pulse: ${bp.pulse} bpm` : undefined,
      };
    }
    if (entry.entryType === "blood_oxygen" && entry.bloodOxygenEntry) {
      return {
        value: Number(entry.bloodOxygenEntry.percentage).toFixed(0),
        unit: "% SpO2",
      };
    }
    if (entry.entryType === "vo2_max" && entry.vo2MaxEntry) {
      return {
        value: Number(entry.vo2MaxEntry.value).toFixed(1),
        unit: "mL/kg/min",
      };
    }
    return { value: "—", unit: "" };
  };

  const isLoading = !shouldQuery || entriesLoading || medsLoading || suppsLoading;

  const entryTypeButtons = [
    { step: "weight" as const, icon: WeightScale01Icon, label: "Weight", color: "bg-blue-500/10 text-blue-500" },
    { step: "sleep" as const, icon: SleepingIcon, label: "Sleep", color: "bg-purple-500/10 text-purple-500" },
    { step: "glucose" as const, icon: TestTube02Icon, label: "Glucose", color: "bg-amber-500/10 text-amber-500" },
    { step: "medication" as const, icon: Medicine01Icon, label: "Medication", color: "bg-rose-500/10 text-rose-500" },
    { step: "supplement" as const, icon: Medicine01Icon, label: "Supplement", color: "bg-emerald-500/10 text-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Health Journal</h1>
          <p className="text-muted-foreground">
            Track your weight, sleep, glucose, and medications
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <HugeiconsIcon icon={Add01Icon} className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </div>

      {/* Tabs for Entries vs Medications */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          if (value === "entries" && selectedType === "medications") {
            setSelectedType("all");
          } else if (value === "medications") {
            setSelectedType("medications");
          }
        }}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="entries">
            Journal Entries
          </TabsTrigger>
          <TabsTrigger value="medications">
            Meds & Supplements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-4">
          {/* Filter Bar */}
          <Card className="p-4">
            <JournalFilterBar
              selectedType={selectedType === "medications" ? "all" : selectedType}
              onTypeChange={setSelectedType}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              onClearFilters={handleClearFilters}
            />
          </Card>

          {/* Entries List */}
          {isLoading ? (
            <Card className="p-6">
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            </Card>
          ) : sortedDates.length === 0 ? (
            <Card className="p-6">
              <JournalEmptyState onAddEntry={() => setIsAddOpen(true)} />
            </Card>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((date) => (
                <div key={date}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {format(parseISO(date), "EEEE, MMMM d, yyyy")}
                  </h3>
                  <div className="space-y-3">
                    {groupedEntries![date]?.map((entry) => {
                      const { value, unit, subtext } = getEntryValue(entry);
                      return (
                        <JournalEntryCard
                          key={entry.id}
                          id={entry.id}
                          type={entry.entryType as EntryType}
                          date={parseISO(entry.entryDate)}
                          value={value}
                          unit={unit}
                          subtext={subtext}
                          notes={entry.notes}
                          onDelete={(id) => setDeleteEntry(id)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="medications" className="space-y-4">
          {/* Medications Controls */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInactiveMeds(!showInactiveMeds)}
            >
              {showInactiveMeds ? "Hide" : "Show"} inactive
            </Button>
          </div>

          {/* Medications List */}
          {isLoading ? (
            <Card className="p-6">
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            </Card>
          ) : (
            <MedicationsList
              medications={medicationsData || []}
              supplements={supplementsData || []}
              showInactive={showInactiveMeds}
            />
          )}
        </TabsContent>

      </Tabs>

      {/* Add Entry Sheet */}
      <Sheet open={isAddOpen} onOpenChange={(open) => {
        setIsAddOpen(open);
        if (!open) setAddStep("select");
      }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {addStep === "select" ? "Add Entry" : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2"
                  onClick={() => setAddStep("select")}
                >
                  <HugeiconsIcon icon={ArrowLeft02Icon} className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
            </SheetTitle>
          </SheetHeader>

          <SheetBody>
            {addStep === "select" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {entryTypeButtons.map((btn) => (
                    <button
                      key={btn.step}
                      onClick={() => setAddStep(btn.step)}
                      className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    >
                      <div className={`p-3 rounded-lg ${btn.color}`}>
                        <HugeiconsIcon icon={btn.icon} className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-medium">{btn.label}</span>
                    </button>
                  ))}
                </div>
                <div className="pt-2 border-t">
                  <Button
                    onClick={() => setAddStep("import")}
                    className="w-full"
                  >
                    <HugeiconsIcon icon={SmartPhone01Icon} className="mr-2 h-4 w-4" />
                    Import from iPhone Health
                  </Button>
                </div>
              </div>
            )}

            {addStep === "weight" && (
              <WeightEntryForm onSuccess={handleAddSuccess} onCancel={() => setAddStep("select")} />
            )}
            {addStep === "sleep" && (
              <SleepEntryForm onSuccess={handleAddSuccess} onCancel={() => setAddStep("select")} />
            )}
            {addStep === "glucose" && (
              <GlucoseEntryForm onSuccess={handleAddSuccess} onCancel={() => setAddStep("select")} />
            )}
            {addStep === "medication" && (
              <MedicationForm onSuccess={handleAddSuccess} onCancel={() => setAddStep("select")} />
            )}
            {addStep === "supplement" && (
              <SupplementForm onSuccess={handleAddSuccess} onCancel={() => setAddStep("select")} />
            )}
            {addStep === "import" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Import activity, heart rate, sleep, weight, blood pressure, and more from your iPhone Health app.
                </p>
                <HealthExportUpload
                  householdMemberId={selectedMemberId}
                  onImportComplete={handleImportComplete}
                />
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteEntry} onOpenChange={() => setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this journal entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
