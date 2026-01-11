"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload02Icon,
  Calendar02Icon,
  ArrowRight01Icon,
  Delete01Icon,
  RefreshIcon,
  Download02Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format } from "date-fns";

export default function HistoryPage() {
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(undefined);

  const utils = trpc.useUtils();
  const { data: members } = trpc.household.getMembers.useQuery();
  const { data: tests, isLoading } = trpc.bloodTest.getAll.useQuery(
    selectedMemberId ? { householdMemberId: selectedMemberId } : undefined
  );

  const deleteTest = trpc.bloodTest.delete.useMutation({
    onSuccess: () => {
      utils.bloodTest.getAll.invalidate();
    },
  });

  const retryTest = trpc.bloodTest.retryProcessing.useMutation({
    onSuccess: () => {
      utils.bloodTest.getAll.invalidate();
    },
  });

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this blood test?")) {
      deleteTest.mutate({ id });
    }
  };

  const handleRetry = (id: string) => {
    retryTest.mutate({ id });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Test History</h1>
          <p className="text-muted-foreground">
            View all your past blood test results
          </p>
        </div>
        <div className="flex items-center gap-3">
          {members && members.length > 1 && (
            <div className="relative">
              <select
                value={selectedMemberId || ""}
                onChange={(e) => setSelectedMemberId(e.target.value || undefined)}
                className="h-9 rounded-4xl border border-input bg-input/30 px-3 pr-10 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none appearance-none cursor-pointer"
              >
                <option value="">All Members</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} {member.isPrimary ? "(You)" : ""}
                  </option>
                ))}
              </select>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
              />
            </div>
          )}
          <Link href="/upload">
            <Button>
              <HugeiconsIcon icon={Upload02Icon} className="mr-2 h-4 w-4" />
              Upload Test
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </Card>
      ) : !tests || tests.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
              <HugeiconsIcon
                icon={Calendar02Icon}
                className="h-6 w-6 text-muted-foreground"
              />
            </div>
            <p className="text-muted-foreground mb-4">
              No blood tests found. Upload your first test to get started.
            </p>
            <Link href="/upload">
              <Button variant="outline">
                <HugeiconsIcon icon={Upload02Icon} className="mr-2 h-4 w-4" />
                Upload Test
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => (
            <Card key={test.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <HugeiconsIcon
                      icon={Calendar02Icon}
                      className="h-5 w-5 text-primary"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">
                        {format(new Date(test.testDate), "MMMM d, yyyy")}
                      </p>
                      {test.householdMember && !selectedMemberId && (
                        <Badge variant="secondary" className="text-xs">
                          {test.householdMember.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {test.labName || "Unknown Lab"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      test.status === "completed"
                        ? "bg-success/10 text-success"
                        : test.status === "review"
                          ? "bg-warning/10 text-warning"
                          : test.status === "failed"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {test.status}
                  </span>

                  {test.status === "failed" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRetry(test.id)}
                      disabled={retryTest.isPending}
                      className="text-muted-foreground hover:text-primary"
                      title="Retry processing"
                    >
                      <HugeiconsIcon icon={RefreshIcon} className="h-4 w-4" />
                    </Button>
                  )}

                  {test.originalFilePath && (
                    <a
                      href={`/api/download/${test.id}`}
                      download
                    >
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-primary"
                        title="Download original file"
                      >
                        <HugeiconsIcon icon={Download02Icon} className="h-4 w-4" />
                      </Button>
                    </a>
                  )}

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(test.id)}
                    disabled={deleteTest.isPending}
                    className="text-muted-foreground hover:text-destructive"
                    title="Delete test"
                  >
                    <HugeiconsIcon icon={Delete01Icon} className="h-4 w-4" />
                  </Button>

                  <Link
                    href={
                      test.status === "review"
                        ? `/results/${test.id}/review`
                        : `/results/${test.id}`
                    }
                  >
                    <Button variant="outline" size="sm">
                      {test.status === "review" ? "Review" : "View"}
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        className="ml-1 h-4 w-4"
                      />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
