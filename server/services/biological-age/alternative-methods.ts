/**
 * Alternative Biological Age Calculation Methods
 *
 * These methods use different biomarker subsets to estimate biological age,
 * providing fallback options when PhenoAge biomarkers are incomplete.
 *
 * Each method has different strengths:
 * - MetabolicAge: Focuses on glucose metabolism and diabetes risk
 * - InflammationAge: Focuses on systemic inflammation markers
 * - CardioAge: Focuses on cardiovascular risk factors
 *
 * Scientific Basis:
 * These simplified models are based on established correlations between
 * biomarkers and mortality/morbidity from epidemiological studies.
 * They are less validated than PhenoAge but provide useful estimates
 * when full PhenoAge calculation is not possible.
 */

import {
  getPopulationMedian,
  getAdditionalBiomarkerMedian,
  type Sex,
} from "./imputation";

/**
 * Result from an alternative biological age calculation
 */
export interface AlternativeAgeResult {
  /** The calculated biological age, or null if calculation failed */
  biologicalAge: number | null;
  /** Confidence level based on available biomarkers */
  confidence: "high" | "medium" | "low" | "none";
  /** Number of biomarkers available for this method */
  availableBiomarkerCount: number;
  /** Total biomarkers required for this method */
  requiredBiomarkerCount: number;
  /** Which biomarkers were used */
  usedBiomarkers: string[];
  /** Which biomarkers were missing */
  missingBiomarkers: string[];
  /** Name of the method */
  methodName: string;
  /** Brief description of what this method measures */
  description: string;
}

/**
 * Input biomarker with value and unit
 */
export interface BiomarkerInput {
  code: string;
  value: number;
  unit: string;
}

/**
 * Unit conversion helper for metabolic biomarkers
 */
function convertMetabolicUnits(
  code: string,
  value: number,
  unit: string
): number {
  switch (code.toUpperCase()) {
    case "GLU":
      // Convert to mg/dL
      if (unit === "mmol/L") return value * 18.0182;
      return value;

    case "HBA1C":
      // Keep in % (NGSP standard)
      // If in mmol/mol (IFCC), convert: % = (mmol/mol / 10.929) + 2.15
      if (unit === "mmol/mol") return value / 10.929 + 2.15;
      return value;

    case "INSULIN":
      // Convert to μU/mL
      if (unit === "pmol/L") return value / 6.945;
      return value;

    default:
      return value;
  }
}

/**
 * Unit conversion helper for inflammation biomarkers
 */
function convertInflammationUnits(
  code: string,
  value: number,
  unit: string
): number {
  switch (code.toUpperCase()) {
    case "CRP":
    case "HSCRP":
      // Convert to mg/L
      if (unit === "mg/dL") return value * 10;
      return value;

    case "WBC":
      // Convert to 10^9/L
      if (unit === "10^3/μL") return value;
      return value;

    case "ESR":
      // Already in mm/hr
      return value;

    default:
      return value;
  }
}

/**
 * Unit conversion helper for cardiovascular biomarkers
 */
function convertCardioUnits(
  code: string,
  value: number,
  unit: string
): number {
  switch (code.toUpperCase()) {
    case "TC":
    case "LDL":
    case "HDL":
      // Convert to mg/dL
      if (unit === "mmol/L") return value * 38.67;
      return value;

    case "TG":
      // Convert to mg/dL
      if (unit === "mmol/L") return value * 88.57;
      return value;

    default:
      return value;
  }
}

/**
 * MetabolicAge Calculator
 *
 * Uses glucose metabolism markers to estimate metabolic aging.
 * Based on the strong relationship between glycemic control and aging.
 *
 * Required biomarkers:
 * - GLU (Glucose): Primary marker
 * - HBA1C: Long-term glucose control (optional but improves accuracy)
 * - INSULIN: Insulin resistance indicator (optional)
 *
 * Scientific basis:
 * - Higher fasting glucose associated with accelerated aging (Diabetes Care, 2011)
 * - HbA1c ≥ 5.7% indicates prediabetes, strongly associated with mortality
 * - HOMA-IR (using fasting glucose + insulin) predicts metabolic age
 *
 * Formula derivation:
 * Uses z-scores based on age-expected values, where deviations from
 * optimal values are translated to age adjustments.
 */
