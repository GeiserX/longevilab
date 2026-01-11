/**
 * PhenoAge Biological Age Calculator
 *
 * Based on Levine et al. 2018: "An epigenetic biomarker of aging for lifespan
 * and healthspan"
 *
 * Reference: https://github.com/dayoonkwon/BioAge
 * Formula: https://www.longevity-tools.com/levine-pheno-age
 *
 * This implementation supports:
 * - Standard PhenoAge calculation with all 9 biomarkers
 * - Graceful handling of missing biomarkers via population median imputation
 * - Tracking of which values were measured vs. imputed
 * - Proper unit conversion from canonical units to formula units
 */

import {
  imputeMissingBiomarkers,
  type Sex,
  type ImputedValue,
} from "./imputation";

// Required biomarker codes for PhenoAge calculation
export const PHENOAGE_BIOMARKER_CODES = [
  "ALB", // Albumin (canonical: g/L, formula: g/dL)
  "CREAT", // Creatinine (canonical: μmol/L, formula: mg/dL)
  "GLU", // Glucose (canonical: mmol/L, formula: mg/dL)
  "CRP", // C-Reactive Protein (canonical: mg/L, formula: mg/dL) - can also use HSCRP
  "LYMPH", // Lymphocyte Percentage (%)
  "MCV", // Mean Corpuscular Volume (fL)
  "RDW", // Red Cell Distribution Width (%)
  "ALP", // Alkaline Phosphatase (U/L)
  "WBC", // White Blood Cell Count (10^9/L = 10^3/μL)
] as const;

// Alternative codes that can be used
export const ALTERNATIVE_CODES: Record<string, string[]> = {
  CRP: ["HSCRP"], // High-sensitivity CRP can substitute for CRP
};

/**
 * Canonical units used in the database for each biomarker
 */
export const CANONICAL_UNITS: Record<string, string> = {
  ALB: "g/L",
  CREAT: "μmol/L",
  GLU: "mmol/L",
  CRP: "mg/L",
  HSCRP: "mg/L",
  LYMPH: "%",
  MCV: "fL",
  RDW: "%",
  ALP: "U/L",
  WBC: "10^9/L",
};

/**
 * Physiological ranges for biomarkers in formula units
 * Values outside these ranges are clamped to prevent extreme calculations
 */
const PHYSIOLOGICAL_RANGES: Record<string, { min: number; max: number }> = {
  ALB: { min: 1.5, max: 6.0 }, // g/dL
  CREAT: { min: 0.3, max: 15.0 }, // mg/dL
  GLU: { min: 40, max: 400 }, // mg/dL
  CRP: { min: 0.001, max: 20.0 }, // mg/dL
  LYMPH: { min: 5, max: 60 }, // %
  MCV: { min: 60, max: 120 }, // fL
  RDW: { min: 10, max: 25 }, // %
  ALP: { min: 20, max: 500 }, // U/L
  WBC: { min: 1.5, max: 25 }, // 10^3/μL
};

/**
 * Maximum deviation from chronological age (in years)
 * This prevents biologically implausible results.
 */
const MAX_AGE_DEVIATION = 15;

export interface BiomarkerValue {
  code: string;
  value: number;
  unit: string;
}

/**
 * Basic PhenoAge result (backward compatible)
 */
export interface PhenoAgeResult {
  biologicalAge: number | null;
  chronologicalAge: number;
  ageDifference: number | null;
  availableBiomarkers: string[];
  missingBiomarkers: string[];
  confidence: "high" | "medium" | "low";
  calculationDate: string;
}

/**
 * Extended PhenoAge result with imputation tracking
 */
export interface ExtendedPhenoAgeResult extends PhenoAgeResult {
  imputedBiomarkers: string[];
  usedImputation: boolean;
  biomarkerDetails: Array<{
    code: string;
    value: number;
    unit: string;
    source: "measured" | "imputed-stratified" | "imputed-overall";
  }>;
}

/**
 * Options for PhenoAge calculation
 */
export interface PhenoAgeOptions {
  sex?: Sex;
  useImputation?: boolean;
  minMeasuredForImputation?: number;
}

/**
 * Clamp a value to physiological range
 */
function clampToPhysiologicalRange(code: string, value: number): number {
  const range = PHYSIOLOGICAL_RANGES[code];
  if (!range) return value;
  return Math.max(range.min, Math.min(range.max, value));
}

/**
 * Check if a unit string indicates formula units (the units used in PhenoAge calculation)
 */
