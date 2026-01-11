/**
 * Population Median Imputation for Missing Biomarkers
 *
 * Based on NHANES III (Third National Health and Nutrition Examination Survey) data.
 * These medians are used when biomarkers are missing to provide reasonable estimates
 * rather than defaulting to 0 (which produces invalid/dangerous calculations).
 *
 * Age groups: 20-39, 40-59, 60+
 * Sex: Male (M), Female (F)
 *
 * Reference: NHANES III Laboratory Data (1988-1994)
 * https://wwwn.cdc.gov/nchs/nhanes/nhanes3/default.aspx
 */

export type AgeGroup = "20-39" | "40-59" | "60+";
export type Sex = "M" | "F";

/**
 * Population median values for PhenoAge biomarkers
 * Units are in the formula units (the units expected by the PhenoAge calculation):
 * - ALB: g/dL
 * - CREAT: mg/dL
 * - GLU: mg/dL
 * - CRP: mg/dL (natural log is taken in the formula)
 * - LYMPH: %
 * - MCV: fL
 * - RDW: %
 * - ALP: U/L
 * - WBC: 10^3/μL
 */
interface PopulationMedians {
  ALB: number;
  CREAT: number;
  GLU: number;
  CRP: number;
  LYMPH: number;
  MCV: number;
  RDW: number;
  ALP: number;
  WBC: number;
}

/**
 * NHANES III derived population medians stratified by age group and sex
 *
 * These values represent the median (50th percentile) for healthy adults
 * in each demographic group. Using medians instead of means reduces the
 * impact of outliers.
 */
const POPULATION_MEDIANS: Record<AgeGroup, Record<Sex, PopulationMedians>> = {
  "20-39": {
    M: {
      ALB: 4.5, // Albumin: healthy young males typically 4.3-4.7 g/dL
      CREAT: 1.0, // Creatinine: males have higher muscle mass
      GLU: 92, // Fasting glucose: young adults typically have good glucose control
      CRP: 0.1, // CRP: low inflammation in healthy young adults
      LYMPH: 32, // Lymphocyte %: robust immune function
      MCV: 89, // MCV: normal red cell volume
      RDW: 12.8, // RDW: low variation indicates healthy red cells
      ALP: 70, // ALP: normal liver/bone function
      WBC: 6.5, // WBC: normal immune cell count
    },
    F: {
      ALB: 4.3, // Slightly lower albumin in females
      CREAT: 0.8, // Lower creatinine due to lower muscle mass
      GLU: 88, // Generally slightly lower fasting glucose
      CRP: 0.12, // Slightly higher baseline CRP
      LYMPH: 33, // Similar lymphocyte percentage
      MCV: 88, // Slightly lower MCV
      RDW: 12.6, // Similar RDW
      ALP: 55, // Lower ALP in premenopausal women
      WBC: 6.8, // Slightly higher WBC
    },
  },
  "40-59": {
    M: {
      ALB: 4.3, // Albumin begins slight decline with age
      CREAT: 1.05, // Slight increase with age
      GLU: 98, // Glucose tends to rise with age
      CRP: 0.18, // Inflammation increases with age
      LYMPH: 29, // Lymphocyte % declines slightly
      MCV: 90, // Stable MCV
      RDW: 13.2, // Slight increase in variation
      ALP: 75, // Slight increase
      WBC: 6.3, // Generally stable
    },
    F: {
      ALB: 4.2,
      CREAT: 0.85,
      GLU: 94,
      CRP: 0.2, // Higher baseline inflammation
      LYMPH: 30,
      MCV: 89,
      RDW: 13.0,
      ALP: 65, // Increases post-menopause
      WBC: 6.5,
    },
  },
  "60+": {
    M: {
      ALB: 4.0, // Continued decline with age
      CREAT: 1.1, // May decrease due to muscle loss
      GLU: 105, // Further increase common
      CRP: 0.3, // Higher baseline inflammation in elderly
      LYMPH: 26, // Continued decline in immune function
      MCV: 91, // Slight increase
      RDW: 13.8, // More variation in red cell size
      ALP: 80, // Increased with age
      WBC: 6.0, // May decline slightly
    },
    F: {
      ALB: 3.9,
      CREAT: 0.9,
      GLU: 100,
      CRP: 0.35,
      LYMPH: 27,
      MCV: 90,
      RDW: 13.5,
      ALP: 80, // Post-menopausal levels similar to males
      WBC: 5.8,
    },
  },
};

/**
 * Overall population medians (unweighted average across all groups)
 * Used when age/sex is not available
 */
const OVERALL_MEDIANS: PopulationMedians = {
  ALB: 4.2,
  CREAT: 0.95,
  GLU: 96,
  CRP: 0.2,
  LYMPH: 29.5,
  MCV: 89.5,
  RDW: 13.15,
  ALP: 70,
  WBC: 6.3,
};

/**
 * Get the age group for a given chronological age
 */
export function getAgeGroup(age: number): AgeGroup {
  if (age < 40) return "20-39";
  if (age < 60) return "40-59";
  return "60+";
}

/**
 * Get population median for a specific biomarker
 *
 * @param code - Biomarker code (e.g., "ALB", "CREAT")
 * @param age - Chronological age (optional, uses overall median if not provided)
 * @param sex - Sex ("M" or "F", optional)
 * @returns The population median value in formula units
 */
