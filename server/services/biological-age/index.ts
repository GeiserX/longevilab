/**
 * Biological Age Calculation Module
 *
 * This module provides a comprehensive biological age calculation system that:
 * 1. Uses PhenoAge (Levine et al. 2018) as the gold-standard method
 * 2. Falls back to alternative methods when PhenoAge biomarkers are unavailable
 * 3. Combines multiple methods into an ensemble estimate with confidence levels
 * 4. Handles missing biomarkers via population median imputation
 *
 * Main entry point: calculateBiologicalAge()
 *
 * For backward compatibility, the original calculatePhenoAge() is also exported.
 */

// Re-export types and functions from sub-modules
export {
  calculatePhenoAge,
  calculatePhenoAgeExtended,
  getRequiredBiomarkers,
  PHENOAGE_BIOMARKER_CODES,
  ALTERNATIVE_CODES,
  type BiomarkerValue,
  type PhenoAgeResult,
  type ExtendedPhenoAgeResult,
  type PhenoAgeOptions,
} from "./phenoage";

export {
  getPopulationMedian,
  getAllPopulationMedians,
  getAdditionalBiomarkerMedian,
  imputeMissingBiomarkers,
  getAgeGroup,
  type Sex,
  type AgeGroup,
  type ImputedValue,
} from "./imputation";

export {
  calculateMetabolicAge,
  calculateInflammationAge,
  calculateCardioAge,
  calculateAllAlternativeAges,
  type AlternativeAgeResult,
  type BiomarkerInput,
} from "./alternative-methods";

export {
  calculateEnsembleAge,
  createFallbackResult,
  METHOD_DESCRIPTIONS,
  type EnsembleAgeResult,
  type MethodContribution,
  type PhenoAgeResultWithImputation,
} from "./ensemble";

// Import for internal use
import { calculatePhenoAgeExtended, type BiomarkerValue, type PhenoAgeOptions } from "./phenoage";
import { calculateAllAlternativeAges, type BiomarkerInput } from "./alternative-methods";
import { calculateEnsembleAge, createFallbackResult, type EnsembleAgeResult } from "./ensemble";
import type { Sex } from "./imputation";

/**
 * Options for the main biological age calculation
 */
export interface BiologicalAgeOptions {
  /** User's sex for stratified imputation ("M" or "F") */
  sex?: Sex;
  /** Whether to use imputation for missing PhenoAge biomarkers (default: true) */
  useImputation?: boolean;
  /** Whether to use alternative methods as fallback (default: true) */
  useAlternativeMethods?: boolean;
  /** Minimum measured PhenoAge biomarkers required before allowing imputation (default: 3) */
  minMeasuredForImputation?: number;
}

/**
 * Main entry point for biological age calculation
 *
 * This function provides the most robust biological age estimate by:
 * 1. Attempting PhenoAge calculation with available biomarkers
 * 2. Using imputation for missing PhenoAge biomarkers when appropriate
 * 3. Calculating alternative age methods (MetabolicAge, InflammationAge, CardioAge)
 * 4. Combining all available methods into a weighted ensemble estimate
 *
 * @param chronologicalAge - User's chronological age in years
 * @param biomarkers - Array of biomarker measurements
 * @param options - Calculation options
 * @returns EnsembleAgeResult with biological age and detailed method breakdown
 *
 * @example
 * // Full biomarker set
 * const result = calculateBiologicalAge(45, [
 *   { code: "ALB", value: 45, unit: "g/L" },
 *   { code: "CREAT", value: 80, unit: "μmol/L" },
 *   { code: "GLU", value: 5.5, unit: "mmol/L" },
 *   // ... more biomarkers
 * ], { sex: "M" });
 *
 * @example
 * // Limited biomarkers - will use alternative methods
 * const result = calculateBiologicalAge(45, [
 *   { code: "GLU", value: 5.5, unit: "mmol/L" },
 *   { code: "CRP", value: 1.5, unit: "mg/L" },
 *   { code: "TC", value: 5.2, unit: "mmol/L" },
 *   { code: "HDL", value: 1.4, unit: "mmol/L" },
 * ]);
 */
export function calculateBiologicalAge(
  chronologicalAge: number,
  biomarkers: BiomarkerValue[],
  options: BiologicalAgeOptions = {}
): EnsembleAgeResult {
  const {
    sex,
    useImputation = true,
    useAlternativeMethods = true,
    minMeasuredForImputation = 3,
  } = options;

  // Calculate PhenoAge with extended tracking
  const phenoAgeOptions: PhenoAgeOptions = {
    sex,
    useImputation,
    minMeasuredForImputation,
  };

  const phenoAgeResult = calculatePhenoAgeExtended(
    chronologicalAge,
    biomarkers,
    phenoAgeOptions
  );

  // Convert to format expected by ensemble
  const phenoAgeForEnsemble = {
    biologicalAge: phenoAgeResult.biologicalAge,
    confidence: phenoAgeResult.confidence,
    availableBiomarkers: phenoAgeResult.availableBiomarkers,
    missingBiomarkers: phenoAgeResult.missingBiomarkers,
    imputedBiomarkers: phenoAgeResult.imputedBiomarkers,
  };

  // Calculate alternative methods if enabled
  const alternativeResults = useAlternativeMethods
    ? calculateAllAlternativeAges(
        chronologicalAge,
        biomarkers as BiomarkerInput[],
        sex
      )
    : [];

  // Calculate ensemble result
  const ensembleResult = calculateEnsembleAge(
    chronologicalAge,
    phenoAgeForEnsemble,
    alternativeResults
  );

  // If no methods produced a result, return fallback
  if (ensembleResult.biologicalAge === null) {
    return createFallbackResult(
      chronologicalAge,
      biomarkers.map((b) => b.code.toUpperCase())
    );
  }

  return ensembleResult;
}

