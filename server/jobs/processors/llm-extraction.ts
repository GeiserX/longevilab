/**
 * LLM Extraction Job Processor
 * Extracts biomarkers from OCR text using LLM and creates blood test results
 */
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { bloodTests, bloodTestResults, biomarkers } from "../../db/schema";
import { extractBiomarkersFromText, validateExtractedBiomarkers, convertUnitWithLLM } from "../../services/llm";
import { convertToCanonical, isKnownUnit } from "@/lib/units";
import type { LlmExtractionJobData } from "../queue";

export async function processLlmExtractionJob(data: LlmExtractionJobData): Promise<void> {
  const { bloodTestId } = data;

  try {
    // Get the blood test with OCR text
    const bloodTest = await db.query.bloodTests.findFirst({
      where: eq(bloodTests.id, bloodTestId),
    });

    if (!bloodTest) {
      throw new Error(`Blood test not found: ${bloodTestId}`);
    }

    if (!bloodTest.ocrText) {
      throw new Error(`No OCR text available for blood test: ${bloodTestId}`);
    }

    console.log(`[LLM] Extracting biomarkers from ${bloodTest.ocrText.length} characters of text`);

    // Extract biomarkers using LLM
    const extractionResult = await extractBiomarkersFromText(bloodTest.ocrText);

    console.log(`[LLM] Extracted ${extractionResult.biomarkers.length} biomarkers`);

    // Get all known biomarker codes from database
    const allBiomarkers = await db.query.biomarkers.findMany();
    const knownCodes = allBiomarkers.map((b) => b.code);

    // Validate extracted biomarkers against known codes
    const validBiomarkers = validateExtractedBiomarkers(
      extractionResult.biomarkers,
      knownCodes
    );

    console.log(`[LLM] ${validBiomarkers.length} biomarkers matched known codes`);

    // Create a map of code to biomarker info (id, canonicalUnit, and name)
    const codeToInfo = new Map(
      allBiomarkers.map((b) => [b.code, { id: b.id, canonicalUnit: b.canonicalUnit, name: b.name }])
    );

    // Delete any existing results for this blood test (in case of retry)
    await db
      .delete(bloodTestResults)
      .where(eq(bloodTestResults.bloodTestId, bloodTestId));

    // Insert new blood test results with unit standardization
    if (validBiomarkers.length > 0) {
      const resultsToInsert = [];

      for (const biomarker of validBiomarkers) {
        const info = codeToInfo.get(biomarker.code)!;
        const numericValue = parseFloat(biomarker.value);

        // Try to convert to canonical unit
        let finalValue = biomarker.value;
        let finalUnit = biomarker.unit;

        if (!isNaN(numericValue)) {
          // First try programmatic conversion
          if (isKnownUnit(biomarker.code, biomarker.unit)) {
            const convertedValue = convertToCanonical(numericValue, biomarker.code, biomarker.unit);
            if (convertedValue !== null) {
              finalValue = convertedValue.toString();
              finalUnit = info.canonicalUnit;
              console.log(`[LLM] ${biomarker.code}: ${biomarker.value} ${biomarker.unit} → ${finalValue} ${finalUnit}`);
            }
          } else {
            // Fall back to LLM-based conversion for unknown units
            console.log(`[LLM] ${biomarker.code}: Unknown unit "${biomarker.unit}", trying LLM conversion...`);

            const llmResult = await convertUnitWithLLM(
              biomarker.code,
              info.name,
              biomarker.unit,
              info.canonicalUnit,
              numericValue
            );

            if (llmResult) {
              finalValue = llmResult.convertedValue.toString();
              finalUnit = llmResult.unit;
              console.log(`[LLM] ${biomarker.code}: LLM converted ${biomarker.value} ${biomarker.unit} → ${finalValue} ${finalUnit}`);
            } else {
              console.log(`[LLM] ${biomarker.code}: Could not convert "${biomarker.unit}", keeping original`);
            }
          }
        }

        resultsToInsert.push({
          bloodTestId,
          biomarkerId: info.id,
          value: finalValue,
          unit: finalUnit,
          originalValue: biomarker.value,
          originalUnit: biomarker.unit,
          isOutOfRange: false, // Will be calculated in review or on confirmation
        });
      }

      await db.insert(bloodTestResults).values(resultsToInsert);
    }

    // Update blood test with extracted metadata and set status to review
    await db
      .update(bloodTests)
      .set({
        status: "review",
        testDate: extractionResult.testDate || bloodTest.testDate,
        labName: extractionResult.labName || bloodTest.labName,
        updatedAt: new Date(),
      })
      .where(eq(bloodTests.id, bloodTestId));

    console.log(`[LLM] Blood test ${bloodTestId} ready for review`);

  } catch (error) {
    console.error(`[LLM] Error processing blood test ${bloodTestId}:`, error);

    // Update status to failed
    await db
      .update(bloodTests)
      .set({
        status: "failed",
        processingError: error instanceof Error ? error.message : "Unknown error during LLM extraction",
        updatedAt: new Date(),
      })
      .where(eq(bloodTests.id, bloodTestId));

    throw error;
  }
}
