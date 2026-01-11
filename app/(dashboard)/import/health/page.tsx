"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft02Icon,
  SmartPhone01Icon,
  HealthIcon,
  Share08Icon,
  FileExportIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { HealthExportUpload } from "@/components/upload/health-export-upload";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

export default function ImportHealthPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [showInstructions, setShowInstructions] = useState(true);

  // Get recent imports
  const { data: imports, refetch: refetchImports } = trpc.journal.getImports.useQuery({
    limit: 5,
  });

  const handleImportComplete = () => {
    // Refresh the imports list and journal data
    refetchImports();
    utils.journal.getAll.invalidate();
    utils.journal.getLatestByType.invalidate();
    utils.journal.getWeeklyStats.invalidate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Import iPhone Health Data
          </h1>
          <p className="text-muted-foreground">
            Import sleep, weight, and glucose data from your iPhone Health app
          </p>
        </div>
      </div>

      {/* Instructions card */}
      {showInstructions && (
        <Card className="p-6 bg-muted/50 border-dashed">
          <div className="flex justify-between items-start mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <HugeiconsIcon
                icon={SmartPhone01Icon}
                className="h-5 w-5 text-primary"
              />
              How to export your Health data
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInstructions(false)}
              className="text-muted-foreground"
            >
              Hide
            </Button>
          </div>

          <ol className="space-y-4 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                1
              </span>
              <div>
                <p className="text-foreground font-medium">Open the Health app</p>
                <p>
                  On your iPhone, open the{" "}
                  <span className="inline-flex items-center gap-1">
                    <HugeiconsIcon icon={HealthIcon} className="h-4 w-4" />
                    Health
                  </span>{" "}
                  app
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                2
              </span>
              <div>
                <p className="text-foreground font-medium">
                  Go to your profile
                </p>
                <p>Tap your profile picture in the top-right corner</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                3
              </span>
              <div>
                <p className="text-foreground font-medium">Export your data</p>
                <p>
                  Scroll down and tap{" "}
                  <span className="inline-flex items-center gap-1 text-foreground">
                    <HugeiconsIcon icon={FileExportIcon} className="h-4 w-4" />
                    Export All Health Data
                  </span>
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                4
              </span>
              <div>
                <p className="text-foreground font-medium">Wait for export</p>
                <p>
                  The export may take several minutes depending on how much data you
                  have
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                5
              </span>
              <div>
                <p className="text-foreground font-medium">
                  Share or save the ZIP file
                </p>
                <p>
                  When ready, tap{" "}
                  <span className="inline-flex items-center gap-1 text-foreground">
                    <HugeiconsIcon icon={Share08Icon} className="h-4 w-4" />
                    Share
                  </span>{" "}
                  and save the file to your device or share directly to this page
                </p>
              </div>
            </li>
          </ol>
        </Card>
      )}

      {/* Upload component */}
      <HealthExportUpload onImportComplete={handleImportComplete} />

      {/* Info card */}
      <Card className="p-6">
        <h3 className="font-medium text-foreground mb-3">What gets imported?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-blue-500/10">
            <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">
              Weight
            </p>
            <p className="text-muted-foreground">
              Body mass measurements from Health app or connected scales
            </p>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10">
            <p className="font-medium text-purple-700 dark:text-purple-400 mb-1">
              Sleep
            </p>
            <p className="text-muted-foreground">
              Sleep duration from Apple Watch or sleep tracking apps
            </p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10">
            <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">
              Glucose
            </p>
            <p className="text-muted-foreground">
              Blood glucose readings from connected devices
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Only the last year of data will be imported. Existing journal entries will
          not be overwritten.
        </p>
      </Card>

      {/* Recent imports */}
      {imports && imports.length > 0 && (
        <Card className="p-6">
          <h3 className="font-medium text-foreground mb-4">Recent Imports</h3>
          <div className="space-y-3">
            {imports.map((imp) => (
              <div
                key={imp.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted"
              >
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {imp.originalFileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(imp.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      imp.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : imp.status === "failed"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
                    }`}
                  >
                    {imp.status === "completed"
                      ? "Completed"
                      : imp.status === "failed"
                        ? "Failed"
                        : "Processing"}
                  </span>
                  {imp.status === "completed" && imp.progress && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {imp.progress.recordsImported} records imported
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
