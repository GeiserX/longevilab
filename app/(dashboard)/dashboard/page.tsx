"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Upload02Icon,
  TestTube02Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatReferenceRange,
  isOutOfRange as checkIsOutOfRange,
  formatNumber,
  convertToCanonical,
  getCanonicalUnit,
} from "@/lib/units";

export default function DashboardPage() {
  const { data: latestTest, isLoading } = trpc.bloodTest.getLatest.useQuery();
  const { data: allTests } = trpc.bloodTest.getAll.useQuery();
  const { data: recentTests } = trpc.bloodTest.getRecentComparison.useQuery({
    limit: 5,
  });
  const { data: referenceRanges } =
    trpc.biomarker.getAllReferenceRanges.useQuery();

  // Build comparison data: biomarkers as rows, tests as columns
  const comparisonData = buildComparisonData(recentTests, referenceRanges);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Track and monitor your blood test results
          </p>
        </div>
        <Link href="/upload">
          <Button>
            <HugeiconsIcon icon={Upload02Icon} className="mr-2 h-4 w-4" />
            Upload Test
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-primary/10">
              <HugeiconsIcon
                icon={TestTube02Icon}
                className="h-5 w-5 text-primary"
              />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Total Tests
              </p>
              <p className="text-2xl font-bold text-foreground">
                {allTests?.length ?? 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-success/10">
              <HugeiconsIcon
                icon={TestTube02Icon}
                className="h-5 w-5 text-success"
              />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Biomarkers Tracked
              </p>
              <p className="text-2xl font-bold text-foreground">
                {latestTest?.results?.length ?? 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-warning/10">
              <HugeiconsIcon
                icon={TestTube02Icon}
                className="h-5 w-5 text-warning"
              />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Last Test
              </p>
              <p className="text-2xl font-bold text-foreground">
                {latestTest
                  ? format(new Date(latestTest.testDate), "MMM d")
                  : "N/A"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Comparison Table */}
      {recentTests && recentTests.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Results Comparison
            </h2>
            <Link
              href="/history"
              className="text-sm text-primary hover:underline flex items-center"
            >
              View all tests
              <HugeiconsIcon icon={ArrowRight01Icon} className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Biomarker</TableHead>
                  <TableHead className="min-w-[100px] text-center">
                    Reference
                  </TableHead>
                  {recentTests.map((test) => (
                    <TableHead key={test.id} className="min-w-[100px] text-center">
                      {format(new Date(test.testDate), "MMM d, yyyy")}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonData.map((row) => (
                  <TableRow key={row.biomarkerId}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">
                          {row.biomarkerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.category}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {row.referenceRange}
                    </TableCell>
                    {recentTests.map((test) => {
                      const value = row.values[test.id];
                      const outOfRange = value?.isOutOfRange;
                      return (
                        <TableCell
                          key={test.id}
                          className={`text-center ${
                            outOfRange ? "font-bold text-destructive" : ""
                          }`}
                        >
                          {value ? (
                            <>
                              {value.displayValue} {value.unit}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {comparisonData.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No biomarker data available for comparison.
            </div>
          )}
        </Card>
      )}

      {/* Empty state */}
      {isLoading ? (
        <Card className="p-6">
          <div className="py-8 text-center text-muted-foreground">
            Loading...
          </div>
        </Card>
      ) : !latestTest && (
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

      {/* Recent Tests */}
      {allTests && allTests.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Recent Tests
            </h2>
            <Link
              href="/history"
              className="text-sm text-primary hover:underline flex items-center"
            >
              View all
              <HugeiconsIcon icon={ArrowRight01Icon} className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {allTests.slice(0, 5).map((test) => (
              <Link
                key={test.id}
                href={`/results/${test.id}`}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {format(new Date(test.testDate), "MMMM d, yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {test.labName || "Unknown Lab"}
                  </p>
                </div>
                <div className="flex items-center">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      test.status === "completed"
                        ? "bg-success/10 text-success"
                        : test.status === "review"
                          ? "bg-warning/10 text-warning"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {test.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

interface ComparisonRow {
  biomarkerId: string;
  biomarkerName: string;
  biomarkerCode: string;
  category: string;
  referenceRange: string;
  values: Record<
    string,
    {
      value: string;
      displayValue: string;
      unit: string;
      isOutOfRange: boolean;
    }
  >;
}

type RecentTest = {
  id: string;
  testDate: string;
  results: {
    id: string;
    value: string;
    unit: string;
    isOutOfRange: boolean | null;
    biomarker: {
      id: string;
      code: string;
      name: string;
      category: string;
    } | null;
  }[];
};

type ReferenceRanges = Record<
  string,
  {
    minValue: string | null;
    maxValue: string | null;
    unit: string;
  }
>;

function buildComparisonData(
  recentTests: RecentTest[] | undefined,
  referenceRanges: ReferenceRanges | undefined
): ComparisonRow[] {
  if (!recentTests || recentTests.length === 0) return [];

  // Collect all unique biomarkers from recent tests
  const biomarkerMap = new Map<
    string,
    { name: string; code: string; category: string }
  >();

  for (const test of recentTests) {
    for (const result of test.results) {
      if (result.biomarker && !biomarkerMap.has(result.biomarker.id)) {
        biomarkerMap.set(result.biomarker.id, {
          name: result.biomarker.name,
          code: result.biomarker.code,
          category: result.biomarker.category,
        });
      }
    }
  }

  // Build comparison rows
  const rows: ComparisonRow[] = [];

  for (const [biomarkerId, biomarker] of biomarkerMap) {
    const values: ComparisonRow["values"] = {};

    // Always use canonical unit for display
    const canonicalUnit = getCanonicalUnit(biomarker.code);

    for (const test of recentTests) {
      const result = test.results.find((r) => r.biomarker?.id === biomarkerId);
      if (result) {
        const numValue = parseFloat(result.value);
        const range = referenceRanges?.[biomarkerId];

        // Convert value to canonical unit
        let displayValue = numValue;
        let displayUnit = result.unit;

        if (canonicalUnit && !isNaN(numValue)) {
          const converted = convertToCanonical(numValue, biomarker.code, result.unit);
          if (converted !== null) {
            displayValue = converted;
            displayUnit = canonicalUnit;
          }
        }

        // Check if out of range using canonical values
        let outOfRange = result.isOutOfRange ?? false;
        if (range && !isNaN(displayValue)) {
          outOfRange = checkIsOutOfRange(
            displayValue,
            displayUnit,
            range.minValue,
            range.maxValue,
            range.unit,
            biomarker.code
          );
        }

        values[test.id] = {
          value: result.value,
          displayValue: formatNumber(displayValue),
          unit: displayUnit,
          isOutOfRange: outOfRange,
        };
      }
    }

    // Format reference range in canonical unit
    const range = referenceRanges?.[biomarkerId];
    let referenceRange = "—";
    if (range && canonicalUnit) {
      referenceRange = formatReferenceRange(
        range.minValue,
        range.maxValue,
        range.unit,
        biomarker.code,
        canonicalUnit
      );
    } else if (range) {
      // Fallback: just format without conversion
      if (range.minValue && range.maxValue) {
        referenceRange = `${formatNumber(parseFloat(range.minValue))}–${formatNumber(parseFloat(range.maxValue))} ${range.unit}`;
      } else if (range.minValue) {
        referenceRange = `≥${formatNumber(parseFloat(range.minValue))} ${range.unit}`;
      } else if (range.maxValue) {
        referenceRange = `≤${formatNumber(parseFloat(range.maxValue))} ${range.unit}`;
      }
    }

    rows.push({
      biomarkerId,
      biomarkerName: biomarker.name,
      biomarkerCode: biomarker.code,
      category: biomarker.category,
      referenceRange,
      values,
    });
  }

  // Sort by category, then by name
  rows.sort((a, b) => {
    const catCompare = a.category.localeCompare(b.category);
    if (catCompare !== 0) return catCompare;
    return a.biomarkerName.localeCompare(b.biomarkerName);
  });

  return rows;
}