export function calculateMetabolicAge(
  chronologicalAge: number,
  biomarkers: BiomarkerInput[],
  sex?: Sex
): AlternativeAgeResult {
  const REQUIRED_BIOMARKERS = ["GLU"];
  const OPTIONAL_BIOMARKERS = ["HBA1C", "INSULIN"];
  const ALL_BIOMARKERS = [...REQUIRED_BIOMARKERS, ...OPTIONAL_BIOMARKERS];

  // Build a map of available biomarkers
  const biomarkerMap = new Map<string, number>();
  const usedBiomarkers: string[] = [];
  const missingBiomarkers: string[] = [];

  for (const bm of biomarkers) {
    const code = bm.code.toUpperCase();
    if (ALL_BIOMARKERS.includes(code)) {
      biomarkerMap.set(code, convertMetabolicUnits(code, bm.value, bm.unit));
      usedBiomarkers.push(code);
    }
  }

  // Check for missing biomarkers
  for (const code of ALL_BIOMARKERS) {
    if (!biomarkerMap.has(code)) {
      missingBiomarkers.push(code);
    }
  }

  // Check if we have minimum required biomarkers
  const hasGlucose = biomarkerMap.has("GLU");

  if (!hasGlucose) {
    return {
      biologicalAge: null,
      confidence: "none",
      availableBiomarkerCount: usedBiomarkers.length,
      requiredBiomarkerCount: 1,
      usedBiomarkers,
      missingBiomarkers,
      methodName: "MetabolicAge",
      description: "Metabolic aging based on glucose control",
    };
  }

  // Get values
  const glucose = biomarkerMap.get("GLU")!;
  const hba1c = biomarkerMap.get("HBA1C");
  const insulin = biomarkerMap.get("INSULIN");

  // Get optimal/reference values for this age
  const optimalGlucose = 90; // mg/dL - optimal fasting glucose
  const optimalHba1c = 5.0; // % - optimal HbA1c
  const optimalInsulin = 6; // μU/mL - optimal fasting insulin

  // Calculate age adjustments based on deviations from optimal
  let ageAdjustment = 0;

  // Glucose contribution (primary marker)
  // Every 10 mg/dL above optimal adds ~1.5 years
  // Below optimal (down to 70) is neutral to slightly protective
  if (glucose > optimalGlucose) {
    ageAdjustment += ((glucose - optimalGlucose) / 10) * 1.5;
  } else if (glucose < 70) {
    // Very low glucose can indicate issues
    ageAdjustment += ((70 - glucose) / 10) * 0.5;
  }

  // HbA1c contribution (if available)
  if (hba1c !== undefined) {
    // Every 0.5% above optimal adds ~2 years
    if (hba1c > optimalHba1c) {
      ageAdjustment += ((hba1c - optimalHba1c) / 0.5) * 2;
    }
  }

  // Insulin contribution (if available) - HOMA-IR proxy
  if (insulin !== undefined) {
    // High fasting insulin indicates insulin resistance
    if (insulin > optimalInsulin) {
      ageAdjustment += ((insulin - optimalInsulin) / 4) * 1;
    }
  }

  // Calculate metabolic age
  const metabolicAge = chronologicalAge + ageAdjustment;

  // Clamp to reasonable range
  const clampedAge = Math.max(18, Math.min(120, metabolicAge));

  // Determine confidence based on available biomarkers
  let confidence: "high" | "medium" | "low";
  if (usedBiomarkers.length >= 3) {
    confidence = "high";
  } else if (usedBiomarkers.length >= 2) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    biologicalAge: Math.round(clampedAge * 10) / 10,
    confidence,
    availableBiomarkerCount: usedBiomarkers.length,
    requiredBiomarkerCount: 1,
    usedBiomarkers,
    missingBiomarkers,
    methodName: "MetabolicAge",
    description: "Metabolic aging based on glucose control",
  };
}

/**
 * InflammationAge Calculator
 *
 * Uses inflammatory markers to estimate inflammation-related aging.
 * Chronic low-grade inflammation ("inflammaging") is a hallmark of aging.
 *
 * Required biomarkers (at least one):
 * - CRP or HSCRP: Primary inflammation marker
 * - WBC: White blood cell count
 *
 * Optional biomarkers:
 * - ESR: Erythrocyte sedimentation rate
 *
 * Scientific basis:
 * - CRP > 3 mg/L associated with high cardiovascular risk (AHA)
 * - Elevated WBC associated with mortality independent of infection
 * - "Inflammaging" theory: Franceschi et al., 2000
 */