function isFormulaUnit(code: string, unit: string): boolean {
  const normalizedUnit = unit.toLowerCase().replace(/\s/g, "");
  const normalizedCode = code.toUpperCase();

  switch (normalizedCode) {
    case "GLU":
      // Formula unit is mg/dL
      return normalizedUnit.includes("mg/dl") || normalizedUnit === "mg/dl";

    case "CREAT":
      // Formula unit is mg/dL
      return normalizedUnit.includes("mg/dl") || normalizedUnit === "mg/dl";

    case "ALB":
      // Formula unit is g/dL
      return normalizedUnit.includes("g/dl") || normalizedUnit === "g/dl";

    case "CRP":
    case "HSCRP":
      // Formula unit is mg/dL
      return normalizedUnit.includes("mg/dl") || normalizedUnit === "mg/dl";

    default:
      return false;
  }
}

/**
 * Detect if a value is likely already in formula units based on physiological ranges
 *
 * This handles cases where the LLM extraction stored values in formula units
 * instead of canonical units. We use heuristics based on impossible/implausible
 * values to detect this.
 */
function isLikelyFormulaUnits(code: string, value: number): boolean {
  const normalizedCode = code.toUpperCase();

  switch (normalizedCode) {
    case "GLU":
      // Normal glucose: 4-7 mmol/L or 70-126 mg/dL
      // If value > 25, it's almost certainly mg/dL (25 mmol/L = 450 mg/dL = severe crisis)
      return value > 25;

    case "CREAT":
      // Normal creatinine: 44-133 μmol/L or 0.5-1.5 mg/dL
      // If value < 10, it's almost certainly mg/dL (10 μmol/L is impossibly low)
      return value < 10;

    case "ALB":
      // Normal albumin: 35-55 g/L or 3.5-5.5 g/dL
      // If value < 10, it's likely g/dL (10 g/L is critically low but possible)
      // If value > 6 and < 10, ambiguous - assume canonical (g/L)
      return value < 6;

    case "CRP":
    case "HSCRP":
      // Normal CRP: 0-10 mg/L or 0-1 mg/dL
      // Values 0-1 are ambiguous, but check if < 0.5 which is more likely mg/dL
      // since healthy CRP in mg/L is usually 0.5-3
      return value < 0.5;

    default:
      return false;
  }
}

/**
 * Convert from canonical units to formula units
 *
 * Canonical units (stored in database):
 * - ALB: g/L
 * - CREAT: μmol/L
 * - GLU: mmol/L
 * - CRP/HSCRP: mg/L
 * - Others: same as formula
 *
 * Formula units (used in PhenoAge calculation):
 * - ALB: g/dL
 * - CREAT: mg/dL
 * - GLU: mg/dL
 * - CRP: mg/dL
 * - LYMPH: %
 * - MCV: fL
 * - RDW: %
 * - ALP: U/L
 * - WBC: 10^3/μL (same as 10^9/L)
 *
 * Note: This function first checks the actual unit if provided, then falls back
 * to heuristics to detect when values are already in formula units.
 */
function convertCanonicalToFormula(code: string, value: number, unit?: string): number {
  let converted: number;
  const normalizedCode = code.toUpperCase();

  // First check if unit explicitly indicates formula units
  const alreadyFormulaUnits = unit
    ? isFormulaUnit(normalizedCode, unit)
    : isLikelyFormulaUnits(normalizedCode, value);

  if (alreadyFormulaUnits) {
    converted = value;
  } else {
    switch (normalizedCode) {
      case "ALB":
        // g/L → g/dL: divide by 10
        converted = value / 10;
        break;

      case "CREAT":
        // μmol/L → mg/dL: multiply by 0.0113
        converted = value * 0.0113;
        break;

      case "GLU":
        // mmol/L → mg/dL: multiply by 18.0182
        converted = value * 18.0182;
        break;

      case "CRP":
      case "HSCRP":
        // mg/L → mg/dL: divide by 10 (multiply by 0.1)
        converted = value * 0.1;
        break;

      case "LYMPH":
      case "MCV":
      case "RDW":
      case "ALP":
      case "WBC":
        // These are already in the correct units
        converted = value;
        break;

      default:
        converted = value;
    }
  }

  // Clamp to physiological range
  const clampCode = normalizedCode === "HSCRP" ? "CRP" : normalizedCode;
  return clampToPhysiologicalRange(clampCode, converted);
}

/**
 * Calculate the linear predictor (xb) for PhenoAge
 * Coefficients from Levine et al. 2018
 */
