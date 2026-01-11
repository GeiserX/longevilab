/**
 * Unit conversion utilities for biomarker values
 *
 * Canonical units are typically SI/metric units stored in the database.
 * This module handles conversion to/from user-preferred display units.
 */

// Unit conversion definitions for biomarkers
// Key is the biomarker code, value contains conversion info
interface UnitConversion {
  canonicalUnit: string;
  conversions: {
    [targetUnit: string]: {
      factor: number; // multiply canonical by this to get target
      aliases?: string[]; // other ways to write this unit
    };
  };
}

const unitConversions: Record<string, UnitConversion> = {
  // Glucose
  GLU: {
    canonicalUnit: "mmol/L",
    conversions: {
      "mg/dL": { factor: 18.0182, aliases: ["mg/dl"] },
      "mmol/L": { factor: 1, aliases: ["mmol/l"] },
    },
  },
  // Cholesterol (Total, LDL, HDL)
  CHOL: {
    canonicalUnit: "mmol/L",
    conversions: {
      "mg/dL": { factor: 38.67, aliases: ["mg/dl"] },
      "mmol/L": { factor: 1, aliases: ["mmol/l"] },
    },
  },
  TC: {
    canonicalUnit: "mmol/L",
    conversions: {
      "mg/dL": { factor: 38.67, aliases: ["mg/dl"] },
      "mmol/L": { factor: 1, aliases: ["mmol/l"] },
    },
  },
  LDL: {
    canonicalUnit: "mmol/L",
    conversions: {
      "mg/dL": { factor: 38.67, aliases: ["mg/dl"] },
      "mmol/L": { factor: 1, aliases: ["mmol/l"] },
    },
  },
  HDL: {
    canonicalUnit: "mmol/L",
    conversions: {
      "mg/dL": { factor: 38.67, aliases: ["mg/dl"] },
      "mmol/L": { factor: 1, aliases: ["mmol/l"] },
    },
  },
  // Triglycerides
  TG: {
    canonicalUnit: "mmol/L",
    conversions: {
      "mg/dL": { factor: 88.57, aliases: ["mg/dl"] },
      "mmol/L": { factor: 1, aliases: ["mmol/l"] },
    },
  },
  // Creatinine
  CREAT: {
    canonicalUnit: "µmol/L",
    conversions: {
      "mg/dL": { factor: 0.0113, aliases: ["mg/dl"] },
      "µmol/L": { factor: 1, aliases: ["umol/L", "μmol/L"] },
    },
  },
  // Uric Acid
  UA: {
    canonicalUnit: "µmol/L",
    conversions: {
      "mg/dL": { factor: 0.0168, aliases: ["mg/dl"] },
      "µmol/L": { factor: 1, aliases: ["umol/L", "μmol/L"] },
    },
  },
  // Hemoglobin
  HGB: {
    canonicalUnit: "g/L",
    conversions: {
      "g/dL": { factor: 0.1, aliases: ["gr/dL", "g/dl", "gr/dl", "g/100ml", "g/100mL", "gr/100ml", "gr/100mL", "g/100mm^3", "g/100mm³"] },
      "g/L": { factor: 1, aliases: ["gr/L", "g/l", "gr/l"] },
    },
  },
  // Hematocrit
  HCT: {
    canonicalUnit: "L/L",
    conversions: {
      "%": { factor: 100 },
      "L/L": { factor: 1 },
    },
  },
  // Red Blood Cells
  RBC: {
    canonicalUnit: "10^12/L",
    conversions: {
      "M/µL": { factor: 1, aliases: ["M/uL", "10^6/µL", "10^6/uL", "M/μl", "M/ul", "x10^6/mm^3", "10^6/mm^3"] },
      "10^12/L": { factor: 1, aliases: ["10^12/l"] },
    },
  },
  // White Blood Cells
  WBC: {
    canonicalUnit: "10^9/L",
    conversions: {
      "K/µL": { factor: 1, aliases: ["K/uL", "10^3/µL", "10^3/uL", "K/μl", "K/ul", "10^3/mm^3", "x10^3/μL", "x10^3/uL"] },
      "10^9/L": { factor: 1, aliases: ["10^9/l"] },
    },
  },
  // Platelets
  PLT: {
    canonicalUnit: "10^9/L",
    conversions: {
      "K/µL": { factor: 1, aliases: ["K/uL", "10^3/µL", "10^3/uL", "K/μl", "K/ul", "10^3/mm^3", "x10^3/μL", "x10^3/uL"] },
      "10^9/L": { factor: 1, aliases: ["10^9/l"] },
    },
  },
  // Mean Corpuscular Volume - same units everywhere
  MCV: {
    canonicalUnit: "fL",
    conversions: {
      fL: { factor: 1, aliases: ["fl"] },
    },
  },
  // Mean Corpuscular Hemoglobin
  MCH: {
    canonicalUnit: "pg",
    conversions: {
      pg: { factor: 1, aliases: ["pgr", "μμg"] },
    },
  },
  // Mean Corpuscular Hemoglobin Concentration
  MCHC: {
    canonicalUnit: "g/L",
    conversions: {
      "g/dL": { factor: 0.1, aliases: ["gr/dL", "g/dl", "gr/dl"] },
      "g/L": { factor: 1, aliases: ["gr/L"] },
      "g/100ml": { factor: 0.1, aliases: ["g/100mL", "gr/100ml", "gr/100mL"] },
    },
  },
  // Red Cell Distribution Width
  RDW: {
    canonicalUnit: "%",
    conversions: {
      "%": { factor: 1 },
    },
  },
  // Iron
  FE: {
    canonicalUnit: "µmol/L",
    conversions: {
      "µg/dL": { factor: 5.587, aliases: ["ug/dL", "mcg/dL", "µgr/dl", "ugr/dl", "μgr/dl", "µg/dl", "ug/dl", "mcg/dl"] },
      "µmol/L": { factor: 1, aliases: ["umol/L", "μmol/L", "umol/l", "μmol/l"] },
    },
  },
  // Ferritin - typically same units
  FERR: {
    canonicalUnit: "µg/L",
    conversions: {
      "ng/mL": { factor: 1, aliases: ["ng/ml"] },
      "µg/L": { factor: 1, aliases: ["ug/L", "μg/L"] },
    },
  },
  // Vitamin B12
  B12: {
    canonicalUnit: "pmol/L",
    conversions: {
      "pg/mL": { factor: 1.355, aliases: ["pg/ml"] },
      "pmol/L": { factor: 1, aliases: ["pmol/l"] },
    },
  },
  // Vitamin B12 (alternate code)
  VITB12: {
    canonicalUnit: "pmol/L",
    conversions: {
      "pg/mL": { factor: 1.355, aliases: ["pg/ml"] },
      "pmol/L": { factor: 1, aliases: ["pmol/l"] },
    },
  },
  // Folate
  FOL: {
    canonicalUnit: "nmol/L",
    conversions: {
      "ng/mL": { factor: 2.266, aliases: ["ng/ml"] },
      "nmol/L": { factor: 1 },
    },
  },
  // Vitamin D
  VITD: {
    canonicalUnit: "nmol/L",
    conversions: {
      "ng/mL": { factor: 0.4, aliases: ["ng/ml"] },
      "nmol/L": { factor: 1 },
    },
  },
  // TSH - typically same units
  TSH: {
    canonicalUnit: "mIU/L",
    conversions: {
      "mIU/L": { factor: 1, aliases: ["µIU/mL", "uIU/mL", "mU/L", "μIU/ml", "uIU/ml", "µIU/ml", "mIU/l", "mU/l"] },
    },
  },
  // Free T4
  FT4: {
    canonicalUnit: "pmol/L",
    conversions: {
      "ng/dL": { factor: 0.0777, aliases: ["ng/dl"] },
      "pmol/L": { factor: 1 },
    },
  },
  // Total T4 (Thyroxine)
  T4: {
    canonicalUnit: "nmol/L",
    conversions: {
      "µg/dL": { factor: 0.0777, aliases: ["ug/dL", "mcg/dL", "µg/dl", "ug/dl", "mcg/dl"] },
      "ng/dL": { factor: 0.777, aliases: ["ng/dl"] },
      "nmol/L": { factor: 1, aliases: ["nmol/l"] },
    },
  },
  // Free T3
  FT3: {
    canonicalUnit: "pmol/L",
    conversions: {
      "pg/mL": { factor: 0.651, aliases: ["pg/ml"] },
      "pmol/L": { factor: 1 },
    },
  },
  // ALT
  ALT: {
    canonicalUnit: "U/L",
    conversions: {
      "U/L": { factor: 1, aliases: ["IU/L"] },
    },
  },
  // AST
  AST: {
    canonicalUnit: "U/L",
    conversions: {
      "U/L": { factor: 1, aliases: ["IU/L"] },
    },
  },
  // GGT
  GGT: {
    canonicalUnit: "U/L",
    conversions: {
      "U/L": { factor: 1, aliases: ["IU/L"] },
    },
  },
  // ALP
  ALP: {
    canonicalUnit: "U/L",
    conversions: {
      "U/L": { factor: 1, aliases: ["IU/L"] },
    },
  },
  // Bilirubin Total
  TBIL: {
    canonicalUnit: "µmol/L",
    conversions: {
      "mg/dL": { factor: 0.0585, aliases: ["mg/dl"] },
      "µmol/L": { factor: 1, aliases: ["umol/L", "μmol/L"] },
    },
  },
  // Bilirubin Direct
  DBIL: {
    canonicalUnit: "µmol/L",
    conversions: {
      "mg/dL": { factor: 0.0585, aliases: ["mg/dl"] },
      "µmol/L": { factor: 1, aliases: ["umol/L", "μmol/L"] },
    },
  },
  // Albumin
  ALB: {
    canonicalUnit: "g/L",
    conversions: {
      "g/dL": { factor: 0.1, aliases: ["g/dl"] },
      "g/L": { factor: 1 },
    },
  },
  // Total Protein
  TP: {
    canonicalUnit: "g/L",
    conversions: {
      "g/dL": { factor: 0.1, aliases: ["g/dl"] },
      "g/L": { factor: 1 },
    },
  },
  // BUN/Urea
  BUN: {
    canonicalUnit: "mmol/L",
    conversions: {
      "mg/dL": { factor: 2.8, aliases: ["mg/dl"] },
      "mmol/L": { factor: 1, aliases: ["mmol/l"] },
    },
  },
  // eGFR - same units
  EGFR: {
    canonicalUnit: "mL/min/1.73m²",
    conversions: {
      "mL/min/1.73m²": { factor: 1, aliases: ["mL/min/1.73m2"] },
    },
  },
  // CRP
  CRP: {
    canonicalUnit: "mg/L",
    conversions: {
      "mg/L": { factor: 1 },
      "mg/dL": { factor: 0.1, aliases: ["mg/dl"] },
    },
  },
  // HbA1c
  HBA1C: {
    canonicalUnit: "%",
    conversions: {
      "%": { factor: 1 },
      "mmol/mol": { factor: 10.929, aliases: ["mmol/mol"] }, // (HbA1c% - 2.15) * 10.929
    },
  },
  // Sodium
  NA: {
    canonicalUnit: "mmol/L",
    conversions: {
      "mmol/L": { factor: 1, aliases: ["mEq/L"] },
    },
  },
  // Potassium
  K: {
    canonicalUnit: "mmol/L",
    conversions: {
      "mmol/L": { factor: 1, aliases: ["mEq/L"] },
    },
  },
  // Chloride
  CL: {
    canonicalUnit: "mmol/L",
    conversions: {
      "mmol/L": { factor: 1, aliases: ["mEq/L"] },
    },
  },
  // Calcium
  CA: {
    canonicalUnit: "mmol/L",
    conversions: {
      "mg/dL": { factor: 4, aliases: ["mg/dl"] },
      "mmol/L": { factor: 1 },
    },
  },
  // Magnesium
  MG: {
    canonicalUnit: "mmol/L",
    conversions: {
      "mg/dL": { factor: 2.43, aliases: ["mg/dl"] },
      "mEq/L": { factor: 2, aliases: ["meq/L"] },
      "mmol/L": { factor: 1 },
    },
  },
  // Phosphorus
  PHOS: {
    canonicalUnit: "mmol/L",
    conversions: {
      "mg/dL": { factor: 3.1, aliases: ["mg/dl"] },
      "mmol/L": { factor: 1 },
    },
  },
  // PSA
  PSA: {
    canonicalUnit: "µg/L",
    conversions: {
      "ng/mL": { factor: 1, aliases: ["ng/ml"] },
      "µg/L": { factor: 1, aliases: ["ug/L", "μg/L"] },
    },
  },
  // Testosterone
  TESTO: {
    canonicalUnit: "nmol/L",
    conversions: {
      "ng/dL": { factor: 28.84, aliases: ["ng/dl"] },
      "nmol/L": { factor: 1 },
    },
  },
  // Estradiol
  E2: {
    canonicalUnit: "pmol/L",
    conversions: {
      "pg/mL": { factor: 3.671, aliases: ["pg/ml"] },
      "pmol/L": { factor: 1 },
    },
  },
};

