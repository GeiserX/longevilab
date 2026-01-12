"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Delete02Icon,
  CheckmarkCircle02Icon,
  ArrowLeft02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import {
  formatReferenceRange,
  isOutOfRange as checkIsOutOfRange,
  formatNumber,
} from "@/lib/units";

interface EditableResult {
  id?: string;
  biomarkerId: string;
  biomarkerName?: string;
  biomarkerCode?: string;
  value: string;
  unit: string;
  isNew?: boolean;
}

interface ReferenceRange {
  minValue: string | null;
  maxValue: string | null;
  unit: string;
}

export default function ReviewPage() {
  const router = useRouter();
  const params = useParams();
  const bloodTestId = params.id as string;

  const [testDate, setTestDate] = useState("");
  const [labName, setLabName] = useState("");
  const [results, setResults] = useState<EditableResult[]>([]);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error } = trpc.bloodTest.getReview.useQuery(
    { id: bloodTestId },
    { enabled: !!bloodTestId }
  );

  const { data: referenceRanges } =
    trpc.biomarker.getAllReferenceRanges.useQuery();

  const confirmMutation = trpc.bloodTest.confirmResults.useMutation({
    onSuccess: () => {
      router.push(`/results/${bloodTestId}`);
    },
  });

  // Initialize state when data loads
  useEffect(() => {
    if (data?.bloodTest) {
      setTestDate(data.bloodTest.testDate);
      setLabName(data.bloodTest.labName || "");
      setResults(
        data.bloodTest.results?.map((r) => ({
          id: r.id,
          biomarkerId: r.biomarkerId,
          biomarkerName: r.biomarker?.name,
          biomarkerCode: r.biomarker?.code,
          value: r.value,
          unit: r.unit,
        })) || []
      );
    }
  }, [data]);

  // Check if a value is out of range using unit conversion
  const checkOutOfRange = (
    value: string,
    unit: string,
    biomarkerCode: string | undefined,
    range: ReferenceRange | undefined
  ): boolean => {
    if (!range || !value || !biomarkerCode) return false;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return false;

    return checkIsOutOfRange(
      numValue,
      unit,
      range.minValue,
      range.maxValue,
      range.unit,
      biomarkerCode
    );
  };

  // Format reference range for display in user's unit
  const formatRange = (
    biomarkerCode: string | undefined,
    unit: string,
    range: ReferenceRange | undefined
  ): string => {
    if (!range || !biomarkerCode) return "—";
    return formatReferenceRange(
      range.minValue,
      range.maxValue,
      range.unit,
      biomarkerCode,
      unit
    );
  };

  const handleValueChange = (index: number, value: string) => {
    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, value } : r))
    );
  };

  const handleUnitChange = (index: number, unit: string) => {
    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, unit } : r))
    );
  };

  const handleRemoveResult = (index: number) => {
    setResults((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddBiomarker = (biomarkerId: string) => {
    const biomarker = data?.allBiomarkers.find((b) => b.id === biomarkerId);
    if (biomarker) {
      setResults((prev) => [
        ...prev,
        {
          biomarkerId: biomarker.id,
          biomarkerName: biomarker.name,
          biomarkerCode: biomarker.code,
          value: "",
          unit: biomarker.canonicalUnit,
          isNew: true,
        },
      ]);
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await confirmMutation.mutateAsync({
        id: bloodTestId,
        testDate,
        labName: labName || undefined,
        results: results
          .filter((r) => r.value.trim() !== "")
          .map((r) => ({
            id: r.id,
            biomarkerId: r.biomarkerId,
            value: r.value,
            unit: r.unit,
            isOutOfRange: checkOutOfRange(
              r.value,
              r.unit,
              r.biomarkerCode,
              referenceRanges?.[r.biomarkerId]
            ),
          })),
      });
    } catch {
      // Error handling
    } finally {
      setSaving(false);
    }
  };

  // Get biomarkers not yet added
  const availableBiomarkers =
    data?.allBiomarkers.filter(
      (b) => !results.some((r) => r.biomarkerId === b.id)
    ) || [];

  // Count out of range values
  const outOfRangeCount = useMemo(() => {
    return results.filter((r) =>
      checkOutOfRange(
        r.value,
        r.unit,
        r.biomarkerCode,
        referenceRanges?.[r.biomarkerId]
      )
    ).length;
  }, [results, referenceRanges]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive mb-4">Failed to load blood test</p>
        <Link href="/history">
          <Button variant="outline">Back to History</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/history">
            <Button variant="ghost" size="icon">
              <HugeiconsIcon icon={ArrowLeft02Icon} className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Review Results
            </h1>
            <p className="text-muted-foreground">
              Review and confirm the extracted biomarker values
            </p>
          </div>
        </div>
      </div>

      {/* Test Info */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Test Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Test Date
            </label>
            <Input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Lab Name
            </label>
            <Input
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              placeholder="Enter lab name (optional)"
            />
          </div>
        </div>
      </Card>

      {/* Extracted Results */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Biomarker Results ({results.length})
            </h2>
            {outOfRangeCount > 0 && (
              <p className="text-sm text-destructive">
                {outOfRangeCount} value{outOfRangeCount > 1 ? "s" : ""} outside
                reference range
              </p>
            )}
          </div>
        </div>

        {results.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center">
            No biomarkers extracted. Add biomarkers manually below.
          </p>
        ) : (
          <div className="space-y-3">
            {results.map((result, index) => {
              const range = referenceRanges?.[result.biomarkerId];
              const isOutOfRange = checkOutOfRange(
                result.value,
                result.unit,
                result.biomarkerCode,
                range
              );
              const referenceText = formatRange(
                result.biomarkerCode,
                result.unit,
                range
              );

              // Format the display value
              const displayValue = result.value
                ? formatNumber(parseFloat(result.value))
                : result.value;

              return (
                <div
                  key={result.id || `new-${index}`}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    isOutOfRange
                      ? "bg-destructive/10 border border-destructive/30"
                      : "bg-muted"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium truncate ${
                        isOutOfRange
                          ? "text-destructive font-bold"
                          : "text-foreground"
                      }`}
                    >
                      {result.biomarkerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {result.biomarkerCode}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ref: {referenceText}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={result.value}
                      onChange={(e) => handleValueChange(index, e.target.value)}
                      className={`w-24 ${
                        isOutOfRange
                          ? "border-destructive font-bold text-destructive"
                          : ""
                      }`}
                      placeholder="Value"
                    />
                    <Input
                      type="text"
                      value={result.unit}
                      onChange={(e) => handleUnitChange(index, e.target.value)}
                      className="w-24"
                      placeholder="Unit"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveResult(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Biomarker */}
        {availableBiomarkers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Add Biomarker
            </label>
            <Select onValueChange={(value: string | null) => value && handleAddBiomarker(value)}>
              <SelectTrigger className="w-full md:w-72">
                <SelectValue placeholder="Select a biomarker to add" />
              </SelectTrigger>
              <SelectContent>
                {availableBiomarkers.map((biomarker) => (
                  <SelectItem key={biomarker.id} value={biomarker.id}>
                    {biomarker.name} ({biomarker.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Link href="/history">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button
          onClick={handleConfirm}
          disabled={saving || results.length === 0}
        >
          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Confirm Results"}
        </Button>
      </div>
    </div>
  );
}