function calculateLinearPredictor(
  chronologicalAge: number,
  biomarkers: Map<string, number>
): number {
  const b0 = -19.9067;

  const albumin = biomarkers.get("ALB") ?? 4.2;
  const creatinine = biomarkers.get("CREAT") ?? 0.95;
  const glucose = biomarkers.get("GLU") ?? 96;
  const crp = biomarkers.get("CRP") ?? biomarkers.get("HSCRP") ?? 0.2;
  const lymphocyte = biomarkers.get("LYMPH") ?? 29.5;
  const mcv = biomarkers.get("MCV") ?? 89.5;
  const rdw = biomarkers.get("RDW") ?? 13.15;
  const alp = biomarkers.get("ALP") ?? 70;
  const wbc = biomarkers.get("WBC") ?? 6.3;

  // Natural log of CRP
  const lnCrp = crp > 0 ? Math.log(crp) : Math.log(0.001);

  // Coefficients from Levine et al. 2018, Table S3
  // Note: glucose coefficient is 0.00955 for glucose in mg/dL
  const xb =
    b0 +
    0.0804 * chronologicalAge +
    -0.0453 * albumin +
    0.0095 * creatinine +
    0.1953 * lnCrp +
    0.00955 * glucose + // Fixed: was 0.0954 (for mmol/L), should be 0.00955 (for mg/dL)
    -0.012 * lymphocyte +
    0.0268 * mcv +
    0.3306 * rdw +
    0.00188 * alp +
    0.0554 * wbc;

  return xb;
}

/**
 * Convert linear predictor to mortality score
 */
function calculateMortalityScore(xb: number): number {
  const gamma = 0.0076927;
  const timeHorizon = 120;

  const expXb = Math.exp(xb);
  const hazardSum = (Math.exp(timeHorizon * gamma) - 1) / gamma;
  const mortalityScore = 1 - Math.exp(-expXb * hazardSum);

  return mortalityScore;
}

/**
 * Convert mortality score to PhenoAge
 */
function mortalityScoreToPhenoAge(mortalityScore: number): number {
  if (mortalityScore <= 0 || mortalityScore >= 1) {
    return NaN;
  }

  const A = 141.50225;
  const B = -0.00553;
  const C = 0.09165;

  const innerLog = Math.log(1 - mortalityScore);
  const phenoAge = A + Math.log(B * innerLog) / C;

  return phenoAge;
}

/**
 * Main function to calculate PhenoAge (backward compatible)
 */
export function calculatePhenoAge(
  chronologicalAge: number,
  biomarkerValues: BiomarkerValue[]
): PhenoAgeResult {
  const extendedResult = calculatePhenoAgeExtended(chronologicalAge, biomarkerValues);

  return {
    biologicalAge: extendedResult.biologicalAge,
    chronologicalAge: extendedResult.chronologicalAge,
    ageDifference: extendedResult.ageDifference,
    availableBiomarkers: extendedResult.availableBiomarkers,
    missingBiomarkers: extendedResult.missingBiomarkers,
    confidence: extendedResult.confidence,
    calculationDate: extendedResult.calculationDate,
  };
}

/**
 * Extended PhenoAge calculation with imputation support
 */
