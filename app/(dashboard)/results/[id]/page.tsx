"use client";

import { use, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft01Icon,
  TestTube02Icon,
  Calendar02Icon,
  Building02Icon,
  PencilEdit01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  RefreshIcon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format } from "date-fns";
import { convertToCanonical, getCanonicalUnit, formatNumber } from "@/lib/units";

interface EditedResult {
  id: string;
  value: string;
  unit: string;
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedResults, setEditedResults] = useState<Record<string, EditedResult>>({});

  const utils = trpc.useUtils();
  const { data: bloodTest, isLoading } = trpc.bloodTest.getById.useQuery({
    id,
  });

  const updateMutation = trpc.bloodTest.updateResults.useMutation({
    onSuccess: () => {
      utils.bloodTest.getById.invalidate({ id });
      utils.bloodTest.getRecentComparison.invalidate();
      setIsEditMode(false);
      setEditedResults({});
    },
  });

  const retryMutation = trpc.bloodTest.retryProcessing.useMutation({
    onSuccess: () => {
      utils.bloodTest.getById.invalidate({ id });
    },
  });

  const handleEditClick = () => {
    if (bloodTest?.results) {
      // Initialize edited results with current values
      const initial: Record<string, EditedResult> = {};
      bloodTest.results.forEach((result) => {
        initial[result.id] = {
          id: result.id,
          value: result.value,
          unit: result.unit,
        };
      });
      setEditedResults(initial);
      setIsEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedResults({});
  };

  const handleValueChange = (resultId: string, value: string) => {
    setEditedResults((prev) => ({
      ...prev,
      [resultId]: {
        ...prev[resultId],
        value,
      },
    }));
  };

  const handleUnitChange = (resultId: string, unit: string) => {
    setEditedResults((prev) => ({
      ...prev,
      [resultId]: {
        ...prev[resultId],
        unit,
      },
    }));
  };

  const handleSaveChanges = () => {
    const results = Object.values(editedResults);
    updateMutation.mutate({
      id,
      results,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!bloodTest) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Blood test not found</p>
        <Link href="/history">
          <Button variant="outline" className="mt-4">
            <HugeiconsIcon icon={ArrowLeft01Icon} className="mr-2 h-4 w-4" />
            Back to History
          </Button>
        </Link>
      </div>
    );
  }

  // Group results by category
  const resultsByCategory = bloodTest.results?.reduce(
    (acc, result) => {
      const category = result.biomarker?.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(result);
      return acc;
    },
    {} as Record<string, typeof bloodTest.results>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/history">
            <Button variant="ghost" size="icon">
              <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Blood Test Results
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(bloodTest.testDate), "MMMM d, yyyy")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {bloodTest.status === "review" && (
            <Link href={`/results/${id}/review`}>
              <Button>Review & Confirm</Button>
            </Link>
          )}

          {bloodTest.status === "completed" && !isEditMode && (
            <Button variant="outline" onClick={handleEditClick}>
              <HugeiconsIcon icon={PencilEdit01Icon} className="mr-2 h-4 w-4" />
              Edit Results
            </Button>
          )}

          {isEditMode && (
            <>
              <Button variant="outline" onClick={handleCancelEdit}>
                <HugeiconsIcon icon={Cancel01Icon} className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveChanges}
                disabled={updateMutation.isPending}
              >
                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Test Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-primary/10">
              <HugeiconsIcon
                icon={Calendar02Icon}
                className="h-5 w-5 text-primary"
              />
            </div>
            <div className="ml-3">
              <p className="text-sm text-muted-foreground">Test Date</p>
              <p className="font-medium text-foreground">
                {format(new Date(bloodTest.testDate), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-primary/10">
              <HugeiconsIcon
                icon={Building02Icon}
                className="h-5 w-5 text-primary"
              />
            </div>
            <div className="ml-3">
              <p className="text-sm text-muted-foreground">Laboratory</p>
              <p className="font-medium text-foreground">
                {bloodTest.labName || "Unknown"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-primary/10">
              <HugeiconsIcon
                icon={TestTube02Icon}
                className="h-5 w-5 text-primary"
              />
            </div>
            <div className="ml-3">
              <p className="text-sm text-muted-foreground">Biomarkers</p>
              <p className="font-medium text-foreground">
                {bloodTest.results?.length || 0} results
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Results by Category */}
      {bloodTest.status === "completed" &&
      resultsByCategory &&
      Object.keys(resultsByCategory).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(resultsByCategory).map(([category, results]) => (
            <Card key={category} className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {category}
              </h2>

              <div className="space-y-3">
                {results?.map((result) => {
                  const biomarkerCode = result.biomarker?.code || "";
                  const canonicalUnit = getCanonicalUnit(biomarkerCode);

                  // In edit mode, show editable fields with original values
                  if (isEditMode) {
                    const edited = editedResults[result.id];
                    return (
                      <div
                        key={result.id}
                        className="flex items-center justify-between py-3 border-b border-border last:border-0"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {result.biomarker?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {result.biomarker?.code}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="any"
                            value={edited?.value || ""}
                            onChange={(e) => handleValueChange(result.id, e.target.value)}
                            className="w-24 text-right"
                          />
                          <Input
                            type="text"
                            value={edited?.unit || ""}
                            onChange={(e) => handleUnitChange(result.id, e.target.value)}
                            className="w-24"
                          />
                        </div>
                      </div>
                    );
                  }

                  // Display mode - convert to canonical unit
                  const numValue = parseFloat(result.value);
                  let displayValue = numValue;
                  let displayUnit = result.unit;

                  if (canonicalUnit && !isNaN(numValue)) {
                    const converted = convertToCanonical(numValue, biomarkerCode, result.unit);
                    if (converted !== null) {
                      displayValue = converted;
                      displayUnit = canonicalUnit;
                    }
                  }

                  return (
                    <div
                      key={result.id}
                      className="flex items-center justify-between py-3 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {result.biomarker?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {result.biomarker?.code}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-medium ${
                            result.isOutOfRange
                              ? "text-destructive"
                              : "text-foreground"
                          }`}
                        >
                          {formatNumber(displayValue)} {displayUnit}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      ) : bloodTest.status !== "completed" ? (
        <Card className="p-6">
          <div className="text-center py-8">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${
              bloodTest.status === "failed" ? "bg-destructive/10" : "bg-warning/10"
            }`}>
              <HugeiconsIcon
                icon={bloodTest.status === "failed" ? AlertCircleIcon : TestTube02Icon}
                className={`h-6 w-6 ${
                  bloodTest.status === "failed" ? "text-destructive" : "text-warning"
                }`}
              />
            </div>
            <p className="text-lg font-medium text-foreground mb-2">
              {bloodTest.status === "pending" && "Processing..."}
              {bloodTest.status === "processing" && "Analyzing results..."}
              {bloodTest.status === "review" && "Ready for review"}
              {bloodTest.status === "failed" && "Processing failed"}
            </p>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {bloodTest.status === "pending" &&
                "Your blood test is being processed"}
              {bloodTest.status === "processing" &&
                "Our AI is extracting biomarker values"}
              {bloodTest.status === "review" &&
                "Please review the extracted results"}
              {bloodTest.status === "failed" &&
                (bloodTest.processingError || "An error occurred during processing")}
            </p>

            {bloodTest.status === "review" && (
              <Link href={`/results/${id}/review`}>
                <Button>Review Results</Button>
              </Link>
            )}

            {bloodTest.status === "failed" && (
              <Button
                onClick={() => retryMutation.mutate({ id })}
                disabled={retryMutation.isPending}
              >
                <HugeiconsIcon icon={RefreshIcon} className="mr-2 h-4 w-4" />
                {retryMutation.isPending ? "Retrying..." : "Retry Processing"}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">No results found</p>
          </div>
        </Card>
      )}
    </div>
  );
}
