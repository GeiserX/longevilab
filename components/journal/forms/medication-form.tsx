"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Field, FieldLabel, FieldContent, FieldError, FieldDescription } from "@/components/ui/field";

interface MedicationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type Frequency = "daily" | "twice_daily" | "weekly" | "as_needed" | "other";

const frequencies: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Once daily" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "weekly", label: "Weekly" },
  { value: "as_needed", label: "As needed" },
  { value: "other", label: "Other" },
];

export function MedicationForm({ onSuccess, onCancel }: MedicationFormProps) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const createMedication = trpc.medications.createMedication.useMutation({
    onSuccess: () => {
      utils.medications.invalidate();
      onSuccess();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter the medication name");
      return;
    }

    createMedication.mutate({
      name: name.trim(),
      dosage: dosage || undefined,
      frequency,
      startDate,
      notes: notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field>
        <FieldLabel>Medication Name</FieldLabel>
        <FieldContent>
          <Input
            type="text"
            placeholder="e.g., Metformin"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Dosage (optional)</FieldLabel>
        <FieldDescription>Include strength and form</FieldDescription>
        <FieldContent>
          <Input
            type="text"
            placeholder="e.g., 500mg tablet"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Frequency</FieldLabel>
        <FieldContent>
          <Select value={frequency} onValueChange={(value) => setFrequency(value as Frequency)}>
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {frequencies.map((freq) => (
                <SelectItem key={freq.value} value={freq.value}>
                  {freq.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Start Date</FieldLabel>
        <FieldContent>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Notes (optional)</FieldLabel>
        <FieldContent>
          <Textarea
            placeholder="Any notes about this medication..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </FieldContent>
      </Field>

      {error && <FieldError className="text-destructive text-sm">{error}</FieldError>}

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Back
        </Button>
        <Button type="submit" className="flex-1" disabled={createMedication.isPending}>
          {createMedication.isPending ? "Saving..." : "Add Medication"}
        </Button>
      </div>
    </form>
  );
}
