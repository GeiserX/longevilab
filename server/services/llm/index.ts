/**
 * LLM Extraction Service using Vercel AI SDK with OpenAI
 * Extracts biomarker values from OCR text
 */
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Schema for extracted biomarker
const ExtractedBiomarkerSchema = z.object({
  code: z.string().describe("The biomarker code from the known list"),
  value: z.string().describe("The numeric value as a string"),
  unit: z.string().describe("The unit of measurement"),
  originalName: z.string().optional().describe("The original name as it appeared in the document"),
});

const ExtractionResultSchema = z.object({
  testDate: z.string().optional().describe("The date of the blood test in YYYY-MM-DD format if found"),
  labName: z.string().optional().describe("The laboratory name if found"),
  biomarkers: z.array(ExtractedBiomarkerSchema).describe("Array of extracted biomarker values"),
});

export type ExtractedBiomarker = z.infer<typeof ExtractedBiomarkerSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

// Known biomarker codes and their aliases for the prompt
const BIOMARKER_SCHEMA = `
Known biomarker codes and their aliases:
- WBC (White Blood Cells, Leukocytes)
- RBC (Red Blood Cells, Erythrocytes)
- HGB (Hemoglobin, Hgb, Haemoglobin)
- HCT (Hematocrit, PCV, Packed Cell Volume)
- MCV (Mean Corpuscular Volume)
- MCH (Mean Corpuscular Hemoglobin)
- MCHC (Mean Corpuscular Hemoglobin Concentration)
- PLT (Platelets, Thrombocytes)
- RDW (Red Cell Distribution Width)
- TC (Total Cholesterol, Cholesterol)
- LDL (LDL Cholesterol, LDL-C, Bad Cholesterol)
- HDL (HDL Cholesterol, HDL-C, Good Cholesterol)
- TG (Triglycerides, Trigs)
- VLDL (VLDL Cholesterol)
- GLU (Glucose, Blood Sugar, Fasting Glucose)
- BUN (Blood Urea Nitrogen, Urea)
- CREAT (Creatinine)
- EGFR (Estimated GFR, eGFR)
- NA (Sodium, Na+)
- K (Potassium, K+)
- CL (Chloride, Cl-)
- CO2 (Carbon Dioxide, Bicarbonate, HCO3)
- CA (Calcium)
- TP (Total Protein)
- ALB (Albumin)
- BILI (Bilirubin, Total Bilirubin)
- ALP (Alkaline Phosphatase, Alk Phos)
- AST (Aspartate Aminotransferase, SGOT)
- ALT (Alanine Aminotransferase, SGPT)
- TSH (Thyroid Stimulating Hormone)
- T4 (Thyroxine, Free T4, FT4)
- T3 (Triiodothyronine, Free T3, FT3)
- FE (Iron, Serum Iron)
- FERR (Ferritin)
- TIBC (Total Iron Binding Capacity)
- TSAT (Transferrin Saturation, Iron Saturation)
- VITD (Vitamin D, 25-OH Vitamin D, D3)
- VITB12 (Vitamin B12, Cobalamin)
- FOLATE (Folate, Folic Acid)
- MG (Magnesium)
- CRP (C-Reactive Protein)
- HSCRP (High-Sensitivity CRP, hs-CRP)
- ESR (Erythrocyte Sedimentation Rate, Sed Rate)
- HBA1C (Hemoglobin A1c, A1C, Glycated Hemoglobin)
- FINS (Fasting Insulin, Insulin)
- TESTO (Testosterone, Total Testosterone)
- CORT (Cortisol)
`;

export async function extractBiomarkersFromText(ocrText: string): Promise<ExtractionResult> {
  const { object } = await generateObject({
    model: openai("gpt-4o"),
    schema: ExtractionResultSchema,
    prompt: `You are a medical document parser specialized in extracting blood test results.

Given the following OCR text from a blood test document, extract all biomarker values.

${BIOMARKER_SCHEMA}

Instructions:
1. Find all biomarker values in the text
2. Match each biomarker to the correct code from the known list above
3. Extract the numeric value (as a string to preserve precision)
4. Extract the unit of measurement exactly as shown
5. If you find the test date, extract it in YYYY-MM-DD format
6. If you find the lab name, extract it

Only extract biomarkers that you are confident about. If a value seems ambiguous or unclear, skip it.
Do not make up values. Only extract what is clearly present in the document.

OCR Text:
${ocrText}`,
  });

  return object;
}

