"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldContent, FieldError, FieldDescription } from "@/components/ui/field";

interface GlucoseEntryFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type ReadingType = "fasting" | "post_meal" | "random";

const readingTypes: { value: ReadingType; label: string; description: string }[] = [
  { value: "fasting", label: "Fasting", description: "Before eating (8+ hours)" },
  { value: "post_meal", label: "Post-meal", description: "After eating" },
  { value: "random", label: "Random", description: "Any other time" },
];

export function GlucoseEntryForm({ onSuccess, onCancel }: GlucoseEntryFormProps) {
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [value, setValue] = useState("");
  const [readingType, setReadingType] = useState<ReadingType>("fasting");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const createGlucose = trpc.journal.createGlucose.useMutation({
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

    if (!value || isNaN(parseFloat(value))) {
      setError("Please enter a valid glucose value");
      return;
    }

    createGlucose.mutate({
      entryDate,
      value,
      readingType,
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
        <FieldLabel>Glucose (mmol/L)</FieldLabel>
        <FieldDescription>Enter your blood glucose reading</FieldDescription>
        <FieldContent>
          <Input
            type="number"
            step="0.1"
            placeholder="e.g., 5.2"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Reading Type</FieldLabel>
        <FieldContent>
          <div className="grid gap-2">
            {readingTypes.map((type) => (
              <Button
                key={type.value}
                type="button"
                variant={readingType === type.value ? "default" : "outline"}
                className="justify-start h-auto py-3"
                onClick={() => setReadingType(type.value)}
              >
                <div className="text-left">
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs opacity-70">{type.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Notes (optional)</FieldLabel>
        <FieldContent>
          <Textarea
            placeholder="Any notes about this reading..."
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
        <Button type="submit" className="flex-1" disabled={createGlucose.isPending}>
          {createGlucose.isPending ? "Saving..." : "Save Entry"}
        </Button>
      </div>
    </form>
  );
}