export function getPopulationMedian(
  code: string,
  age?: number,
  sex?: Sex
): number | null {
  const normalizedCode = code.toUpperCase();

  // Handle CRP/HSCRP alias
  const lookupCode = normalizedCode === "HSCRP" ? "CRP" : normalizedCode;

  // Check if this is a valid PhenoAge biomarker
  if (!(lookupCode in OVERALL_MEDIANS)) {
    return null;
  }

  // If we don't have age or sex, use overall medians
  if (age === undefined || sex === undefined) {
    return OVERALL_MEDIANS[lookupCode as keyof PopulationMedians];
  }

  const ageGroup = getAgeGroup(age);
  return POPULATION_MEDIANS[ageGroup][sex][lookupCode as keyof PopulationMedians];
}

/**
 * Get all population medians for a demographic group
 *
 * @param age - Chronological age (optional)
 * @param sex - Sex (optional)
 * @returns Object with median values for all PhenoAge biomarkers
 */
export function getAllPopulationMedians(
  age?: number,
  sex?: Sex
): PopulationMedians {
  if (age === undefined || sex === undefined) {
    return { ...OVERALL_MEDIANS };
  }

  const ageGroup = getAgeGroup(age);
  return { ...POPULATION_MEDIANS[ageGroup][sex] };
}

/**
 * Imputation result containing the value and whether it was imputed
 */
export interface ImputedValue {
  value: number;
  isImputed: boolean;
  source: "measured" | "imputed-stratified" | "imputed-overall";
}

/**
 * Impute missing biomarkers using population medians
 *
 * Takes a map of measured biomarker values and fills in missing ones
 * with age/sex-appropriate population medians.
 *
 * @param measuredValues - Map of biomarker code to measured value (in formula units)
 * @param requiredCodes - List of required biomarker codes
 * @param age - Chronological age (optional, for stratified imputation)
 * @param sex - Sex (optional, for stratified imputation)
 * @returns Map of biomarker code to ImputedValue
 */
export function imputeMissingBiomarkers(
  measuredValues: Map<string, number>,
  requiredCodes: readonly string[],
  age?: number,
  sex?: Sex
): Map<string, ImputedValue> {
  const result = new Map<string, ImputedValue>();
  const hasStratification = age !== undefined && sex !== undefined;

  for (const code of requiredCodes) {
    const normalizedCode = code.toUpperCase();

    // Check if we have a measured value
    if (measuredValues.has(normalizedCode)) {
      result.set(normalizedCode, {
        value: measuredValues.get(normalizedCode)!,
        isImputed: false,
        source: "measured",
      });
      continue;
    }

    // Handle CRP/HSCRP alias
    if (normalizedCode === "CRP" && measuredValues.has("HSCRP")) {
      result.set(normalizedCode, {
        value: measuredValues.get("HSCRP")!,
        isImputed: false,
        source: "measured",
      });
      continue;
    }

    // Impute using population median
    const median = getPopulationMedian(normalizedCode, age, sex);
    if (median !== null) {
      result.set(normalizedCode, {
        value: median,
        isImputed: true,
        source: hasStratification ? "imputed-stratified" : "imputed-overall",
      });
    }
  }

  return result;
}

/**
 * Additional biomarker medians for alternative aging methods
 * These are not part of PhenoAge but used in MetabolicAge, InflammationAge, etc.
 */
export const ADDITIONAL_BIOMARKER_MEDIANS: Record<
  AgeGroup,
  Record<Sex, Record<string, number>>
> = {
  "20-39": {
    M: {
      HBA1C: 5.2, // HbA1c in % (NGSP)
      ESR: 5, // Erythrocyte Sedimentation Rate (mm/hr)
      TC: 185, // Total Cholesterol (mg/dL)
      LDL: 110, // LDL Cholesterol (mg/dL)
      HDL: 48, // HDL Cholesterol (mg/dL)
      TG: 100, // Triglycerides (mg/dL)
      INSULIN: 8, // Fasting Insulin (μU/mL)
    },
    F: {
      HBA1C: 5.1,
      ESR: 10, // Higher in females
      TC: 180,
      LDL: 100,
      HDL: 58, // Higher in females
      TG: 85,
      INSULIN: 7,
    },
  },
  "40-59": {
    M: {
      HBA1C: 5.5,
      ESR: 8,
      TC: 210,
      LDL: 130,
      HDL: 45,
      TG: 130,
      INSULIN: 10,
    },
    F: {
      HBA1C: 5.4,
      ESR: 15,
      TC: 205,
      LDL: 120,
      HDL: 55,
      TG: 110,
      INSULIN: 9,
    },
  },
  "60+": {
    M: {
      HBA1C: 5.8,
      ESR: 12,
      TC: 200,
      LDL: 125,
      HDL: 43,
      TG: 140,
      INSULIN: 12,
    },
    F: {
      HBA1C: 5.7,
      ESR: 20,
      TC: 220,
      LDL: 135,
      HDL: 52,
      TG: 125,
      INSULIN: 11,
    },
  },
};

/**
 * Get median for additional (non-PhenoAge) biomarkers
 */
export function getAdditionalBiomarkerMedian(
  code: string,
  age?: number,
  sex?: Sex
): number | null {
  const normalizedCode = code.toUpperCase();

  // Default to middle age group and average of both sexes if not specified
  if (age === undefined || sex === undefined) {
    const mValue = ADDITIONAL_BIOMARKER_MEDIANS["40-59"].M[normalizedCode];
    const fValue = ADDITIONAL_BIOMARKER_MEDIANS["40-59"].F[normalizedCode];
    if (mValue === undefined || fValue === undefined) return null;
    return (mValue + fValue) / 2;
  }

  const ageGroup = getAgeGroup(age);
  return ADDITIONAL_BIOMARKER_MEDIANS[ageGroup][sex][normalizedCode] ?? null;
}
