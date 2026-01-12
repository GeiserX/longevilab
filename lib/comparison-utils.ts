import {
  formatReferenceRange,
  isOutOfRange as checkIsOutOfRange,
  formatNumber,
  convertToCanonical,
  getCanonicalUnit,
} from "@/lib/units";

// Types for comparison data building
export type RecentTest = {
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

export type ReferenceRanges = Record<
  string,
  {
    minValue: string | null;
    maxValue: string | null;
    unit: string;
  }
>;

export type BiomarkerEducation = {
  id: string;
  description: string | null;
  whyItMatters: string | null;
  ifLow: string | null;
  ifHigh: string | null;
  howToImprove: string | null;
  relatedBiomarkerCodes: string[] | null;
};

export type BiomarkerWithEducation = {
  id: string;
  code: string;
  name: string;
  category: string;
  education: BiomarkerEducation | null;
};

export interface ComparisonRow {
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
  education?: BiomarkerEducation | null;
}

/**
 * Builds comparison data for biomarker tables from recent tests.
 * Converts values to canonical units and checks reference ranges.
 *
 * @param recentTests - Array of recent blood tests with results
 * @param referenceRanges - Map of biomarker ID to reference range
 * @param biomarkersWithEducation - Optional array of biomarkers with education data
 * @returns Array of comparison rows sorted by category and name
 */
export function buildComparisonData(
  recentTests: RecentTest[] | undefined,
  referenceRanges: ReferenceRanges | undefined,
  biomarkersWithEducation?: BiomarkerWithEducation[]
): ComparisonRow[] {
  if (!recentTests || recentTests.length === 0) return [];

  // Create a map of biomarker education by ID if provided
  const educationMap = new Map<string, BiomarkerEducation | null>();
  if (biomarkersWithEducation) {
    biomarkersWithEducation.forEach((b) => {
      educationMap.set(b.id, b.education);
    });
  }

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
          const converted = convertToCanonical(
            numValue,
            biomarker.code,
            result.unit
          );
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

    const row: ComparisonRow = {
      biomarkerId,
      biomarkerName: biomarker.name,
      biomarkerCode: biomarker.code,
      category: biomarker.category,
      referenceRange,
      values,
    };

    // Add education if available
    if (educationMap.has(biomarkerId)) {
      row.education = educationMap.get(biomarkerId);
    }

    rows.push(row);
  }

  // Sort by category, then by name
  rows.sort((a, b) => {
    const catCompare = a.category.localeCompare(b.category);
    if (catCompare !== 0) return catCompare;
    return a.biomarkerName.localeCompare(b.biomarkerName);
  });

  return rows;
}
