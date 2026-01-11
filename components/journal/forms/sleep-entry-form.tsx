"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldContent, FieldError, FieldDescription } from "@/components/ui/field";

interface SleepEntryFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const qualityLabels = ["Poor", "Fair", "Good", "Very Good", "Excellent"];

export function SleepEntryForm({ onSuccess, onCancel }: SleepEntryFormProps) {
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("0");
  const [quality, setQuality] = useState<number>(3);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const createSleep = trpc.journal.createSleep.useMutation({
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

    const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (totalMinutes <= 0 || totalMinutes > 1440) {
      setError("Please enter a valid sleep duration (0-24 hours)");
      return;
    }

    createSleep.mutate({
      entryDate,
      durationMinutes: totalMinutes,
      quality,
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

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>Hours</FieldLabel>
          <FieldContent>
            <Input
              type="number"
              min="0"
              max="24"
              placeholder="7"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>Minutes</FieldLabel>
          <FieldContent>
            <Input
              type="number"
              min="0"
              max="59"
              placeholder="30"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </FieldContent>
        </Field>
      </div>

      <Field>
        <FieldLabel>Sleep Quality</FieldLabel>
        <FieldDescription>How well did you sleep?</FieldDescription>
        <FieldContent>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <Button
                key={value}
                type="button"
                variant={quality === value ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setQuality(value)}
              >
                {value}
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center mt-2">
            {qualityLabels[quality - 1]}
          </p>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Notes (optional)</FieldLabel>
        <FieldContent>
          <Textarea
            placeholder="Any notes about your sleep..."
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
        <Button type="submit" className="flex-1" disabled={createSleep.isPending}>
          {createSleep.isPending ? "Saving..." : "Save Entry"}
        </Button>
      </div>
    </form>
  );
}
