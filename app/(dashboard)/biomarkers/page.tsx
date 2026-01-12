"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { useSelectedMember } from "@/contexts/selected-member-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload02Icon,
  TestTube02Icon,
  Calendar02Icon,
  ArrowRight01Icon,
  Delete01Icon,
  RefreshIcon,
  Download02Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format } from "date-fns";
import {
  buildComparisonData,
  type RecentTest,
  type ReferenceRanges,
  type BiomarkerWithEducation,
  type ComparisonRow,
} from "@/lib/comparison-utils";
import { BiomarkerTableExpandable } from "@/components/biomarkers";

export default function BiomarkersPage() {
  const { selectedMemberId: globalMemberId } = useSelectedMember();
  const [localMemberId, setLocalMemberId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("comparison");

  // Sync with global member selection when it changes
  useEffect(() => {
    setLocalMemberId(globalMemberId);
  }, [globalMemberId]);

  // Use local selection for queries (allows "All Members" option)
  const selectedMemberId = localMemberId;

  const utils = trpc.useUtils();
  const { data: members } = trpc.household.getMembers.useQuery();
  const { data: latestTest, isLoading } = trpc.bloodTest.getLatest.useQuery(
    selectedMemberId ? { householdMemberId: selectedMemberId } : undefined
  );
  const { data: allTests } = trpc.bloodTest.getAll.useQuery(
    selectedMemberId ? { householdMemberId: selectedMemberId } : undefined
  );
  const { data: recentTests } = trpc.bloodTest.getRecentComparison.useQuery({
    limit: 5,
    householdMemberId: selectedMemberId,
  });
  const { data: referenceRanges } = trpc.biomarker.getAllReferenceRanges.useQuery();
  const { data: biomarkersWithEducation } = trpc.biomarker.getAllWithEducation.useQuery();

  // Mutations for history tab
  const deleteTest = trpc.bloodTest.delete.useMutation({
    onSuccess: () => {
      utils.bloodTest.getAll.invalidate();
      utils.bloodTest.getLatest.invalidate();
      utils.bloodTest.getRecentComparison.invalidate();
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

  // Build comparison data: biomarkers as rows, tests as columns
  const comparisonData = buildComparisonData(recentTests, referenceRanges, biomarkersWithEducation);

  // Get all biomarkers for related biomarkers lookup
  const allBiomarkers = biomarkersWithEducation?.map((b) => ({
    code: b.code,
    name: b.name,
  })) ?? [];

  // Build test columns
  const testColumns = recentTests?.map((test) => ({
    id: test.id,
    testDate: test.testDate,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Biomarkers</h1>
          <p className="text-muted-foreground">
            View and compare your blood test results over time
          </p>
        </div>
        <div className="flex items-center gap-3">
          {members && members.length > 1 && (
            <div className="relative">
              <select
                value={selectedMemberId || ""}
                onChange={(e) => setLocalMemberId(e.target.value || undefined)}
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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-primary/10">
              <HugeiconsIcon icon={TestTube02Icon} className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Tests</p>
              <p className="text-2xl font-bold text-foreground">{allTests?.length ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-success/10">
              <HugeiconsIcon icon={TestTube02Icon} className="h-5 w-5 text-success" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Biomarkers Tracked</p>
              <p className="text-2xl font-bold text-foreground">
                {latestTest?.results?.length ?? 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-warning/10">
              <HugeiconsIcon icon={TestTube02Icon} className="h-5 w-5 text-warning" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Last Test</p>
              <p className="text-2xl font-bold text-foreground">
                {latestTest ? format(new Date(latestTest.testDate), "MMM d") : "N/A"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs for Comparison and History */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="comparison">Results Comparison</TabsTrigger>
          <TabsTrigger value="history">Test History</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-4 mt-4">
          {isLoading ? (
            <Card className="p-6">
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            </Card>
          ) : recentTests && recentTests.length > 0 ? (
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">Results Comparison</h2>
                <p className="text-sm text-muted-foreground">
                  Click on a row to learn more about each biomarker
                </p>
              </div>
              <BiomarkerTableExpandable
                rows={comparisonData}
                testColumns={testColumns}
                allBiomarkers={allBiomarkers}
              />
            </Card>
          ) : (
            <Card className="p-6">
              <div className="py-8 text-center">
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
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          {isLoading ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">Loading...</div>
            </Card>
          ) : !allTests || allTests.length === 0 ? (
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
              {allTests.map((test) => (
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
