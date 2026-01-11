import { z } from "zod";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  healthJournalEntries,
  weightEntries,
  sleepEntries,
  glucoseEntries,
  healthDataImports,
} from "../../db/schema";

// Input validation schemas
const dateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const createWeightSchema = z.object({
  entryDate: z.string(),
  weight: z.string(), // kg (canonical)
  bodyFatPercentage: z.string().optional(),
  waistCircumference: z.string().optional(), // cm (canonical)
  notes: z.string().optional(),
});

const createSleepSchema = z.object({
  entryDate: z.string(),
  durationMinutes: z.number().min(0).max(1440), // 0-24 hours
  quality: z.number().min(1).max(5), // 1-5 scale
  notes: z.string().optional(),
});

const createGlucoseSchema = z.object({
  entryDate: z.string(),
  value: z.string(), // mmol/L (canonical)
  readingType: z.enum(["fasting", "post_meal", "random"]),
  notes: z.string().optional(),
});

export const journalRouter = createTRPCRouter({
  // Get all journal entries with optional filtering
  getAll: protectedProcedure
    .input(
      z.object({
        type: z.enum(["weight", "sleep", "glucose"]).optional(),
        dateRange: dateRangeSchema.optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(healthJournalEntries.userId, ctx.user.id)];

      if (input.type) {
        conditions.push(eq(healthJournalEntries.entryType, input.type));
      }

      if (input.dateRange?.from) {
        conditions.push(gte(healthJournalEntries.entryDate, input.dateRange.from));
      }

      if (input.dateRange?.to) {
        conditions.push(lte(healthJournalEntries.entryDate, input.dateRange.to));
      }

      const entries = await ctx.db.query.healthJournalEntries.findMany({
        where: and(...conditions),
        orderBy: [desc(healthJournalEntries.entryDate), desc(healthJournalEntries.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          weightEntry: true,
          sleepEntry: true,
          glucoseEntry: true,
        },
      });

      return entries;
    }),

  // Get recent entries across all types (for activity feed)
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(5) }))
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db.query.healthJournalEntries.findMany({
        where: eq(healthJournalEntries.userId, ctx.user.id),
        orderBy: [desc(healthJournalEntries.entryDate), desc(healthJournalEntries.createdAt)],
        limit: input.limit,
        with: {
          weightEntry: true,
          sleepEntry: true,
          glucoseEntry: true,
        },
      });

      return entries;
    }),

  // Get latest entry for each type (for quick cards)
  getLatestByType: protectedProcedure.query(async ({ ctx }) => {
    const types = ["weight", "sleep", "glucose"] as const;
    const results: Record<string, typeof healthJournalEntries.$inferSelect & {
      weightEntry?: typeof weightEntries.$inferSelect | null;
      sleepEntry?: typeof sleepEntries.$inferSelect | null;
      glucoseEntry?: typeof glucoseEntries.$inferSelect | null;
    } | null> = {};

    for (const type of types) {
      const entry = await ctx.db.query.healthJournalEntries.findFirst({
        where: and(
          eq(healthJournalEntries.userId, ctx.user.id),
          eq(healthJournalEntries.entryType, type)
        ),
        orderBy: [desc(healthJournalEntries.entryDate), desc(healthJournalEntries.createdAt)],
        with: {
          weightEntry: true,
          sleepEntry: true,
          glucoseEntry: true,
        },
      });
      results[type] = entry ?? null;
    }

    return results;
  }),

  // Get weekly stats (for dashboard cards)
  getWeeklyStats: protectedProcedure.query(async ({ ctx }) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString().split("T")[0];

    // Get sleep entries for the week
    const sleepEntriesWeek = await ctx.db.query.healthJournalEntries.findMany({
      where: and(
        eq(healthJournalEntries.userId, ctx.user.id),
        eq(healthJournalEntries.entryType, "sleep"),
        gte(healthJournalEntries.entryDate, oneWeekAgoStr)
      ),
      with: {
        sleepEntry: true,
      },
    });

    // Calculate average sleep
    const sleepDurations = sleepEntriesWeek
      .filter((e) => e.sleepEntry)
      .map((e) => e.sleepEntry!.durationMinutes);
    const avgSleepMinutes = sleepDurations.length > 0
      ? sleepDurations.reduce((a, b) => a + b, 0) / sleepDurations.length
      : null;

    // Get weight entries for trend
    const weightEntriesWeek = await ctx.db.query.healthJournalEntries.findMany({
      where: and(
        eq(healthJournalEntries.userId, ctx.user.id),
        eq(healthJournalEntries.entryType, "weight"),
        gte(healthJournalEntries.entryDate, oneWeekAgoStr)
      ),
      orderBy: [desc(healthJournalEntries.entryDate)],
      limit: 2,
      with: {
        weightEntry: true,
      },
    });

    // Calculate weight change
    let weightChange: number | null = null;
    if (weightEntriesWeek.length >= 2) {
      const latest = parseFloat(weightEntriesWeek[0].weightEntry?.weight ?? "0");
      const previous = parseFloat(weightEntriesWeek[1].weightEntry?.weight ?? "0");
      weightChange = latest - previous;
    }

    return {
      avgSleepMinutes,
      sleepEntryCount: sleepDurations.length,
      weightChange,
      weightEntryCount: weightEntriesWeek.length,
    };
  }),

  // Create weight entry
  createWeight: protectedProcedure
    .input(createWeightSchema)
    .mutation(async ({ ctx, input }) => {
      // Create journal entry
      const [journalEntry] = await ctx.db
        .insert(healthJournalEntries)
        .values({
          userId: ctx.user.id,
          entryType: "weight",
          entryDate: input.entryDate,
          notes: input.notes,
        })
        .returning();

      // Create weight-specific data
      await ctx.db.insert(weightEntries).values({
        journalEntryId: journalEntry.id,
        weight: input.weight,
        bodyFatPercentage: input.bodyFatPercentage,
        waistCircumference: input.waistCircumference,
      });

      return journalEntry;
    }),

  // Create sleep entry
  createSleep: protectedProcedure
    .input(createSleepSchema)
    .mutation(async ({ ctx, input }) => {
      // Create journal entry
      const [journalEntry] = await ctx.db
        .insert(healthJournalEntries)
        .values({
          userId: ctx.user.id,
          entryType: "sleep",
          entryDate: input.entryDate,
          notes: input.notes,
        })
        .returning();

      // Create sleep-specific data
      await ctx.db.insert(sleepEntries).values({
        journalEntryId: journalEntry.id,
        durationMinutes: input.durationMinutes,
        quality: input.quality,
      });

      return journalEntry;
    }),

  // Create glucose entry
  createGlucose: protectedProcedure
    .input(createGlucoseSchema)
    .mutation(async ({ ctx, input }) => {
      // Create journal entry
      const [journalEntry] = await ctx.db
        .insert(healthJournalEntries)
        .values({
          userId: ctx.user.id,
          entryType: "glucose",
          entryDate: input.entryDate,
          notes: input.notes,
        })
        .returning();

      // Create glucose-specific data
      await ctx.db.insert(glucoseEntries).values({
        journalEntryId: journalEntry.id,
        value: input.value,
        readingType: input.readingType,
      });

      return journalEntry;
    }),

  // Update entry
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        entryDate: z.string().optional(),
        notes: z.string().optional(),
        // Weight fields
        weight: z.string().optional(),
        bodyFatPercentage: z.string().optional(),
        waistCircumference: z.string().optional(),
        // Sleep fields
        durationMinutes: z.number().optional(),
        quality: z.number().min(1).max(5).optional(),
        // Glucose fields
        value: z.string().optional(),
        readingType: z.enum(["fasting", "post_meal", "random"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const entry = await ctx.db.query.healthJournalEntries.findFirst({
        where: and(
          eq(healthJournalEntries.id, input.id),
          eq(healthJournalEntries.userId, ctx.user.id)
        ),
        with: {
          weightEntry: true,
          sleepEntry: true,
          glucoseEntry: true,
        },
      });

      if (!entry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Journal entry not found",
        });
      }

      // Update base entry
      if (input.entryDate || input.notes !== undefined) {
        await ctx.db
          .update(healthJournalEntries)
          .set({
            ...(input.entryDate && { entryDate: input.entryDate }),
            ...(input.notes !== undefined && { notes: input.notes }),
            updatedAt: new Date(),
          })
          .where(eq(healthJournalEntries.id, input.id));
      }

      // Update type-specific data
      if (entry.entryType === "weight" && entry.weightEntry) {
        const updates: Record<string, string | undefined> = {};
        if (input.weight !== undefined) updates.weight = input.weight;
        if (input.bodyFatPercentage !== undefined) updates.bodyFatPercentage = input.bodyFatPercentage;
        if (input.waistCircumference !== undefined) updates.waistCircumference = input.waistCircumference;

        if (Object.keys(updates).length > 0) {
          await ctx.db
            .update(weightEntries)
            .set(updates)
            .where(eq(weightEntries.journalEntryId, input.id));
        }
      }

      if (entry.entryType === "sleep" && entry.sleepEntry) {
        const updates: Record<string, number | undefined> = {};
        if (input.durationMinutes !== undefined) updates.durationMinutes = input.durationMinutes;
        if (input.quality !== undefined) updates.quality = input.quality;

        if (Object.keys(updates).length > 0) {
          await ctx.db
            .update(sleepEntries)
            .set(updates)
            .where(eq(sleepEntries.journalEntryId, input.id));
        }
      }

      if (entry.entryType === "glucose" && entry.glucoseEntry) {
        const updates: Record<string, string | undefined> = {};
        if (input.value !== undefined) updates.value = input.value;
        if (input.readingType !== undefined) updates.readingType = input.readingType;

        if (Object.keys(updates).length > 0) {
          await ctx.db
            .update(glucoseEntries)
            .set(updates)
            .where(eq(glucoseEntries.journalEntryId, input.id));
        }
      }

      return { success: true };
    }),

  // Delete entry
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const entry = await ctx.db.query.healthJournalEntries.findFirst({
        where: and(
          eq(healthJournalEntries.id, input.id),
          eq(healthJournalEntries.userId, ctx.user.id)
        ),
      });

      if (!entry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Journal entry not found",
        });
      }

      // Delete entry (type-specific data cascades)
      await ctx.db
        .delete(healthJournalEntries)
        .where(eq(healthJournalEntries.id, input.id));

      return { success: true };
    }),

  // Get import progress for a specific health data import
  getImportProgress: protectedProcedure
    .input(z.object({ importId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const importRecord = await ctx.db.query.healthDataImports.findFirst({
        where: and(
          eq(healthDataImports.id, input.importId),
          eq(healthDataImports.userId, ctx.user.id)
        ),
      });

      if (!importRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Import not found",
        });
      }

      return {
        id: importRecord.id,
        status: importRecord.status,
        progress: importRecord.progress,
        error: importRecord.processingError,
        originalFileName: importRecord.originalFileName,
        fileSizeBytes: importRecord.fileSizeBytes,
        startedAt: importRecord.startedAt,
        completedAt: importRecord.completedAt,
        createdAt: importRecord.createdAt,
      };
    }),

  // Get all health data imports for the user
  getImports: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const imports = await ctx.db.query.healthDataImports.findMany({
        where: eq(healthDataImports.userId, ctx.user.id),
        orderBy: [desc(healthDataImports.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      return imports.map((imp) => ({
        id: imp.id,
        status: imp.status,
        progress: imp.progress,
        error: imp.processingError,
        originalFileName: imp.originalFileName,
        fileSizeBytes: imp.fileSizeBytes,
        importFromDate: imp.importFromDate,
        importToDate: imp.importToDate,
        startedAt: imp.startedAt,
        completedAt: imp.completedAt,
        createdAt: imp.createdAt,
      }));
    }),
});
