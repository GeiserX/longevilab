"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Medicine01Icon,
  Delete02Icon,
  Edit02Icon,
  Tick01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
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

type Medication = {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  notes: string | null;
};

type Supplement = {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  notes: string | null;
};

interface MedicationsListProps {
  medications: Medication[];
  supplements: Supplement[];
  showInactive?: boolean;
}

const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  twice_daily: "Twice daily",
  weekly: "Weekly",
  as_needed: "As needed",
  other: "Other",
};

export function MedicationsList({ medications, supplements, showInactive = false }: MedicationsListProps) {
  const [deleteItem, setDeleteItem] = useState<{ id: string; type: "medication" | "supplement" } | null>(null);

  const utils = trpc.useUtils();

  const toggleMedication = trpc.medications.toggleMedicationActive.useMutation({
    onSuccess: () => utils.medications.invalidate(),
  });

  const toggleSupplement = trpc.medications.toggleSupplementActive.useMutation({
    onSuccess: () => utils.medications.invalidate(),
  });

  const deleteMedication = trpc.medications.deleteMedication.useMutation({
    onSuccess: () => utils.medications.invalidate(),
  });

  const deleteSupplement = trpc.medications.deleteSupplement.useMutation({
    onSuccess: () => utils.medications.invalidate(),
  });

  const handleToggle = (id: string, type: "medication" | "supplement") => {
    if (type === "medication") {
      toggleMedication.mutate({ id });
    } else {
      toggleSupplement.mutate({ id });
    }
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    if (deleteItem.type === "medication") {
      deleteMedication.mutate({ id: deleteItem.id });
    } else {
      deleteSupplement.mutate({ id: deleteItem.id });
    }
    setDeleteItem(null);
  };

  const filteredMedications = showInactive ? medications : medications.filter((m) => m.isActive);
  const filteredSupplements = showInactive ? supplements : supplements.filter((s) => s.isActive);

  if (filteredMedications.length === 0 && filteredSupplements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {showInactive ? "No medications or supplements found." : "No active medications or supplements."}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Medications */}
        {filteredMedications.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Medications</h3>
            <div className="space-y-3">
              {filteredMedications.map((med) => (
                <Card key={med.id} className={`p-4 ${!med.isActive ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                        <HugeiconsIcon icon={Medicine01Icon} className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{med.name}</span>
                          {!med.isActive && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        {med.dosage && (
                          <div className="text-sm text-muted-foreground">{med.dosage}</div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          {med.frequency ? (frequencyLabels[med.frequency] || med.frequency) : "No frequency set"} • Started {format(new Date(med.startDate), "MMM d, yyyy")}
                        </div>
                        {med.notes && (
                          <p className="text-sm text-muted-foreground mt-1 italic">{med.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggle(med.id, "medication")}
                        title={med.isActive ? "Mark as inactive" : "Mark as active"}
                      >
                        <HugeiconsIcon
                          icon={med.isActive ? Cancel01Icon : Tick01Icon}
                          className="h-4 w-4"
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteItem({ id: med.id, type: "medication" })}
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Supplements */}
        {filteredSupplements.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Supplements</h3>
            <div className="space-y-3">
              {filteredSupplements.map((supp) => (
                <Card key={supp.id} className={`p-4 ${!supp.isActive ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <HugeiconsIcon icon={Medicine01Icon} className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{supp.name}</span>
                          {!supp.isActive && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        {supp.dosage && (
                          <div className="text-sm text-muted-foreground">{supp.dosage}</div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          {supp.frequency ? (frequencyLabels[supp.frequency] || supp.frequency) : "No frequency set"} • Started {format(new Date(supp.startDate), "MMM d, yyyy")}
                        </div>
                        {supp.notes && (
                          <p className="text-sm text-muted-foreground mt-1 italic">{supp.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggle(supp.id, "supplement")}
                        title={supp.isActive ? "Mark as inactive" : "Mark as active"}
                      >
                        <HugeiconsIcon
                          icon={supp.isActive ? Cancel01Icon : Tick01Icon}
                          className="h-4 w-4"
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteItem({ id: supp.id, type: "supplement" })}
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteItem?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this {deleteItem?.type} from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