export function calculateInflammationAge(
  chronologicalAge: number,
  biomarkers: BiomarkerInput[],
  sex?: Sex
): AlternativeAgeResult {
  const PRIMARY_BIOMARKERS = ["CRP", "HSCRP", "WBC"];
  const OPTIONAL_BIOMARKERS = ["ESR"];
  const ALL_BIOMARKERS = [...new Set([...PRIMARY_BIOMARKERS, ...OPTIONAL_BIOMARKERS])];

  // Build a map of available biomarkers
  const biomarkerMap = new Map<string, number>();
  const usedBiomarkers: string[] = [];
  const missingBiomarkers: string[] = [];

  for (const bm of biomarkers) {
    const code = bm.code.toUpperCase();
    if (ALL_BIOMARKERS.includes(code)) {
      biomarkerMap.set(code, convertInflammationUnits(code, bm.value, bm.unit));
      usedBiomarkers.push(code);
    }
  }

  // Normalize CRP/HSCRP - they're interchangeable
  if (biomarkerMap.has("HSCRP") && !biomarkerMap.has("CRP")) {
    biomarkerMap.set("CRP", biomarkerMap.get("HSCRP")!);
    usedBiomarkers.push("CRP");
  }

  // Check for missing biomarkers (excluding HSCRP if CRP is present)
  for (const code of ALL_BIOMARKERS) {
    if (!biomarkerMap.has(code)) {
      if (code === "HSCRP" && biomarkerMap.has("CRP")) continue;
      if (code === "CRP" && biomarkerMap.has("HSCRP")) continue;
      missingBiomarkers.push(code);
    }
  }

  // Check if we have at least one primary marker
  const hasCRP = biomarkerMap.has("CRP");
  const hasWBC = biomarkerMap.has("WBC");

  if (!hasCRP && !hasWBC) {
    return {
      biologicalAge: null,
      confidence: "none",
      availableBiomarkerCount: usedBiomarkers.length,
      requiredBiomarkerCount: 1,
      usedBiomarkers,
      missingBiomarkers,
      methodName: "InflammationAge",
      description: "Biological aging based on inflammation markers",
    };
  }

  // Get values
  const crp = biomarkerMap.get("CRP"); // mg/L
  const wbc = biomarkerMap.get("WBC"); // 10^9/L
  const esr = biomarkerMap.get("ESR"); // mm/hr

  // Optimal reference values
  const optimalCRP = 0.5; // mg/L - low cardiovascular risk
  const optimalWBC = 6.0; // 10^9/L - normal range
  const optimalESR = sex === "F" ? 12 : 8; // mm/hr - higher normal for females

  // Calculate age adjustments
  let ageAdjustment = 0;
  let contributorCount = 0;

  // CRP contribution
  if (crp !== undefined) {
    contributorCount++;
    if (crp <= 1) {
      // Low risk - no adjustment or slight benefit
      ageAdjustment += (crp - optimalCRP) * 1;
    } else if (crp <= 3) {
      // Moderate risk
      ageAdjustment += (crp - optimalCRP) * 2;
    } else {
      // High risk - CRP > 3 mg/L
      // Exponential impact for very high CRP
      ageAdjustment += 5 + Math.log(crp) * 2;
    }
  }

  // WBC contribution
  if (wbc !== undefined) {
    contributorCount++;
    if (wbc > optimalWBC) {
      // High WBC adds years
      ageAdjustment += (wbc - optimalWBC) * 0.8;
    } else if (wbc < 4.0) {
      // Low WBC (leukopenia) can also indicate problems
      ageAdjustment += (4.0 - wbc) * 1;
    }
  }

  // ESR contribution (if available)
  if (esr !== undefined) {
    contributorCount++;
    if (esr > optimalESR) {
      ageAdjustment += ((esr - optimalESR) / 5) * 1;
    }
  }

  // Calculate inflammation age
  const inflammationAge = chronologicalAge + ageAdjustment;

  // Clamp to reasonable range
  const clampedAge = Math.max(18, Math.min(120, inflammationAge));

  // Determine confidence
  let confidence: "high" | "medium" | "low";
  if (contributorCount >= 3) {
    confidence = "high";
  } else if (contributorCount >= 2) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    biologicalAge: Math.round(clampedAge * 10) / 10,
    confidence,
    availableBiomarkerCount: usedBiomarkers.length,
    requiredBiomarkerCount: 1,
    usedBiomarkers,
    missingBiomarkers,
    methodName: "InflammationAge",
    description: "Biological aging based on inflammation markers",
  };
}

/**
 * CardioAge Calculator
 *
 * Uses cardiovascular risk factors to estimate cardiovascular aging.
 * Based on lipid profiles commonly included in standard blood panels.
 *
 * Required biomarkers (at least 2):
 * - TC: Total Cholesterol
 * - HDL: HDL Cholesterol
 * - LDL: LDL Cholesterol (optional, can be calculated)
 * - TG: Triglycerides
 *
 * Scientific basis:
 * - TC/HDL ratio is a strong predictor of cardiovascular risk
 * - Framingham Heart Study risk equations
 * - High TG associated with metabolic syndrome and mortality
 */
