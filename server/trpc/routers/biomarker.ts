import { z } from "zod";
import { eq, and, lte, gte, or, isNull, desc } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import {
  biomarkers,
  referenceRanges,
  users,
  biomarkerEducation,
  bloodTests,
  bloodTestResults,
  medications,
  householdMembers,
} from "../../db/schema";
import { differenceInYears, format } from "date-fns";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export const biomarkerRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.biomarkers.findMany({
      orderBy: (biomarkers, { asc }) => [asc(biomarkers.category), asc(biomarkers.name)],
    });
  }),

  getByCategory: publicProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.biomarkers.findMany({
        where: eq(biomarkers.category, input.category),
        orderBy: (biomarkers, { asc }) => [asc(biomarkers.name)],
      });
    }),

  getCategories: publicProcedure.query(async ({ ctx }) => {
    const allBiomarkers = await ctx.db.query.biomarkers.findMany();
    const categories = [...new Set(allBiomarkers.map((b) => b.category))];
    return categories.sort();
  }),

  getReferenceRange: protectedProcedure
    .input(z.object({ biomarkerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Get user's age and sex for personalized reference range
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      if (!user?.dateOfBirth || !user?.sex) {
        // Return general reference range if user profile incomplete
        return ctx.db.query.referenceRanges.findFirst({
          where: and(
            eq(referenceRanges.biomarkerId, input.biomarkerId),
            isNull(referenceRanges.sex)
          ),
        });
      }

      const age = differenceInYears(new Date(), new Date(user.dateOfBirth));

      // Find the most specific reference range for user
      const range = await ctx.db.query.referenceRanges.findFirst({
        where: and(
          eq(referenceRanges.biomarkerId, input.biomarkerId),
          lte(referenceRanges.minAge, age),
          gte(referenceRanges.maxAge, age),
          or(
            eq(referenceRanges.sex, user.sex),
            isNull(referenceRanges.sex)
          )
        ),
        orderBy: (referenceRanges, { desc }) => [
          // Prefer sex-specific ranges
          desc(referenceRanges.sex),
        ],
      });

      return range;
    }),

  getAllReferenceRanges: protectedProcedure.query(async ({ ctx }) => {
    // Get user's age and sex for personalized reference ranges
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
    });

    const allBiomarkers = await ctx.db.query.biomarkers.findMany();
    const allRanges = await ctx.db.query.referenceRanges.findMany({
      with: {
        biomarker: true,
      },
    });

    const age = user?.dateOfBirth
      ? differenceInYears(new Date(), new Date(user.dateOfBirth))
      : null;
    const sex = user?.sex || null;

    // Map biomarker ID to best matching reference range
    const rangeMap: Record<string, {
      minValue: string | null;
      maxValue: string | null;
      unit: string;
    }> = {};

    for (const biomarker of allBiomarkers) {
      // Filter ranges for this biomarker
      const ranges = allRanges.filter((r) => r.biomarkerId === biomarker.id);

      // Find best match: sex-specific > age-specific > general
      let bestRange = ranges.find(
        (r) =>
          r.sex === sex &&
          (age === null || (r.minAge === null || r.minAge <= age) && (r.maxAge === null || r.maxAge >= age))
      );

      if (!bestRange) {
        bestRange = ranges.find(
          (r) =>
            r.sex === null &&
            (age === null || (r.minAge === null || r.minAge <= age) && (r.maxAge === null || r.maxAge >= age))
        );
      }

      if (!bestRange && ranges.length > 0) {
        bestRange = ranges[0];
      }

      if (bestRange) {
        rangeMap[biomarker.id] = {
          minValue: bestRange.minValue,
          maxValue: bestRange.maxValue,
          unit: bestRange.unit,
        };
      }
    }

    return rangeMap;
  }),

  // Get education content for a single biomarker
  getEducation: publicProcedure
    .input(z.object({ biomarkerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const education = await ctx.db.query.biomarkerEducation.findFirst({
        where: eq(biomarkerEducation.biomarkerId, input.biomarkerId),
      });

      return education ?? null;
    }),

  // Get all education content (for bulk loading)
  getAllEducation: publicProcedure.query(async ({ ctx }) => {
    const allEducation = await ctx.db.query.biomarkerEducation.findMany({
      with: {
        biomarker: true,
      },
    });

    // Map by biomarker ID for easy lookup
    const educationMap: Record<string, {
      description: string | null;
      whyItMatters: string | null;
      ifLow: string | null;
      ifHigh: string | null;
      howToImprove: string | null;
      relatedBiomarkerCodes: string[];
    }> = {};

    for (const edu of allEducation) {
      educationMap[edu.biomarkerId] = {
        description: edu.description,
        whyItMatters: edu.whyItMatters,
        ifLow: edu.ifLow,
        ifHigh: edu.ifHigh,
        howToImprove: edu.howToImprove,
        relatedBiomarkerCodes: edu.relatedBiomarkerCodes ?? [],
      };
    }

    return educationMap;
  }),

  // Get all biomarkers with their education content
  getAllWithEducation: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.biomarkers.findMany({
      orderBy: (biomarkers, { asc }) => [asc(biomarkers.category), asc(biomarkers.name)],
      with: {
        education: true,
      },
    });
  }),

  // Get personalized AI insights for a biomarker
  getPersonalizedInsights: protectedProcedure
    .input(
      z.object({
        biomarkerId: z.string().uuid(),
        householdMemberId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the biomarker info
      const biomarker = await ctx.db.query.biomarkers.findFirst({
        where: eq(biomarkers.id, input.biomarkerId),
      });

      if (!biomarker) {
        throw new Error("Biomarker not found");
      }

      // Determine which member we're getting insights for
      let memberId = input.householdMemberId;
      let memberProfile: {
        name: string;
        dateOfBirth: string | null;
        sex: string | null;
      } | null = null;

      if (memberId) {
        // Get household member profile (verify they belong to user's household)
        const member = await ctx.db.query.householdMembers.findFirst({
          where: eq(householdMembers.id, memberId),
          with: {
            household: true,
          },
        });
        // Verify the member belongs to the current user's household
        if (member && member.household?.ownerId === ctx.user.id) {
          memberProfile = {
            name: member.name,
            dateOfBirth: member.dateOfBirth,
            sex: member.sex,
          };
        }
      }

      // If no household member, get primary user profile
      if (!memberProfile) {
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.id, ctx.user.id),
        });
        if (user) {
          memberProfile = {
            name: user.name || "User",
            dateOfBirth: user.dateOfBirth,
            sex: user.sex,
          };
          memberId = undefined; // Use primary user's tests
        }
      }

      if (!memberProfile) {
        throw new Error("User profile not found");
      }

      // Calculate age
      const age = memberProfile.dateOfBirth
        ? differenceInYears(new Date(), new Date(memberProfile.dateOfBirth))
        : null;

      // Get reference range for this biomarker
      const referenceRange = await ctx.db.query.referenceRanges.findFirst({
        where: and(
          eq(referenceRanges.biomarkerId, input.biomarkerId),
          age !== null ? lte(referenceRanges.minAge, age) : undefined,
          age !== null ? gte(referenceRanges.maxAge, age) : undefined,
          memberProfile.sex
            ? or(
                eq(referenceRanges.sex, memberProfile.sex),
                isNull(referenceRanges.sex)
              )
            : isNull(referenceRanges.sex)
        ),
        orderBy: (referenceRanges, { desc }) => [desc(referenceRanges.sex)],
      });

      // Get historical values for this biomarker
      const historicalResults = await ctx.db
        .select({
          value: bloodTestResults.value,
          unit: bloodTestResults.unit,
          testDate: bloodTests.testDate,
        })
        .from(bloodTestResults)
        .innerJoin(bloodTests, eq(bloodTestResults.bloodTestId, bloodTests.id))
        .where(
          and(
            eq(bloodTestResults.biomarkerId, input.biomarkerId),
            eq(bloodTests.userId, ctx.user.id),
            memberId
              ? eq(bloodTests.householdMemberId, memberId)
              : isNull(bloodTests.householdMemberId)
          )
        )
        .orderBy(desc(bloodTests.testDate))
        .limit(10);

      // Get current medications (skip if table doesn't exist or query fails)
      let currentMedications: { name: string; dosage: string | null; frequency: string | null }[] = [];
      try {
        const today = format(new Date(), "yyyy-MM-dd");
        currentMedications = await ctx.db.query.medications.findMany({
          where: and(
            eq(medications.userId, ctx.user.id),
            eq(medications.isActive, true),
            or(isNull(medications.endDate), gte(medications.endDate, today))
          ),
        });
      } catch {
        // Medications table may not exist, skip
        currentMedications = [];
      }

      // Format historical data for prompt
      const historicalDataText =
        historicalResults.length > 0
          ? historicalResults
              .map(
                (r) =>
                  `- ${format(new Date(r.testDate), "MMM d, yyyy")}: ${r.value} ${r.unit}`
              )
              .join("\n")
          : "No historical data available";

      // Format medications for prompt
      const medicationsText =
        currentMedications.length > 0
          ? currentMedications
              .map(
                (m) =>
                  `- ${m.name}${m.dosage ? ` (${m.dosage})` : ""}${m.frequency ? `, ${m.frequency}` : ""}`
              )
              .join("\n")
          : "No current medications";

      // Get current value (most recent)
      const currentResult = historicalResults[0];

      // Build the prompt
      const prompt = `Analyze this biomarker result and provide a brief, informative summary.

Patient: ${age !== null ? `${age}-year-old` : "Adult"} ${memberProfile.sex || "person"}
Biomarker: ${biomarker.name}
Value: ${currentResult ? `${currentResult.value} ${currentResult.unit}` : "Not available"}
Reference: ${referenceRange ? `${referenceRange.minValue || "?"}-${referenceRange.maxValue || "?"} ${referenceRange.unit}` : "Standard range"}
${historicalResults.length > 1 ? `Trend: ${historicalResults.map(r => r.value).join(" → ")} (newest first)` : ""}
${currentMedications.length > 0 ? `Medications: ${currentMedications.map(m => m.name).join(", ")}` : ""}

Write 3-4 sentences of plain text (NO markdown, NO headers, NO bullet points, NO numbered lists). Include:
- Whether this value is normal, low, or high for this person
- What the trend suggests if multiple values exist
- One practical tip to maintain or improve this marker

Be direct and informative. Do not use phrases like "I'd recommend" or "Let me explain".`;

      // Generate insights using AI
      try {
        const { text } = await generateText({
          model: openai("gpt-4o-mini"),
          prompt,
          maxTokens: 200,
        });

        return {
          insights: text,
          biomarkerName: biomarker.name,
          currentValue: currentResult
            ? `${currentResult.value} ${currentResult.unit}`
            : null,
          historicalCount: historicalResults.length,
        };
      } catch (error) {
        throw new Error(
          `Failed to generate insights: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),
});
