"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Upload02Icon,
  File01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  Loading02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { trpc } from "@/lib/trpc";
import type { HealthImportProgress } from "@/server/db/schema/health-data-imports";

interface HealthExportUploadProps {
  householdMemberId?: string;
  onImportComplete?: () => void;
}

const ALLOWED_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-zip",
];

export function HealthExportUpload({ householdMemberId, onImportComplete }: HealthExportUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [importId, setImportId] = useState<string | null>(null);
  const [shouldPoll, setShouldPoll] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const hasNotifiedCompletion = useRef(false);

  // Mutation to clear existing health data
  const clearDataMutation = trpc.journal.clearAllHealthData.useMutation();

  // Poll for import progress when we have an importId
  const { data: importProgress, refetch: refetchProgress } =
    trpc.journal.getImportProgress.useQuery(
      { importId: importId! },
      {
        enabled: !!importId && shouldPoll,
        refetchInterval: shouldPoll ? 2000 : false,
      }
    );

  // Stop polling when import completes or fails
  useEffect(() => {
    if (importProgress?.status === "completed" || importProgress?.status === "failed") {
      setShouldPoll(false);
    }
  }, [importProgress?.status]);

  // Notify parent when import completes (only once per import)
  useEffect(() => {
    if (importProgress?.status === "completed" && onImportComplete && !hasNotifiedCompletion.current) {
      hasNotifiedCompletion.current = true;
      onImportComplete();
    }
  }, [importProgress?.status, onImportComplete]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError("");

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (ALLOWED_TYPES.includes(droppedFile.type) || droppedFile.name.endsWith(".zip")) {
        setFile(droppedFile);
      } else {
        setError("Please upload a ZIP file exported from iPhone Health");
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (ALLOWED_TYPES.includes(selectedFile.type) || selectedFile.name.endsWith(".zip")) {
        setFile(selectedFile);
      } else {
        setError("Please upload a ZIP file exported from iPhone Health");
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (householdMemberId) {
        formData.append("householdMemberId", householdMemberId);
      }

      const response = await fetch("/api/upload/health-export", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      // Start polling for progress
      setImportId(data.importId);
      setShouldPoll(true);
      hasNotifiedCompletion.current = false;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload file. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError("");
    setImportId(null);
    setShouldPoll(false);
    hasNotifiedCompletion.current = false;
  };

  const resetUpload = () => {
    setFile(null);
    setError("");
    setImportId(null);
    setShouldPoll(false);
    hasNotifiedCompletion.current = false;
  };

  const handleClearAndReimport = async () => {
    setIsClearing(true);
    setError("");
    try {
      await clearDataMutation.mutateAsync({ householdMemberId });
      // Reset upload state after clearing
      resetUpload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear data");
    } finally {
      setIsClearing(false);
    }
  };

  // Calculate progress percentage
  const getProgressPercentage = (progress: HealthImportProgress | null | undefined): number => {
    if (!progress) return 0;
    if (progress.totalRecords === 0) return 50; // Parsing phase
    return Math.round((progress.currentRecord / progress.totalRecords) * 100);
  };

  // Get status display info
  const getStatusDisplay = (
    status: string | undefined,
    progress: HealthImportProgress | null | undefined
  ) => {
    switch (status) {
      case "pending":
        return { text: "Waiting to start...", phase: "pending" };
      case "extracting":
        return { text: "Extracting ZIP file...", phase: "extracting" };
      case "parsing":
        return {
          text: progress?.currentRecord
            ? `Parsing records... (${progress.currentRecord.toLocaleString()} processed)`
            : "Parsing health data...",
          phase: "parsing",
        };
      case "importing":
        return {
          text: progress
            ? `Importing records... (${progress.currentRecord.toLocaleString()} / ${progress.totalRecords.toLocaleString()})`
            : "Importing to database...",
          phase: "importing",
        };
      case "completed":
        return { text: "Import completed!", phase: "completed" };
      case "failed":
        return { text: "Import failed", phase: "failed" };
      default:
        return { text: "Processing...", phase: "unknown" };
    }
  };

  // Render progress/results view when we have an importId
  if (importId && importProgress) {
    const statusDisplay = getStatusDisplay(importProgress.status, importProgress.progress);
    const progressPercent = getProgressPercentage(importProgress.progress);
    const isProcessing = !["completed", "failed"].includes(importProgress.status);

    return (
      <Card className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            {isProcessing ? (
              <div className="p-3 rounded-full bg-primary/10 animate-pulse">
                <HugeiconsIcon
                  icon={Loading02Icon}
                  className="h-6 w-6 text-primary animate-spin"
                />
              </div>
            ) : importProgress.status === "completed" ? (
              <div className="p-3 rounded-full bg-emerald-500/10">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  className="h-6 w-6 text-emerald-500"
                />
              </div>
            ) : (
              <div className="p-3 rounded-full bg-destructive/10">
                <HugeiconsIcon
                  icon={AlertCircleIcon}
                  className="h-6 w-6 text-destructive"
                />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-foreground">{statusDisplay.text}</h3>
              <p className="text-sm text-muted-foreground">
                {importProgress.originalFileName}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {progressPercent}%
              </p>
            </div>
          )}

          {/* Results summary */}
          {importProgress.status === "completed" && importProgress.progress && (
            <div className="space-y-4">
              {/* Total summary */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10">
                <span className="text-sm text-muted-foreground">Total records imported</span>
                <span className="text-2xl font-bold text-foreground">
                  {importProgress.progress.recordsImported}
                </span>
              </div>

              {/* Breakdown grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(importProgress.progress.breakdown.activity?.imported ?? 0) > 0 && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xl font-bold text-foreground">
                      {importProgress.progress.breakdown.activity.imported}
                    </p>
                    <p className="text-xs text-muted-foreground">Activity</p>
                  </div>
                )}
                {(importProgress.progress.breakdown.heart_rate?.imported ?? 0) > 0 && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xl font-bold text-foreground">
                      {importProgress.progress.breakdown.heart_rate.imported}
                    </p>
                    <p className="text-xs text-muted-foreground">Heart Rate</p>
                  </div>
                )}
                {(importProgress.progress.breakdown.sleep?.imported ?? 0) > 0 && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xl font-bold text-foreground">
                      {importProgress.progress.breakdown.sleep.imported}
                    </p>
                    <p className="text-xs text-muted-foreground">Sleep</p>
                  </div>
                )}
                {(importProgress.progress.breakdown.weight?.imported ?? 0) > 0 && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xl font-bold text-foreground">
                      {importProgress.progress.breakdown.weight.imported}
                    </p>
                    <p className="text-xs text-muted-foreground">Weight</p>
                  </div>
                )}
                {(importProgress.progress.breakdown.glucose?.imported ?? 0) > 0 && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xl font-bold text-foreground">
                      {importProgress.progress.breakdown.glucose.imported}
                    </p>
                    <p className="text-xs text-muted-foreground">Glucose</p>
                  </div>
                )}
                {(importProgress.progress.breakdown.blood_pressure?.imported ?? 0) > 0 && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xl font-bold text-foreground">
                      {importProgress.progress.breakdown.blood_pressure.imported}
                    </p>
                    <p className="text-xs text-muted-foreground">Blood Pressure</p>
                  </div>
                )}
                {(importProgress.progress.breakdown.blood_oxygen?.imported ?? 0) > 0 && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xl font-bold text-foreground">
                      {importProgress.progress.breakdown.blood_oxygen.imported}
                    </p>
                    <p className="text-xs text-muted-foreground">Blood Oxygen</p>
                  </div>
                )}
                {(importProgress.progress.breakdown.vo2_max?.imported ?? 0) > 0 && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xl font-bold text-foreground">
                      {importProgress.progress.breakdown.vo2_max.imported}
                    </p>
                    <p className="text-xs text-muted-foreground">VO2 Max</p>
                  </div>
                )}
              </div>

              {/* Skipped records summary */}
              {importProgress.progress.recordsSkipped > 0 && (
                <div className="text-center space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {importProgress.progress.recordsSkipped} duplicate records skipped
                  </p>
                  {importProgress.progress.recordsImported === 0 && importProgress.progress.recordsSkipped > 100 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      All records already exist. To re-import with updated schema, clear existing data first.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {importProgress.status === "failed" && importProgress.error && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              {importProgress.error}
            </div>
          )}

          {/* Actions */}
          {!isProcessing && (
            <div className="space-y-2">
              <Button onClick={resetUpload} variant="outline" className="w-full">
                {importProgress.status === "completed"
                  ? "Import Another File"
                  : "Try Again"}
              </Button>
              {importProgress.status === "completed" &&
                importProgress.progress?.recordsImported === 0 &&
                (importProgress.progress?.recordsSkipped ?? 0) > 100 && (
                <Button
                  onClick={handleClearAndReimport}
                  variant="destructive"
                  className="w-full"
                  disabled={isClearing}
                >
                  {isClearing ? "Clearing..." : "Clear Existing Data & Re-import"}
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {!file ? (
        <div
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="flex flex-col items-center">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <HugeiconsIcon icon={Upload02Icon} className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-medium text-foreground mb-1">
              Drop your Health export here
            </p>
            <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
            <p className="text-xs text-muted-foreground">
              Supported format: ZIP (max 100MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <HugeiconsIcon icon={File01Icon} className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={removeFile}
              className="text-muted-foreground hover:text-destructive"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex space-x-3">
            <Button onClick={handleUpload} disabled={uploading} className="flex-1">
              {uploading ? "Uploading..." : "Import Health Data"}
            </Button>
            <Button variant="outline" onClick={removeFile}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