export function calculateCardioAge(
  chronologicalAge: number,
  biomarkers: BiomarkerInput[],
  sex?: Sex
): AlternativeAgeResult {
  const ALL_BIOMARKERS = ["TC", "HDL", "LDL", "TG"];

  // Build a map of available biomarkers
  const biomarkerMap = new Map<string, number>();
  const usedBiomarkers: string[] = [];
  const missingBiomarkers: string[] = [];

  for (const bm of biomarkers) {
    const code = bm.code.toUpperCase();
    if (ALL_BIOMARKERS.includes(code)) {
      biomarkerMap.set(code, convertCardioUnits(code, bm.value, bm.unit));
      usedBiomarkers.push(code);
    }
  }

  // Check for missing biomarkers
  for (const code of ALL_BIOMARKERS) {
    if (!biomarkerMap.has(code)) {
      missingBiomarkers.push(code);
    }
  }

  // Calculate LDL if missing but TC, HDL, and TG are available (Friedewald)
  if (!biomarkerMap.has("LDL") && biomarkerMap.has("TC") && biomarkerMap.has("HDL") && biomarkerMap.has("TG")) {
    const tc = biomarkerMap.get("TC")!;
    const hdl = biomarkerMap.get("HDL")!;
    const tg = biomarkerMap.get("TG")!;
    if (tg < 400) {
      // Friedewald formula only valid for TG < 400
      const ldl = tc - hdl - tg / 5;
      biomarkerMap.set("LDL", ldl);
      usedBiomarkers.push("LDL");
      const ldlIndex = missingBiomarkers.indexOf("LDL");
      if (ldlIndex > -1) missingBiomarkers.splice(ldlIndex, 1);
    }
  }

  // Check if we have minimum required biomarkers (need at least TC and HDL for ratio)
  const hasTC = biomarkerMap.has("TC");
  const hasHDL = biomarkerMap.has("HDL");

  if (!hasTC || !hasHDL) {
    return {
      biologicalAge: null,
      confidence: "none",
      availableBiomarkerCount: usedBiomarkers.length,
      requiredBiomarkerCount: 2,
      usedBiomarkers,
      missingBiomarkers,
      methodName: "CardioAge",
      description: "Cardiovascular aging based on lipid profile",
    };
  }

  // Get values
  const tc = biomarkerMap.get("TC")!;
  const hdl = biomarkerMap.get("HDL")!;
  const ldl = biomarkerMap.get("LDL");
  const tg = biomarkerMap.get("TG");

  // Calculate TC/HDL ratio (key risk predictor)
  const tcHdlRatio = tc / hdl;

  // Optimal values
  const optimalRatio = sex === "F" ? 3.5 : 4.0; // Lower is better
  const optimalLDL = 100; // mg/dL
  const optimalTG = 100; // mg/dL

  // Calculate age adjustments
  let ageAdjustment = 0;
  let contributorCount = 2; // TC and HDL are always present

  // TC/HDL ratio contribution (primary marker)
  if (tcHdlRatio > optimalRatio) {
    // Higher ratio = higher risk = older cardiovascular age
    // Each point above optimal adds ~2 years
    ageAdjustment += (tcHdlRatio - optimalRatio) * 2;
  } else if (tcHdlRatio < optimalRatio) {
    // Better than optimal provides slight benefit
    ageAdjustment += (tcHdlRatio - optimalRatio) * 1;
  }

  // LDL contribution (if available)
  if (ldl !== undefined) {
    contributorCount++;
    if (ldl > optimalLDL) {
      // High LDL adds years
      ageAdjustment += ((ldl - optimalLDL) / 20) * 1;
    }
  }

  // TG contribution (if available)
  if (tg !== undefined) {
    contributorCount++;
    if (tg > 150) {
      // Elevated TG (>150 is borderline high)
      ageAdjustment += ((tg - 150) / 50) * 1.5;
    } else if (tg < optimalTG) {
      // Optimal TG provides slight benefit
      ageAdjustment -= 0.5;
    }
  }

  // Calculate cardiovascular age
  const cardioAge = chronologicalAge + ageAdjustment;

  // Clamp to reasonable range
  const clampedAge = Math.max(18, Math.min(120, cardioAge));

  // Determine confidence
  let confidence: "high" | "medium" | "low";
  if (contributorCount >= 4) {
    confidence = "high";
  } else if (contributorCount >= 3) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    biologicalAge: Math.round(clampedAge * 10) / 10,
    confidence,
    availableBiomarkerCount: usedBiomarkers.length,
    requiredBiomarkerCount: 2,
    usedBiomarkers,
    missingBiomarkers,
    methodName: "CardioAge",
    description: "Cardiovascular aging based on lipid profile",
  };
}

/**
 * Calculate all applicable alternative ages
 */
export function calculateAllAlternativeAges(
  chronologicalAge: number,
  biomarkers: BiomarkerInput[],
  sex?: Sex
): AlternativeAgeResult[] {
  return [
    calculateMetabolicAge(chronologicalAge, biomarkers, sex),
    calculateInflammationAge(chronologicalAge, biomarkers, sex),
    calculateCardioAge(chronologicalAge, biomarkers, sex),
  ].filter((result) => result.biologicalAge !== null);
}