export function calculatePhenoAgeExtended(
  chronologicalAge: number,
  biomarkerValues: BiomarkerValue[],
  options: PhenoAgeOptions = {}
): ExtendedPhenoAgeResult {
  const {
    sex,
    useImputation = true,
    minMeasuredForImputation = 3,
  } = options;

  // Convert biomarkers from canonical units to formula units
  const convertedBiomarkers = new Map<string, number>();
  const availableCodes: string[] = [];

  for (const bm of biomarkerValues) {
    const code = bm.code.toUpperCase();
    // Convert from canonical unit (stored in DB) to formula unit
    // Pass the unit so we can detect when values are already in formula units
    const convertedValue = convertCanonicalToFormula(code, bm.value, bm.unit);
    convertedBiomarkers.set(code, convertedValue);
    availableCodes.push(code);
  }

  // Handle alternative codes (HSCRP -> CRP)
  for (const [primary, alternatives] of Object.entries(ALTERNATIVE_CODES)) {
    if (!convertedBiomarkers.has(primary)) {
      for (const alt of alternatives) {
        if (convertedBiomarkers.has(alt)) {
          convertedBiomarkers.set(primary, convertedBiomarkers.get(alt)!);
          break;
        }
      }
    }
  }

  // Determine missing biomarkers
  const missingBiomarkers = PHENOAGE_BIOMARKER_CODES.filter(
    (code) =>
      !convertedBiomarkers.has(code) &&
      !(code === "CRP" && convertedBiomarkers.has("HSCRP"))
  );

  const measuredCount = PHENOAGE_BIOMARKER_CODES.length - missingBiomarkers.length;
  const shouldImpute = useImputation && measuredCount >= minMeasuredForImputation;

  const imputedBiomarkers: string[] = [];
  const biomarkerDetails: ExtendedPhenoAgeResult["biomarkerDetails"] = [];

  // Apply imputation if needed
  if (shouldImpute && missingBiomarkers.length > 0) {
    const imputedValues = imputeMissingBiomarkers(
      convertedBiomarkers,
      PHENOAGE_BIOMARKER_CODES,
      chronologicalAge,
      sex
    );

    for (const code of PHENOAGE_BIOMARKER_CODES) {
      const imputedValue = imputedValues.get(code);
      if (imputedValue) {
        if (imputedValue.isImputed) {
          imputedBiomarkers.push(code);
          convertedBiomarkers.set(code, imputedValue.value);
        }
        biomarkerDetails.push({
          code,
          value: imputedValue.value,
          unit: "formula",
          source: imputedValue.source,
        });
      }
    }
  } else {
    for (const code of PHENOAGE_BIOMARKER_CODES) {
      if (convertedBiomarkers.has(code)) {
        biomarkerDetails.push({
          code,
          value: convertedBiomarkers.get(code)!,
          unit: "formula",
          source: "measured",
        });
      }
    }
  }

  // Determine confidence
  let confidence: "high" | "medium" | "low";
  if (measuredCount >= 8) {
    confidence = "high";
  } else if (measuredCount >= 6) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  // Return null if not enough biomarkers
  if (measuredCount < minMeasuredForImputation && !shouldImpute) {
    return {
      biologicalAge: null,
      chronologicalAge: Math.round(chronologicalAge),
      ageDifference: null,
      availableBiomarkers: availableCodes,
      missingBiomarkers,
      confidence: "low",
      calculationDate: new Date().toISOString(),
      imputedBiomarkers: [],
      usedImputation: false,
      biomarkerDetails,
    };
  }

  // Calculate PhenoAge
  const xb = calculateLinearPredictor(chronologicalAge, convertedBiomarkers);
  const mortalityScore = calculateMortalityScore(xb);
  let phenoAge = mortalityScoreToPhenoAge(mortalityScore);

  // Debug logging
  console.log("[PhenoAge] Calculation intermediate values:", {
    chronologicalAge,
    xb,
    mortalityScore,
    phenoAge,
    biomarkerValues: Object.fromEntries(convertedBiomarkers),
  });

  if (isNaN(phenoAge)) {
    return {
      biologicalAge: null,
      chronologicalAge: Math.round(chronologicalAge),
      ageDifference: null,
      availableBiomarkers: availableCodes,
      missingBiomarkers,
      confidence: "low",
      calculationDate: new Date().toISOString(),
      imputedBiomarkers,
      usedImputation: imputedBiomarkers.length > 0,
      biomarkerDetails,
    };
  }

  // Clamp to reasonable range
  const minAge = Math.max(18, chronologicalAge - MAX_AGE_DEVIATION);
  const maxAge = Math.min(120, chronologicalAge + MAX_AGE_DEVIATION);
  phenoAge = Math.max(minAge, Math.min(maxAge, phenoAge));

  const roundedPhenoAge = Math.round(phenoAge);
  const roundedChronoAge = Math.round(chronologicalAge);
  const ageDifference = roundedPhenoAge - roundedChronoAge;

  // Adjust confidence for heavy imputation
  if (imputedBiomarkers.length >= 4) {
    confidence = "low";
  } else if (imputedBiomarkers.length >= 2 && confidence === "high") {
    confidence = "medium";
  }

  return {
    biologicalAge: roundedPhenoAge,
    chronologicalAge: roundedChronoAge,
    ageDifference,
    availableBiomarkers: availableCodes,
    missingBiomarkers,
    confidence,
    calculationDate: new Date().toISOString(),
    imputedBiomarkers,
    usedImputation: imputedBiomarkers.length > 0,
    biomarkerDetails,
  };
}

/**
 * Get a list of required biomarkers with their expected units
 */
export function getRequiredBiomarkers(): Array<{
  code: string;
  name: string;
  expectedUnit: string;
  description: string;
}> {
  return [
    { code: "ALB", name: "Albumin", expectedUnit: "g/L", description: "Main blood protein, liver function indicator" },
    { code: "CREAT", name: "Creatinine", expectedUnit: "μmol/L", description: "Kidney function marker" },
    { code: "GLU", name: "Glucose", expectedUnit: "mmol/L", description: "Blood sugar level (fasting)" },
    { code: "CRP", name: "C-Reactive Protein", expectedUnit: "mg/L", description: "Inflammation marker" },
    { code: "LYMPH", name: "Lymphocyte %", expectedUnit: "%", description: "Immune cell percentage" },
    { code: "MCV", name: "Mean Corpuscular Volume", expectedUnit: "fL", description: "Red blood cell size" },
    { code: "RDW", name: "Red Cell Distribution Width", expectedUnit: "%", description: "Red blood cell size variation" },
    { code: "ALP", name: "Alkaline Phosphatase", expectedUnit: "U/L", description: "Liver and bone enzyme" },
    { code: "WBC", name: "White Blood Cells", expectedUnit: "10^9/L", description: "Immune system cells" },
  ];
}