/**
 * Normalize a unit string to a standard format for comparison
 * Handles different Unicode representations of special characters
 */
function normalizeUnit(unit: string): string {
  return unit
    .toLowerCase()
    .replace(/\s+/g, "")
    // Normalize micro symbol variations (µ U+00B5 and μ U+03BC)
    .replace(/[µμ]/g, "u")
    // Normalize superscript characters
    .replace(/[²³⁹¹²]/g, (match) => {
      const superscriptMap: Record<string, string> = { "²": "2", "³": "3", "⁹": "9", "¹": "1" };
      return superscriptMap[match] || match;
    })
    // Remove common variations
    .replace(/\^/g, "");
}

/**
 * Find a matching unit in conversions including aliases
 */
function findMatchingUnit(
  targetUnit: string,
  conversions: UnitConversion["conversions"]
): string | null {
  const normalizedTarget = normalizeUnit(targetUnit);

  for (const [unit, config] of Object.entries(conversions)) {
    if (normalizeUnit(unit) === normalizedTarget) {
      return unit;
    }
    if (config.aliases) {
      for (const alias of config.aliases) {
        if (normalizeUnit(alias) === normalizedTarget) {
          return unit;
        }
      }
    }
  }
  return null;
}

/**
 * Convert a value from canonical unit to target unit
 */
