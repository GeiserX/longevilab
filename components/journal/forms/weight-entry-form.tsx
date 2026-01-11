"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldContent, FieldError } from "@/components/ui/field";

interface WeightEntryFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function WeightEntryForm({ onSuccess, onCancel }: WeightEntryFormProps) {
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [weight, setWeight] = useState("");
  const [bodyFatPercentage, setBodyFatPercentage] = useState("");
  const [waistCircumference, setWaistCircumference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const createWeight = trpc.journal.createWeight.useMutation({
    onSuccess: () => {
      utils.journal.invalidate();
      onSuccess();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!weight || isNaN(parseFloat(weight))) {
      setError("Please enter a valid weight");
      return;
    }

    createWeight.mutate({
      entryDate,
      weight,
      bodyFatPercentage: bodyFatPercentage || undefined,
      waistCircumference: waistCircumference || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field>
        <FieldLabel>Date</FieldLabel>
        <FieldContent>
          <Input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            required
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Weight (kg)</FieldLabel>
        <FieldContent>
          <Input
            type="number"
            step="0.1"
            placeholder="e.g., 72.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Body Fat % (optional)</FieldLabel>
        <FieldContent>
          <Input
            type="number"
            step="0.1"
            placeholder="e.g., 18.5"
            value={bodyFatPercentage}
            onChange={(e) => setBodyFatPercentage(e.target.value)}
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Waist Circumference (cm, optional)</FieldLabel>
        <FieldContent>
          <Input
            type="number"
            step="0.1"
            placeholder="e.g., 82"
            value={waistCircumference}
            onChange={(e) => setWaistCircumference(e.target.value)}
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Notes (optional)</FieldLabel>
        <FieldContent>
          <Textarea
            placeholder="Any notes about this measurement..."
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
        <Button type="submit" className="flex-1" disabled={createWeight.isPending}>
          {createWeight.isPending ? "Saving..." : "Save Entry"}
        </Button>
      </div>
    </form>
  );
}