/**
 * Validates extracted biomarkers against known codes
 */
export function validateExtractedBiomarkers(
  extracted: ExtractedBiomarker[],
  knownCodes: string[]
): ExtractedBiomarker[] {
  return extracted.filter((biomarker) => {
    const isValid = knownCodes.includes(biomarker.code);
    if (!isValid) {
      console.warn(`[LLM] Skipping unknown biomarker code: ${biomarker.code}`);
    }
    return isValid;
  });
}

// Schema for unit conversion result
const UnitConversionResultSchema = z.object({
  canConvert: z.boolean().describe("Whether the unit can be converted to the canonical unit"),
  isEquivalent: z.boolean().describe("Whether the source unit is just a different notation of the canonical unit (same measurement, factor=1)"),
  conversionFactor: z.number().optional().describe("The factor to divide the source value by to get canonical value. Only if canConvert is true and isEquivalent is false."),
  normalizedSourceUnit: z.string().optional().describe("The standardized notation of the source unit"),
  notes: z.string().optional().describe("Any notes about the conversion"),
});

export type UnitConversionResult = z.infer<typeof UnitConversionResultSchema>;

/**
 * Uses a small LLM to determine unit conversion when programmatic conversion fails
 * This handles cases where:
 * 1. The unit symbol is written differently (e.g., "μg/dl" vs "µg/dL")
 * 2. The unit needs actual conversion (e.g., mg/dL to mmol/L for glucose)
 */
export async function convertUnitWithLLM(
  biomarkerCode: string,
  biomarkerName: string,
  sourceUnit: string,
  canonicalUnit: string,
  value: number
): Promise<{ convertedValue: number; unit: string } | null> {
  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"), // Using smaller model for cost efficiency
      schema: UnitConversionResultSchema,
      prompt: `You are a medical unit conversion expert. Determine if and how to convert a biomarker unit.

Biomarker: ${biomarkerName} (${biomarkerCode})
Source Unit: "${sourceUnit}"
Target Canonical Unit: "${canonicalUnit}"
Value: ${value}

Instructions:
1. First, check if the source unit is just a different notation/symbol for the same unit as the canonical unit.
   - Example: "μg/dL" and "µg/dL" and "ug/dL" are all the same unit (just different ways to write micro)
   - Example: "10^9/L" and "x10^9/L" and "10⁹/L" are the same unit
   - Example: "g/dl" and "g/dL" are the same (case difference)
   - If they're equivalent notations, set isEquivalent=true and canConvert=true

2. If they're different units that require mathematical conversion:
   - Provide the conversionFactor (divide source by this factor to get canonical)
   - For example, for glucose: mg/dL to mmol/L, factor is 18.0182 (divide mg/dL by 18.0182 to get mmol/L)
   - For hemoglobin: g/dL to g/L, factor is 0.1 (divide g/dL by 0.1 to get g/L, or multiply by 10)

3. If the units cannot be converted (incompatible measurements), set canConvert=false

Be precise with conversion factors - they must be medically accurate.`,
    });

    if (!object.canConvert) {
      console.log(`[LLM-Unit] Cannot convert ${sourceUnit} to ${canonicalUnit} for ${biomarkerCode}`);
      return null;
    }

    if (object.isEquivalent) {
      // Units are equivalent, just use the canonical unit notation
      console.log(`[LLM-Unit] ${biomarkerCode}: "${sourceUnit}" is equivalent to "${canonicalUnit}"`);
      return { convertedValue: value, unit: canonicalUnit };
    }

    if (object.conversionFactor) {
      const convertedValue = value / object.conversionFactor;
      console.log(`[LLM-Unit] ${biomarkerCode}: ${value} ${sourceUnit} → ${convertedValue} ${canonicalUnit} (factor: ${object.conversionFactor})`);
      return { convertedValue, unit: canonicalUnit };
    }

    return null;
  } catch (error) {
    console.error(`[LLM-Unit] Error converting unit for ${biomarkerCode}:`, error);
    return null;
  }
}