export function convertFromCanonical(
  value: number,
  biomarkerCode: string,
  targetUnit: string
): { value: number; unit: string } | null {
  const conversion = unitConversions[biomarkerCode];
  if (!conversion) {
    return null;
  }

  const matchedUnit = findMatchingUnit(targetUnit, conversion.conversions);
  if (!matchedUnit) {
    return null;
  }

  const factor = conversion.conversions[matchedUnit].factor;
  return {
    value: value * factor,
    unit: matchedUnit,
  };
}

/**
 * Convert a value from source unit to canonical unit
 */
export function convertToCanonical(
  value: number,
  biomarkerCode: string,
  sourceUnit: string
): number | null {
  const conversion = unitConversions[biomarkerCode];
  if (!conversion) {
    return null;
  }

  const matchedUnit = findMatchingUnit(sourceUnit, conversion.conversions);
  if (!matchedUnit) {
    return null;
  }

  const factor = conversion.conversions[matchedUnit].factor;
  return value / factor;
}

/**
 * Convert a value between any two units for a biomarker
 */
export function convertUnit(
  value: number,
  biomarkerCode: string,
  fromUnit: string,
  toUnit: string
): { value: number; unit: string } | null {
  // If same unit (normalized), return as-is
  if (normalizeUnit(fromUnit) === normalizeUnit(toUnit)) {
    return { value, unit: toUnit };
  }

  const conversion = unitConversions[biomarkerCode];
  if (!conversion) {
    return null;
  }

  const fromMatched = findMatchingUnit(fromUnit, conversion.conversions);
  const toMatched = findMatchingUnit(toUnit, conversion.conversions);

  if (!fromMatched || !toMatched) {
    return null;
  }

  const fromFactor = conversion.conversions[fromMatched].factor;
  const toFactor = conversion.conversions[toMatched].factor;

  // Convert: from -> canonical -> to
  // canonical = from_value / from_factor
  // to_value = canonical * to_factor
  const convertedValue = (value / fromFactor) * toFactor;

  return { value: convertedValue, unit: toMatched };
}

