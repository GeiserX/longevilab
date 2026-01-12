"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { HealthExportUpload } from "@/components/upload/health-export-upload";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

export default function ImportHealthPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

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
            Import activity, heart rate, sleep, weight, blood pressure, and more from your iPhone Health app
          </p>
        </div>
      </div>

      {/* Upload component */}
      <HealthExportUpload onImportComplete={handleImportComplete} />

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
