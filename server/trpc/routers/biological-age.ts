import { z } from "zod";
import { eq, and, desc, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { bloodTests, bloodTestResults, biomarkers, users, householdMembers } from "../../db/schema";
import {
  calculatePhenoAgeExtended,
  getRequiredBiomarkers,
  PHENOAGE_BIOMARKER_CODES,
  type PhenoAgeResult,
  type Sex,
} from "../../services/biological-age";

export const biologicalAgeRouter = createTRPCRouter({
  // Calculate biological age from the latest blood test
  calculate: protectedProcedure
    .input(z.object({ householdMemberId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
    // Determine date of birth and sex based on member or user
    let dateOfBirth: string | null = null;
    let sex: Sex | undefined = undefined;

    if (input?.householdMemberId) {
      // Get household member's date of birth and sex
      const member = await ctx.db.query.householdMembers.findFirst({
        where: eq(householdMembers.id, input.householdMemberId),
        columns: {
          dateOfBirth: true,
          sex: true,
        },
      });
      dateOfBirth = member?.dateOfBirth ?? null;
      sex = (member?.sex === "male" ? "M" : member?.sex === "female" ? "F" : undefined);
    } else {
      // Get user's date of birth and sex for chronological age
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
        columns: {
          dateOfBirth: true,
          sex: true,
        },
      });
      dateOfBirth = user?.dateOfBirth ?? null;
      sex = (user?.sex === "male" ? "M" : user?.sex === "female" ? "F" : undefined);
    }

    if (!dateOfBirth) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Date of birth is required to calculate biological age. Please update your profile.",
      });
    }

    // Calculate chronological age
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let chronologicalAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      chronologicalAge--;
    }
    // Add decimal for more precision
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    chronologicalAge += dayOfYear / 365;

    // Build blood test filter based on member selection
    const bloodTestFilter = input?.householdMemberId
      ? eq(bloodTests.householdMemberId, input.householdMemberId)
      : isNull(bloodTests.householdMemberId);

    // Get all completed blood tests with results (ordered by most recent first)
    const allTests = await ctx.db.query.bloodTests.findMany({
      where: and(
        eq(bloodTests.userId, ctx.user.id),
        eq(bloodTests.status, "completed"),
        bloodTestFilter
      ),
      orderBy: [desc(bloodTests.testDate)],
      with: {
        results: {
          with: {
            biomarker: true,
          },
        },
      },
    });

    console.log("[BioAge] Found", allTests.length, "blood tests");
    if (allTests.length > 0) {
      console.log("[BioAge] Latest test has", allTests[0].results.length, "results");
      console.log("[BioAge] Latest test biomarker codes:", allTests[0].results.map(r => r.biomarker?.code).join(", "));
    }

    if (allTests.length === 0 || allTests[0].results.length === 0) {
      return {
        biologicalAge: null,
        chronologicalAge: Math.round(chronologicalAge),
        ageDifference: null,
        availableBiomarkers: [],
        missingBiomarkers: [...PHENOAGE_BIOMARKER_CODES],
        imputedBiomarkers: [],
        confidence: "low" as const,
        calculationDate: new Date().toISOString(),
        testDate: null,
        message: "No completed blood tests found. Upload a blood test to calculate your biological age.",
      };
    }

    const latestTest = allTests[0];

    // Build a map of biomarker code -> value, starting with the latest test
    // For missing PhenoAge biomarkers, search previous tests
    const biomarkerMap = new Map<string, { value: number; unit: string; testDate: string }>();

    // First, add all biomarkers from the latest test
    for (const result of latestTest.results) {
      if (result.biomarker && result.value) {
        const code = result.biomarker.code.toUpperCase();
        biomarkerMap.set(code, {
          value: parseFloat(result.value),
          unit: result.unit,
          testDate: latestTest.testDate,
        });
      }
    }

    // For missing PhenoAge biomarkers, search previous tests
    const phenoAgeCodesToFind = [...PHENOAGE_BIOMARKER_CODES];
    // Also include HSCRP as alternative for CRP
    const codesToSearch = [...phenoAgeCodesToFind, "HSCRP"];

    for (const code of codesToSearch) {
      if (!biomarkerMap.has(code)) {
        // Search previous tests for this biomarker
        for (let i = 1; i < allTests.length; i++) {
          const test = allTests[i];
          const result = test.results.find(
            (r) => r.biomarker && r.biomarker.code.toUpperCase() === code && r.value
          );
          if (result && result.biomarker) {
            biomarkerMap.set(code, {
              value: parseFloat(result.value),
              unit: result.unit,
              testDate: test.testDate,
            });
            break; // Found it, stop searching
          }
        }
      }
    }

    // Convert map to array format expected by PhenoAge calculation
    const biomarkerValues = Array.from(biomarkerMap.entries()).map(([code, data]) => ({
      code,
      value: data.value,
      unit: data.unit,
    }));

    // Debug: log what biomarkers we have
    const phenoAgeBiomarkersFound = PHENOAGE_BIOMARKER_CODES.filter(
      code => biomarkerMap.has(code) || (code === "CRP" && biomarkerMap.has("HSCRP"))
    );
    console.log("[BioAge] PhenoAge biomarkers found:", phenoAgeBiomarkersFound);
    console.log("[BioAge] All biomarkers available:", Array.from(biomarkerMap.keys()));
    console.log("[BioAge] Biomarker values:", biomarkerValues.map(b => `${b.code}=${b.value}`));

    // Calculate PhenoAge with sex-stratified imputation
    // Note: Using minMeasuredForImputation: 0 to always allow calculation with imputation
    const result = calculatePhenoAgeExtended(chronologicalAge, biomarkerValues, {
      sex,
      useImputation: true,
      minMeasuredForImputation: 0, // Changed from 3 to 0 to always allow calculation
    });

    console.log("[BioAge] PhenoAge result:", {
      biologicalAge: result.biologicalAge,
      confidence: result.confidence,
      missingBiomarkers: result.missingBiomarkers,
      imputedBiomarkers: result.imputedBiomarkers,
      usedImputation: result.usedImputation,
    });

    // Round to integers
    const biologicalAge = result.biologicalAge !== null ? Math.round(result.biologicalAge) : null;
    const ageDifference = result.ageDifference !== null ? Math.round(result.ageDifference) : null;

    return {
      biologicalAge,
      chronologicalAge: Math.round(chronologicalAge),
      ageDifference,
      availableBiomarkers: result.availableBiomarkers,
      missingBiomarkers: result.missingBiomarkers,
      imputedBiomarkers: result.imputedBiomarkers,
      confidence: result.confidence,
      calculationDate: result.calculationDate,
      testDate: latestTest.testDate,
      testId: latestTest.id,
      usedImputation: result.usedImputation,
      biomarkerDetails: result.biomarkerDetails,
    };
  }),

  // Get which PhenoAge biomarkers are available in the latest test
  getAvailableBiomarkers: protectedProcedure
    .input(z.object({ householdMemberId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
    // Build blood test filter based on member selection
    const bloodTestFilter = input?.householdMemberId
      ? eq(bloodTests.householdMemberId, input.householdMemberId)
      : isNull(bloodTests.householdMemberId);

    // Get the latest completed blood test
    const latestTest = await ctx.db.query.bloodTests.findFirst({
      where: and(
        eq(bloodTests.userId, ctx.user.id),
        eq(bloodTests.status, "completed"),
        bloodTestFilter
      ),
      orderBy: [desc(bloodTests.testDate)],
      with: {
        results: {
          with: {
            biomarker: true,
          },
        },
      },
    });

    const requiredBiomarkers = getRequiredBiomarkers();
    const availableCodes = new Set(
      latestTest?.results
        .filter((r) => r.biomarker)
        .map((r) => r.biomarker.code) ?? []
    );

    return requiredBiomarkers.map((bm) => ({
      ...bm,
      available: availableCodes.has(bm.code),
      value: latestTest?.results.find((r) => r.biomarker?.code === bm.code)?.value ?? null,
      unit: latestTest?.results.find((r) => r.biomarker?.code === bm.code)?.unit ?? bm.expectedUnit,
    }));
  }),

  // Get historical biological age calculations
  getHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
      householdMemberId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Determine date of birth and sex based on member or user
      let dateOfBirth: string | null = null;
      let sex: Sex | undefined = undefined;

      if (input.householdMemberId) {
        // Get household member's date of birth and sex
        const member = await ctx.db.query.householdMembers.findFirst({
          where: eq(householdMembers.id, input.householdMemberId),
          columns: {
            dateOfBirth: true,
            sex: true,
          },
        });
        dateOfBirth = member?.dateOfBirth ?? null;
        sex = (member?.sex === "male" ? "M" : member?.sex === "female" ? "F" : undefined);
      } else {
        // Get user's date of birth and sex
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.id, ctx.user.id),
          columns: {
            dateOfBirth: true,
            sex: true,
          },
        });
        dateOfBirth = user?.dateOfBirth ?? null;
        sex = (user?.sex === "male" ? "M" : user?.sex === "female" ? "F" : undefined);
      }

      if (!dateOfBirth) {
        return [];
      }

      // Build blood test filter based on member selection
      const bloodTestFilter = input.householdMemberId
        ? eq(bloodTests.householdMemberId, input.householdMemberId)
        : isNull(bloodTests.householdMemberId);

      // Get completed blood tests
      const tests = await ctx.db.query.bloodTests.findMany({
        where: and(
          eq(bloodTests.userId, ctx.user.id),
          eq(bloodTests.status, "completed"),
          bloodTestFilter
        ),
        orderBy: [desc(bloodTests.testDate)],
        limit: input.limit,
        with: {
          results: {
            with: {
              biomarker: true,
            },
          },
        },
      });

      // Calculate biological age for each test
      const history: Array<{
        testId: string;
        testDate: string;
        biologicalAge: number | null;
        chronologicalAge: number;
        ageDifference: number | null;
        confidence: "high" | "medium" | "low";
      }> = [];

      for (const test of tests) {
        // Calculate chronological age at time of test
        const testDate = new Date(test.testDate);
        const birthDate = new Date(dateOfBirth);
        let chronoAge = testDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = testDate.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && testDate.getDate() < birthDate.getDate())) {
          chronoAge--;
        }

        const biomarkerValues = test.results
          .filter((r) => r.biomarker && r.value)
          .map((r) => ({
            code: r.biomarker.code,
            value: parseFloat(r.value),
            unit: r.unit,
          }));

        const result = calculatePhenoAgeExtended(chronoAge, biomarkerValues, {
          sex,
          useImputation: true,
          minMeasuredForImputation: 3,
        });

        // Round to integers
        const biologicalAge = result.biologicalAge !== null ? Math.round(result.biologicalAge) : null;
        const ageDifference = result.ageDifference !== null ? Math.round(result.ageDifference) : null;

        history.push({
          testId: test.id,
          testDate: test.testDate,
          biologicalAge: result.confidence !== "low" ? biologicalAge : null,
          chronologicalAge: Math.round(chronoAge),
          ageDifference: result.confidence !== "low" ? ageDifference : null,
          confidence: result.confidence,
        });
      }

      return history;
    }),
});