/**
 * Format a number removing trailing zeros
 * e.g., 0.3800 -> 0.38, 130.0000 -> 130, 5.10 -> 5.1
 */
export function formatNumber(value: number, maxDecimals: number = 4): string {
  // Round to max decimals first
  const rounded = Number(value.toFixed(maxDecimals));
  // Convert to string, which removes trailing zeros
  return rounded.toString();
}

/**
 * Format a reference range, converting units if needed and removing trailing zeros
 */
export function formatReferenceRange(
  minValue: string | null,
  maxValue: string | null,
  rangeUnit: string,
  biomarkerCode: string,
  targetUnit: string
): string {
  if (!minValue && !maxValue) return "—";

  let displayMin: string | null = null;
  let displayMax: string | null = null;
  let displayUnit = rangeUnit;

  // Try to convert to target unit
  if (minValue !== null) {
    const minNum = parseFloat(minValue);
    if (!isNaN(minNum)) {
      const converted = convertUnit(minNum, biomarkerCode, rangeUnit, targetUnit);
      if (converted) {
        displayMin = formatNumber(converted.value);
        displayUnit = converted.unit;
      } else {
        displayMin = formatNumber(minNum);
      }
    }
  }

  if (maxValue !== null) {
    const maxNum = parseFloat(maxValue);
    if (!isNaN(maxNum)) {
      const converted = convertUnit(maxNum, biomarkerCode, rangeUnit, targetUnit);
      if (converted) {
        displayMax = formatNumber(converted.value);
        displayUnit = converted.unit;
      } else {
        displayMax = formatNumber(maxNum);
      }
    }
  }

  if (displayMin && displayMax) {
    return `${displayMin}–${displayMax} ${displayUnit}`;
  } else if (displayMin) {
    return `≥${displayMin} ${displayUnit}`;
  } else if (displayMax) {
    return `≤${displayMax} ${displayUnit}`;
  }

  return "—";
}