/**
 * Test cases documentation
 *
 * These test cases document expected behavior for different input scenarios:
 *
 * ## Test Case 1: All 9 PhenoAge biomarkers available
 * Input: Complete set of ALB, CREAT, GLU, CRP, LYMPH, MCV, RDW, ALP, WBC
 * Expected: High confidence PhenoAge, primaryMethod = "PhenoAge"
 *
 * ## Test Case 2: Only 5 PhenoAge biomarkers available
 * Input: ALB, CREAT, GLU, CRP, WBC (missing LYMPH, MCV, RDW, ALP)
 * Expected: Medium confidence with imputation for missing values,
 *           imputedBiomarkers = ["LYMPH", "MCV", "RDW", "ALP"]
 *
 * ## Test Case 3: Only GLU + CRP + WBC available
 * Input: Just glucose, CRP, and WBC measurements
 * Expected: Falls back to InflammationAge and MetabolicAge methods,
 *           primaryMethod likely "InflammationAge" or "MetabolicAge",
 *           lower overall confidence
 *
 * ## Test Case 4: No relevant biomarkers
 * Input: Empty array or unrelated biomarkers
 * Expected: biologicalAge = null (or chronological age fallback),
 *           confidence = "none",
 *           summary explains lack of data
 *
 * ## Test Case 5: Lipid panel only
 * Input: TC, HDL, LDL, TG
 * Expected: CardioAge calculation only,
 *           primaryMethod = "CardioAge",
 *           low to medium confidence
 *
 * ## Test Case 6: Mixed biomarkers from different panels
 * Input: GLU, HBA1C, CRP, WBC, TC, HDL
 * Expected: Multiple methods calculated and ensembled,
 *           weighted average of MetabolicAge, InflammationAge, CardioAge
 */

/**
 * Utility function to get a summary of available calculation methods
 * based on the biomarkers provided
 */
export function getAvailableMethods(
  biomarkers: BiomarkerValue[]
): Array<{
  method: string;
  canCalculate: boolean;
  availableCount: number;
  requiredCount: number;
  missingBiomarkers: string[];
}> {
  const codes = new Set(biomarkers.map((b) => b.code.toUpperCase()));

  // PhenoAge requirements
  const phenoAgeCodes = ["ALB", "CREAT", "GLU", "CRP", "LYMPH", "MCV", "RDW", "ALP", "WBC"];
  const phenoAgeAvailable = phenoAgeCodes.filter(
    (c) => codes.has(c) || (c === "CRP" && codes.has("HSCRP"))
  );
  const phenoAgeMissing = phenoAgeCodes.filter(
    (c) => !codes.has(c) && !(c === "CRP" && codes.has("HSCRP"))
  );

  // MetabolicAge requirements
  const metabolicCodes = ["GLU", "HBA1C", "INSULIN"];
  const metabolicRequired = ["GLU"];
  const metabolicAvailable = metabolicCodes.filter((c) => codes.has(c));
  const metabolicMissing = metabolicCodes.filter((c) => !codes.has(c));

  // InflammationAge requirements
  const inflammationCodes = ["CRP", "HSCRP", "WBC", "ESR"];
  const inflammationAvailable = inflammationCodes.filter((c) => codes.has(c));
  const inflammationMissing = inflammationCodes.filter((c) => !codes.has(c));

  // CardioAge requirements
  const cardioCodes = ["TC", "HDL", "LDL", "TG"];
  const cardioAvailable = cardioCodes.filter((c) => codes.has(c));
  const cardioMissing = cardioCodes.filter((c) => !codes.has(c));

  return [
    {
      method: "PhenoAge",
      canCalculate: phenoAgeAvailable.length >= 3, // With imputation
      availableCount: phenoAgeAvailable.length,
      requiredCount: 9,
      missingBiomarkers: phenoAgeMissing,
    },
    {
      method: "MetabolicAge",
      canCalculate: codes.has("GLU"),
      availableCount: metabolicAvailable.length,
      requiredCount: 1,
      missingBiomarkers: metabolicMissing,
    },
    {
      method: "InflammationAge",
      canCalculate: codes.has("CRP") || codes.has("HSCRP") || codes.has("WBC"),
      availableCount: inflammationAvailable.length,
      requiredCount: 1,
      missingBiomarkers: inflammationMissing,
    },
    {
      method: "CardioAge",
      canCalculate: codes.has("TC") && codes.has("HDL"),
      availableCount: cardioAvailable.length,
      requiredCount: 2,
      missingBiomarkers: cardioMissing,
    },
  ];
}
