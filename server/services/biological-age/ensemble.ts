/**
 * Ensemble Biological Age Calculator
 *
 * Combines multiple biological age calculation methods to provide a more
 * robust estimate when not all biomarkers are available.
 *
 * Methodology:
 * 1. Calculate PhenoAge (gold standard, highest weight when available)
 * 2. Calculate alternative methods (MetabolicAge, InflammationAge, CardioAge)
 * 3. Weight each result by:
 *    - Method reliability (based on validation studies)
 *    - Confidence level (based on available biomarkers)
 * 4. Return weighted average with overall confidence
 *
 * This approach ensures users always get a biological age estimate while
 * clearly communicating the reliability of that estimate.
 */

import type { BiomarkerValue } from "./phenoage";
import type { Sex } from "./imputation";
import type { AlternativeAgeResult } from "./alternative-methods";

/**
 * Method contribution to the ensemble
 */
export interface MethodContribution {
  /** Name of the calculation method */
  method: string;
  /** Calculated biological age from this method */
  age: number;
  /** Weight given to this method in the ensemble (0-1) */
  weight: number;
  /** Confidence level of this specific method */
  confidence: "high" | "medium" | "low";
  /** Brief description of the method */
  description: string;
}

/**
 * Extended result including ensemble information
 */
export interface EnsembleAgeResult {
  /** The final calculated biological age (weighted ensemble) */
  biologicalAge: number | null;
  /** User's chronological age */
  chronologicalAge: number;
  /** Difference (biological - chronological), negative means younger */
  ageDifference: number | null;
  /** Overall confidence in the estimate */
  confidence: "high" | "medium" | "low" | "none";
  /** Which method was given the most weight */
  primaryMethod: string;
  /** Detailed breakdown of each method's contribution */
  methodsUsed: MethodContribution[];
  /** All biomarkers that were available for calculation */
  availableBiomarkers: string[];
  /** Biomarkers that were missing and imputed (for PhenoAge) */
  imputedBiomarkers: string[];
  /** Date of calculation */
  calculationDate: string;
  /** Summary message explaining the result */
  summary: string;
}

/**
 * PhenoAge result with imputation tracking
 */
export interface PhenoAgeResultWithImputation {
  biologicalAge: number | null;
  confidence: "high" | "medium" | "low";
  availableBiomarkers: string[];
  missingBiomarkers: string[];
  imputedBiomarkers: string[];
}

/**
 * Method reliability weights
 *
 * These weights reflect the scientific validation level of each method:
 * - PhenoAge: Extensively validated, trained on NHANES III mortality data
 * - MetabolicAge: Based on well-established glucose-aging relationships
 * - InflammationAge: Based on inflammaging theory, moderate validation
 * - CardioAge: Based on Framingham-style risk factors, good validation
 */
const METHOD_BASE_WEIGHTS: Record<string, number> = {
  PhenoAge: 1.0, // Gold standard
  MetabolicAge: 0.6, // Good evidence for glucose-aging link
  InflammationAge: 0.5, // Moderate evidence
  CardioAge: 0.5, // Moderate evidence
};

/**
 * Confidence multipliers
 * Applied to base weights based on biomarker availability
 */
const CONFIDENCE_MULTIPLIERS: Record<string, number> = {
  high: 1.0,
  medium: 0.7,
  low: 0.4,
  none: 0,
};

/**
 * Calculate the weighted ensemble biological age
 *
 * @param chronologicalAge - User's chronological age
 * @param phenoAgeResult - Result from PhenoAge calculation (with imputation)
 * @param alternativeResults - Results from alternative methods
 * @returns Combined ensemble result
 */