/**
 * Check if a value is out of reference range
 * Handles unit conversion automatically
 */
export function isOutOfRange(
  value: number,
  valueUnit: string,
  minValue: string | null,
  maxValue: string | null,
  rangeUnit: string,
  biomarkerCode: string
): boolean {
  // Convert range values to the same unit as the value
  let minInValueUnit: number | null = null;
  let maxInValueUnit: number | null = null;

  if (minValue !== null) {
    const minNum = parseFloat(minValue);
    if (!isNaN(minNum)) {
      const converted = convertUnit(minNum, biomarkerCode, rangeUnit, valueUnit);
      minInValueUnit = converted ? converted.value : minNum;
    }
  }

  if (maxValue !== null) {
    const maxNum = parseFloat(maxValue);
    if (!isNaN(maxNum)) {
      const converted = convertUnit(maxNum, biomarkerCode, rangeUnit, valueUnit);
      maxInValueUnit = converted ? converted.value : maxNum;
    }
  }

  if (minInValueUnit !== null && value < minInValueUnit) {
    return true;
  }
  if (maxInValueUnit !== null && value > maxInValueUnit) {
    return true;
  }

  return false;
}

/**
 * Get the display unit for a biomarker based on user preference
 */
export function getDisplayUnit(
  biomarkerCode: string,
  preferredSystem: "metric" | "us" | "imperial"
): string | null {
  const conversion = unitConversions[biomarkerCode];
  if (!conversion) return null;

  // US typically uses mg/dL for many values
  if (preferredSystem === "us") {
    const usUnits = ["mg/dL", "g/dL", "ng/mL", "pg/mL", "ng/dL"];
    for (const unit of usUnits) {
      if (conversion.conversions[unit]) {
        return unit;
      }
    }
  }

  // Metric/SI is the canonical unit
  return conversion.canonicalUnit;
}

/**
 * Get the canonical unit for a biomarker
 */
export function getCanonicalUnit(biomarkerCode: string): string | null {
  const conversion = unitConversions[biomarkerCode.toUpperCase()];
  return conversion?.canonicalUnit ?? null;
}

/**
 * Check if a unit is known/supported for a biomarker
 */
export function isKnownUnit(biomarkerCode: string, unit: string): boolean {
  const conversion = unitConversions[biomarkerCode.toUpperCase()];
  if (!conversion) return false;
  return findMatchingUnit(unit, conversion.conversions) !== null;
}
