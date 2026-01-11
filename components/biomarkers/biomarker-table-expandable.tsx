"use client";

import { Fragment, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { format } from "date-fns";
import { BiomarkerEducationPanel } from "./biomarker-education-panel";
import { cn } from "@/lib/utils";

interface BiomarkerValue {
  value: string;
  displayValue: string;
  unit: string;
  isOutOfRange: boolean;
}

interface BiomarkerEducation {
  id: string;
  description: string | null;
  whyItMatters: string | null;
  ifLow: string | null;
  ifHigh: string | null;
  howToImprove: string | null;
  relatedBiomarkerCodes: string[] | null;
}

interface BiomarkerRow {
  biomarkerId: string;
  biomarkerName: string;
  biomarkerCode: string;
  category: string;
  referenceRange: string;
  values: Record<string, BiomarkerValue>;
  education?: BiomarkerEducation | null;
}

interface TestColumn {
  id: string;
  testDate: string;
}

interface BiomarkerTableExpandableProps {
  rows: BiomarkerRow[];
  testColumns: TestColumn[];
  allBiomarkers?: { code: string; name: string }[];
}

export function BiomarkerTableExpandable({
  rows,
  testColumns,
  allBiomarkers = [],
}: BiomarkerTableExpandableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (biomarkerId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(biomarkerId)) {
        next.delete(biomarkerId);
      } else {
        next.add(biomarkerId);
      }
      return next;
    });
  };

  const scrollToBiomarker = (code: string) => {
    const row = rows.find((r) => r.biomarkerCode === code);
    if (row) {
      setExpandedRows((prev) => new Set(prev).add(row.biomarkerId));
      // Scroll to the row (would need a ref in production)
      const element = document.getElementById(`biomarker-row-${row.biomarkerId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const getRelatedBiomarkers = (codes: string[] | null) => {
    if (!codes) return [];
    return codes
      .map((code) => {
        const biomarker = allBiomarkers.find((b) => b.code === code);
        return biomarker ? { code: biomarker.code, name: biomarker.name } : null;
      })
      .filter((b): b is { code: string; name: string } => b !== null);
  };

  // Group rows by category
  const rowsByCategory = rows.reduce((acc, row) => {
    if (!acc[row.category]) {
      acc[row.category] = [];
    }
    acc[row.category].push(row);
    return acc;
  }, {} as Record<string, BiomarkerRow[]>);

  const categories = Object.keys(rowsByCategory).sort();

  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No biomarker data available for comparison.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead className="min-w-[180px]">Biomarker</TableHead>
            <TableHead className="min-w-[100px] text-center">Reference</TableHead>
            {testColumns.map((test) => (
              <TableHead key={test.id} className="min-w-[100px] text-center">
                {format(new Date(test.testDate), "MMM d, yyyy")}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <Fragment key={category}>
              {/* Category Header */}
              <TableRow className="bg-muted/50">
                <TableCell colSpan={3 + testColumns.length} className="py-2">
                  <span className="text-sm font-semibold text-muted-foreground">{category}</span>
                </TableCell>
              </TableRow>
              {/* Biomarker Rows */}
              {rowsByCategory[category].map((row) => {
                const isExpanded = expandedRows.has(row.biomarkerId);
                const hasEducation = !!row.education;

                return (
                  <Fragment key={row.biomarkerId}>
                    <TableRow
                      id={`biomarker-row-${row.biomarkerId}`}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-muted/50"
                      )}
                      onClick={() => toggleRow(row.biomarkerId)}
                    >
                      <TableCell className="w-[40px]">
                        <button
                          className={cn(
                            "p-1 rounded transition-all text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <HugeiconsIcon
                            icon={ArrowDown01Icon}
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </button>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{row.biomarkerName}</p>
                          <p className="text-xs text-muted-foreground">{row.biomarkerCode}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {row.referenceRange}
                      </TableCell>
                      {testColumns.map((test) => {
                        const value = row.values[test.id];
                        const outOfRange = value?.isOutOfRange;
                        return (
                          <TableCell
                            key={test.id}
                            className={cn(
                              "text-center",
                              outOfRange && "font-bold text-destructive"
                            )}
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
                    {isExpanded && (
                      <tr>
                        <td colSpan={3 + testColumns.length} className="p-0">
                          <BiomarkerEducationPanel
                            education={row.education ?? null}
                            biomarkerName={row.biomarkerName}
                            biomarkerId={row.biomarkerId}
                            biomarkerCode={row.biomarkerCode}
                            biomarkerCategory={row.category}
                            relatedBiomarkers={getRelatedBiomarkers(
                              row.education?.relatedBiomarkerCodes ?? null
                            )}
                            onRelatedClick={scrollToBiomarker}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