export function calculateEnsembleAge(
  chronologicalAge: number,
  phenoAgeResult: PhenoAgeResultWithImputation | null,
  alternativeResults: AlternativeAgeResult[]
): EnsembleAgeResult {
  const methodsUsed: MethodContribution[] = [];
  let totalWeight = 0;
  let weightedSum = 0;

  // Add PhenoAge if available
  if (phenoAgeResult !== null && phenoAgeResult.biologicalAge !== null) {
    const baseWeight = METHOD_BASE_WEIGHTS.PhenoAge;
    const confidenceMultiplier =
      CONFIDENCE_MULTIPLIERS[phenoAgeResult.confidence];
    const weight = baseWeight * confidenceMultiplier;

    methodsUsed.push({
      method: "PhenoAge",
      age: phenoAgeResult.biologicalAge,
      weight,
      confidence: phenoAgeResult.confidence,
      description: "Levine et al. mortality-trained biological age",
    });

    weightedSum += phenoAgeResult.biologicalAge * weight;
    totalWeight += weight;
  }

  // Add alternative methods
  for (const result of alternativeResults) {
    if (result.biologicalAge === null || result.confidence === "none") continue;

    const baseWeight = METHOD_BASE_WEIGHTS[result.methodName] ?? 0.3;
    const confidenceMultiplier = CONFIDENCE_MULTIPLIERS[result.confidence];
    const weight = baseWeight * confidenceMultiplier;

    methodsUsed.push({
      method: result.methodName,
      age: result.biologicalAge,
      weight,
      confidence: result.confidence,
      description: result.description,
    });

    weightedSum += result.biologicalAge * weight;
    totalWeight += weight;
  }

  // If no methods produced a result, return chronological age with "none" confidence
  if (totalWeight === 0 || methodsUsed.length === 0) {
    return {
      biologicalAge: null,
      chronologicalAge,
      ageDifference: null,
      confidence: "none",
      primaryMethod: "none",
      methodsUsed: [],
      availableBiomarkers: phenoAgeResult?.availableBiomarkers ?? [],
      imputedBiomarkers: phenoAgeResult?.imputedBiomarkers ?? [],
      calculationDate: new Date().toISOString(),
      summary:
        "Unable to calculate biological age. No relevant biomarkers available.",
    };
  }

  // Calculate weighted average
  const ensembleAge = weightedSum / totalWeight;
  const roundedAge = Math.round(ensembleAge * 10) / 10;
  const ageDifference = Math.round((ensembleAge - chronologicalAge) * 10) / 10;

  // Sort methods by weight (highest first) to find primary method
  methodsUsed.sort((a, b) => b.weight - a.weight);
  const primaryMethod = methodsUsed[0].method;

  // Normalize weights to percentages for display
  for (const method of methodsUsed) {
    method.weight = Math.round((method.weight / totalWeight) * 100) / 100;
  }

  // Determine overall confidence
  let overallConfidence: "high" | "medium" | "low";
  const highConfidenceWeight = methodsUsed
    .filter((m) => m.confidence === "high")
    .reduce((sum, m) => sum + m.weight, 0);
  const mediumConfidenceWeight = methodsUsed
    .filter((m) => m.confidence === "medium")
    .reduce((sum, m) => sum + m.weight, 0);

  if (highConfidenceWeight >= 0.5) {
    overallConfidence = "high";
  } else if (highConfidenceWeight + mediumConfidenceWeight >= 0.5) {
    overallConfidence = "medium";
  } else {
    overallConfidence = "low";
  }

  // Generate summary message
  const summary = generateSummary(
    roundedAge,
    chronologicalAge,
    ageDifference,
    overallConfidence,
    primaryMethod,
    methodsUsed.length,
    phenoAgeResult?.imputedBiomarkers ?? []
  );

  // Collect all available biomarkers from all methods
  const allAvailableBiomarkers = new Set<string>();
  if (phenoAgeResult) {
    phenoAgeResult.availableBiomarkers.forEach((b) =>
      allAvailableBiomarkers.add(b)
    );
  }
  for (const result of alternativeResults) {
    result.usedBiomarkers.forEach((b) => allAvailableBiomarkers.add(b));
  }

  return {
    biologicalAge: roundedAge,
    chronologicalAge,
    ageDifference,
    confidence: overallConfidence,
    primaryMethod,
    methodsUsed,
    availableBiomarkers: Array.from(allAvailableBiomarkers),
    imputedBiomarkers: phenoAgeResult?.imputedBiomarkers ?? [],
    calculationDate: new Date().toISOString(),
    summary,
  };
}

