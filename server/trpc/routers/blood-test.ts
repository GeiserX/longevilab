import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { bloodTests, bloodTestResults, biomarkers } from "../../db/schema";
import { queueOcrJob, JOB_PRIORITY } from "../../jobs/queue";
import { storage } from "../../services/storage";

export const bloodTestRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z
        .object({
          householdMemberId: z.string().uuid().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(bloodTests.userId, ctx.user.id)];

      if (input?.householdMemberId) {
        conditions.push(eq(bloodTests.householdMemberId, input.householdMemberId));
      }

      return ctx.db.query.bloodTests.findMany({
        where: and(...conditions),
        orderBy: [desc(bloodTests.testDate)],
        with: {
          householdMember: true,
        },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const bloodTest = await ctx.db.query.bloodTests.findFirst({
        where: and(
          eq(bloodTests.id, input.id),
          eq(bloodTests.userId, ctx.user.id)
        ),
        with: {
          results: {
            with: {
              biomarker: true,
            },
          },
        },
      });

      if (!bloodTest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Blood test not found",
        });
      }

      return bloodTest;
    }),

  getLatest: protectedProcedure
    .input(
      z
        .object({
          householdMemberId: z.string().uuid().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(bloodTests.userId, ctx.user.id),
        eq(bloodTests.status, "completed"),
      ];

      if (input?.householdMemberId) {
        conditions.push(eq(bloodTests.householdMemberId, input.householdMemberId));
      }

      const bloodTest = await ctx.db.query.bloodTests.findFirst({
        where: and(...conditions),
        orderBy: [desc(bloodTests.testDate)],
        with: {
          results: {
            with: {
              biomarker: true,
            },
          },
          householdMember: true,
        },
      });
      return bloodTest ?? null;
    }),

  getRecentComparison: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(10).default(5),
        householdMemberId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(bloodTests.userId, ctx.user.id),
        eq(bloodTests.status, "completed"),
      ];

      if (input.householdMemberId) {
        conditions.push(eq(bloodTests.householdMemberId, input.householdMemberId));
      }

      const tests = await ctx.db.query.bloodTests.findMany({
        where: and(...conditions),
        orderBy: [desc(bloodTests.testDate)],
        limit: input.limit,
        with: {
          results: {
            with: {
              biomarker: true,
            },
          },
          householdMember: true,
        },
      });
      return tests;
    }),

  getStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const bloodTest = await ctx.db.query.bloodTests.findFirst({
        where: and(
          eq(bloodTests.id, input.id),
          eq(bloodTests.userId, ctx.user.id)
        ),
        columns: {
          id: true,
          status: true,
          processingError: true,
        },
      });

      if (!bloodTest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Blood test not found",
        });
      }

      return bloodTest;
    }),

  getReview: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const bloodTest = await ctx.db.query.bloodTests.findFirst({
        where: and(
          eq(bloodTests.id, input.id),
          eq(bloodTests.userId, ctx.user.id)
        ),
        with: {
          results: {
            with: {
              biomarker: true,
            },
          },
        },
      });

      if (!bloodTest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Blood test not found",
        });
      }

      // Get all biomarkers for adding missing ones
      const allBiomarkers = await ctx.db.query.biomarkers.findMany({
        orderBy: (biomarkers, { asc }) => [
          asc(biomarkers.category),
          asc(biomarkers.name),
        ],
      });

      return {
        bloodTest,
        allBiomarkers,
      };
    }),

  confirmResults: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        testDate: z.string(),
        labName: z.string().optional(),
        results: z.array(
          z.object({
            id: z.string().uuid().optional(),
            biomarkerId: z.string().uuid(),
            value: z.string(),
            unit: z.string(),
            originalValue: z.string().optional(),
            originalUnit: z.string().optional(),
            isOutOfRange: z.boolean().default(false),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const bloodTest = await ctx.db.query.bloodTests.findFirst({
        where: and(
          eq(bloodTests.id, input.id),
          eq(bloodTests.userId, ctx.user.id)
        ),
      });

      if (!bloodTest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Blood test not found",
        });
      }

      // Delete existing results
      await ctx.db
        .delete(bloodTestResults)
        .where(eq(bloodTestResults.bloodTestId, input.id));

      // Insert new results
      if (input.results.length > 0) {
        await ctx.db.insert(bloodTestResults).values(
          input.results.map((result) => ({
            bloodTestId: input.id,
            biomarkerId: result.biomarkerId,
            value: result.value,
            unit: result.unit,
            originalValue: result.originalValue,
            originalUnit: result.originalUnit,
            isOutOfRange: result.isOutOfRange,
          }))
        );
      }

      // Update blood test
      const [updatedTest] = await ctx.db
        .update(bloodTests)
        .set({
          testDate: input.testDate,
          labName: input.labName,
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(bloodTests.id, input.id))
        .returning();

      return updatedTest;
    }),

  updateResults: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        testDate: z.string().optional(),
        labName: z.string().optional(),
        results: z.array(
          z.object({
            id: z.string().uuid(),
            value: z.string(),
            unit: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const bloodTest = await ctx.db.query.bloodTests.findFirst({
        where: and(
          eq(bloodTests.id, input.id),
          eq(bloodTests.userId, ctx.user.id)
        ),
      });

      if (!bloodTest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Blood test not found",
        });
      }

      // Update each result
      for (const result of input.results) {
        await ctx.db
          .update(bloodTestResults)
          .set({
            value: result.value,
            unit: result.unit,
          })
          .where(
            and(
              eq(bloodTestResults.id, result.id),
              eq(bloodTestResults.bloodTestId, input.id)
            )
          );
      }

      // Update blood test metadata if provided
      if (input.testDate || input.labName) {
        await ctx.db
          .update(bloodTests)
          .set({
            ...(input.testDate && { testDate: input.testDate }),
            ...(input.labName && { labName: input.labName }),
            updatedAt: new Date(),
          })
          .where(eq(bloodTests.id, input.id));
      }

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const bloodTest = await ctx.db.query.bloodTests.findFirst({
        where: and(
          eq(bloodTests.id, input.id),
          eq(bloodTests.userId, ctx.user.id)
        ),
      });

      if (!bloodTest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Blood test not found",
        });
      }

      // Delete the physical file if it exists
      if (bloodTest.originalFilePath) {
        await storage.delete(bloodTest.originalFilePath);
      }

      // Delete the blood test (results cascade)
      await ctx.db.delete(bloodTests).where(eq(bloodTests.id, input.id));

      return { success: true };
    }),

  retryProcessing: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership and get blood test
      const bloodTest = await ctx.db.query.bloodTests.findFirst({
        where: and(
          eq(bloodTests.id, input.id),
          eq(bloodTests.userId, ctx.user.id)
        ),
      });

      if (!bloodTest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Blood test not found",
        });
      }

      // Only allow retry for failed status
      if (bloodTest.status !== "failed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot retry blood test with status "${bloodTest.status}". Only failed tests can be retried.`,
        });
      }

      // Reset status and clear error
      await ctx.db
        .update(bloodTests)
        .set({
          status: "pending",
          processingError: null,
          ocrText: null, // Clear any partial OCR text
          updatedAt: new Date(),
        })
        .where(eq(bloodTests.id, input.id));

      // Delete any existing partial results
      await ctx.db
        .delete(bloodTestResults)
        .where(eq(bloodTestResults.bloodTestId, input.id));

      // Queue new OCR job with high priority
      await queueOcrJob(
        {
          bloodTestId: input.id,
          filePath: bloodTest.originalFilePath,
        },
        JOB_PRIORITY.HIGH
      );

      return { success: true, message: "Processing retry started" };
    }),
});