/**
 * Generate a human-readable summary of the biological age result
 */
function generateSummary(
  biologicalAge: number,
  chronologicalAge: number,
  ageDifference: number,
  confidence: "high" | "medium" | "low",
  primaryMethod: string,
  methodCount: number,
  imputedBiomarkers: string[]
): string {
  const parts: string[] = [];

  // Age comparison
  if (Math.abs(ageDifference) < 1) {
    parts.push(
      `Your biological age (${biologicalAge}) closely matches your chronological age (${Math.round(chronologicalAge)}).`
    );
  } else if (ageDifference < 0) {
    parts.push(
      `Your biological age (${biologicalAge}) is ${Math.abs(ageDifference)} years younger than your chronological age (${Math.round(chronologicalAge)}).`
    );
  } else {
    parts.push(
      `Your biological age (${biologicalAge}) is ${ageDifference} years older than your chronological age (${Math.round(chronologicalAge)}).`
    );
  }

  // Confidence explanation
  if (confidence === "high") {
    parts.push("This estimate has high confidence based on comprehensive biomarker data.");
  } else if (confidence === "medium") {
    parts.push("This estimate has moderate confidence. More biomarkers would improve accuracy.");
  } else {
    parts.push(
      "This estimate has lower confidence due to limited biomarker availability."
    );
  }

  // Method info
  if (methodCount > 1) {
    parts.push(
      `Calculated using ${methodCount} methods, primarily ${primaryMethod}.`
    );
  } else {
    parts.push(`Calculated using ${primaryMethod}.`);
  }

  // Imputation warning
  if (imputedBiomarkers.length > 0) {
    parts.push(
      `Note: ${imputedBiomarkers.length} biomarker(s) were estimated from population averages.`
    );
  }

  return parts.join(" ");
}

/**
 * Determine if a result should use fallback to chronological age
 *
 * This is called when all methods fail to produce a result.
 * Returns the chronological age with appropriate messaging.
 */
export function createFallbackResult(
  chronologicalAge: number,
  availableBiomarkers: string[]
): EnsembleAgeResult {
  return {
    biologicalAge: Math.round(chronologicalAge * 10) / 10,
    chronologicalAge,
    ageDifference: 0,
    confidence: "none",
    primaryMethod: "fallback",
    methodsUsed: [
      {
        method: "Chronological (fallback)",
        age: Math.round(chronologicalAge * 10) / 10,
        weight: 1,
        confidence: "low",
        description: "Using chronological age due to insufficient biomarkers",
      },
    ],
    availableBiomarkers,
    imputedBiomarkers: [],
    calculationDate: new Date().toISOString(),
    summary:
      "Unable to calculate biological age from available biomarkers. " +
      "Showing chronological age as a placeholder. " +
      "Upload a blood test with more biomarkers (glucose, CRP, or lipid panel) for a biological age estimate.",
  };
}

/**
 * Method reliability ranking for display purposes
 */
export const METHOD_DESCRIPTIONS: Record<
  string,
  { name: string; fullName: string; description: string; reliability: string }
> = {
  PhenoAge: {
    name: "PhenoAge",
    fullName: "Phenotypic Age (Levine et al.)",
    description:
      "Gold-standard biological age measure trained on mortality data from 10,000+ individuals",
    reliability: "Highest - extensively validated in multiple cohorts",
  },
  MetabolicAge: {
    name: "MetabolicAge",
    fullName: "Metabolic Age",
    description:
      "Estimates biological age based on glucose metabolism and insulin sensitivity",
    reliability: "Moderate - based on well-established metabolic aging research",
  },
  InflammationAge: {
    name: "InflammationAge",
    fullName: "Inflammation Age",
    description:
      'Estimates biological age based on chronic low-grade inflammation ("inflammaging")',
    reliability: "Moderate - based on inflammaging theory and CRP research",
  },
  CardioAge: {
    name: "CardioAge",
    fullName: "Cardiovascular Age",
    description:
      "Estimates biological age based on cardiovascular risk factors (lipid profile)",
    reliability: "Moderate - based on Framingham-style risk equations",
  },
};
