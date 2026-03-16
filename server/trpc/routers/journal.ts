import { z } from "zod";
import { eq, and, desc, gte, lte, sql, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  healthJournalEntries,
  weightEntries,
  sleepEntries,
  glucoseEntries,
  heartRateEntries,
  activityEntries,
  bloodPressureEntries,
  bloodOxygenEntries,
  vo2MaxEntries,
  healthDataImports,
  hourlyHeartRateEntries,
} from "../../db/schema";

// All entry types
const ALL_ENTRY_TYPES = [
  "weight",
  "sleep",
  "glucose",
  "heart_rate",
  "activity",
  "blood_pressure",
  "blood_oxygen",
  "vo2_max",
] as const;

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
        type: z.enum(ALL_ENTRY_TYPES).optional(),
        dateRange: dateRangeSchema.optional(),
        householdMemberId: z.string().uuid().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(healthJournalEntries.userId, ctx.user.id)];

      // Filter by household member
      if (input.householdMemberId) {
        conditions.push(eq(healthJournalEntries.householdMemberId, input.householdMemberId));
      } else {
        conditions.push(isNull(healthJournalEntries.householdMemberId));
      }

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
          heartRateEntry: true,
          activityEntry: true,
          bloodPressureEntry: true,
          bloodOxygenEntry: true,
          vo2MaxEntry: true,
        },
      });

      return entries;
    }),

  // Get recent entries across all types (for activity feed)
  getRecent: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(20).default(5),
      householdMemberId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const memberFilter = input.householdMemberId
        ? eq(healthJournalEntries.householdMemberId, input.householdMemberId)
        : isNull(healthJournalEntries.householdMemberId);

      const entries = await ctx.db.query.healthJournalEntries.findMany({
        where: and(
          eq(healthJournalEntries.userId, ctx.user.id),
          memberFilter
        ),
        orderBy: [desc(healthJournalEntries.entryDate), desc(healthJournalEntries.createdAt)],
        limit: input.limit,
        with: {
          weightEntry: true,
          sleepEntry: true,
          glucoseEntry: true,
          heartRateEntry: true,
          activityEntry: true,
          bloodPressureEntry: true,
          bloodOxygenEntry: true,
          vo2MaxEntry: true,
        },
      });

      return entries;
    }),

  // Get latest entry for each type (for quick cards)
  getLatestByType: protectedProcedure
    .input(z.object({ householdMemberId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
    const memberFilter = input?.householdMemberId
      ? eq(healthJournalEntries.householdMemberId, input.householdMemberId)
      : isNull(healthJournalEntries.householdMemberId);

    const results: Record<string, typeof healthJournalEntries.$inferSelect & {
      weightEntry?: typeof weightEntries.$inferSelect | null;
      sleepEntry?: typeof sleepEntries.$inferSelect | null;
      glucoseEntry?: typeof glucoseEntries.$inferSelect | null;
      heartRateEntry?: typeof heartRateEntries.$inferSelect | null;
      activityEntry?: typeof activityEntries.$inferSelect | null;
      bloodPressureEntry?: typeof bloodPressureEntries.$inferSelect | null;
      bloodOxygenEntry?: typeof bloodOxygenEntries.$inferSelect | null;
      vo2MaxEntry?: typeof vo2MaxEntries.$inferSelect | null;
    } | null> = {};

    for (const type of ALL_ENTRY_TYPES) {
      const entry = await ctx.db.query.healthJournalEntries.findFirst({
        where: and(
          eq(healthJournalEntries.userId, ctx.user.id),
          eq(healthJournalEntries.entryType, type),
          memberFilter
        ),
        orderBy: [desc(healthJournalEntries.entryDate), desc(healthJournalEntries.createdAt)],
        with: {
          weightEntry: true,
          sleepEntry: true,
          glucoseEntry: true,
          heartRateEntry: true,
          activityEntry: true,
          bloodPressureEntry: true,
          bloodOxygenEntry: true,
          vo2MaxEntry: true,
        },
      });
      results[type] = entry ?? null;
    }

    return results;
  }),

  // Get weekly stats (for dashboard cards)
  getWeeklyStats: protectedProcedure
    .input(z.object({ householdMemberId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString().split("T")[0];

    const memberFilter = input?.householdMemberId
      ? eq(healthJournalEntries.householdMemberId, input.householdMemberId)
      : isNull(healthJournalEntries.householdMemberId);

    // Get sleep entries for the week
    const sleepEntriesWeek = await ctx.db.query.healthJournalEntries.findMany({
      where: and(
        eq(healthJournalEntries.userId, ctx.user.id),
        eq(healthJournalEntries.entryType, "sleep"),
        gte(healthJournalEntries.entryDate, oneWeekAgoStr),
        memberFilter
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
        gte(healthJournalEntries.entryDate, oneWeekAgoStr),
        memberFilter
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

    // Get activity entries for the week (for average steps)
    const activityEntriesWeek = await ctx.db.query.healthJournalEntries.findMany({
      where: and(
        eq(healthJournalEntries.userId, ctx.user.id),
        eq(healthJournalEntries.entryType, "activity"),
        gte(healthJournalEntries.entryDate, oneWeekAgoStr),
        memberFilter
      ),
      with: {
        activityEntry: true,
      },
    });

    // Calculate average steps
    const stepCounts = activityEntriesWeek
      .filter((e) => e.activityEntry?.steps)
      .map((e) => e.activityEntry!.steps!);
    const avgSteps = stepCounts.length > 0
      ? Math.round(stepCounts.reduce((a, b) => a + b, 0) / stepCounts.length)
      : null;

    // Get heart rate entries for the week
    const heartRateEntriesWeek = await ctx.db.query.healthJournalEntries.findMany({
      where: and(
        eq(healthJournalEntries.userId, ctx.user.id),
        eq(healthJournalEntries.entryType, "heart_rate"),
        gte(healthJournalEntries.entryDate, oneWeekAgoStr),
        memberFilter
      ),
      with: {
        heartRateEntry: true,
      },
    });

    // Calculate average resting heart rate
    const restingHRValues = heartRateEntriesWeek
      .filter((e) => e.heartRateEntry?.restingHeartRate)
      .map((e) => e.heartRateEntry!.restingHeartRate!);
    const avgRestingHR = restingHRValues.length > 0
      ? Math.round(restingHRValues.reduce((a, b) => a + b, 0) / restingHRValues.length)
      : null;

    return {
      avgSleepMinutes,
      sleepEntryCount: sleepDurations.length,
      weightChange,
      weightEntryCount: weightEntriesWeek.length,
      avgSteps,
      activityEntryCount: stepCounts.length,
      avgRestingHR,
      heartRateEntryCount: restingHRValues.length,
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
        // Heart rate fields
        restingHeartRate: z.number().min(30).max(220).optional(),
        heartRateVariability: z.string().optional(),
        walkingHeartRate: z.number().min(30).max(220).optional(),
        // Activity fields
        steps: z.number().min(0).optional(),
        distance: z.string().optional(),
        activeCalories: z.number().min(0).optional(),
        exerciseMinutes: z.number().min(0).optional(),
        standHours: z.number().min(0).max(24).optional(),
        flightsClimbed: z.number().min(0).optional(),
        // Blood pressure fields
        systolic: z.number().min(50).max(250).optional(),
        diastolic: z.number().min(30).max(150).optional(),
        pulse: z.number().min(30).max(220).optional(),
        // Blood oxygen fields
        percentage: z.string().optional(),
        // VO2 Max fields
        vo2MaxValue: z.string().optional(),
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
          heartRateEntry: true,
          activityEntry: true,
          bloodPressureEntry: true,
          bloodOxygenEntry: true,
          vo2MaxEntry: true,
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

      if (entry.entryType === "heart_rate" && entry.heartRateEntry) {
        const updates: Record<string, number | string | undefined> = {};
        if (input.restingHeartRate !== undefined) updates.restingHeartRate = input.restingHeartRate;
        if (input.heartRateVariability !== undefined) updates.heartRateVariability = input.heartRateVariability;
        if (input.walkingHeartRate !== undefined) updates.walkingHeartRate = input.walkingHeartRate;

        if (Object.keys(updates).length > 0) {
          await ctx.db
            .update(heartRateEntries)
            .set(updates)
            .where(eq(heartRateEntries.journalEntryId, input.id));
        }
      }

      if (entry.entryType === "activity" && entry.activityEntry) {
        const updates: Record<string, number | string | undefined> = {};
        if (input.steps !== undefined) updates.steps = input.steps;
        if (input.distance !== undefined) updates.distance = input.distance;
        if (input.activeCalories !== undefined) updates.activeCalories = input.activeCalories;
        if (input.exerciseMinutes !== undefined) updates.exerciseMinutes = input.exerciseMinutes;
        if (input.standHours !== undefined) updates.standHours = input.standHours;
        if (input.flightsClimbed !== undefined) updates.flightsClimbed = input.flightsClimbed;

        if (Object.keys(updates).length > 0) {
          await ctx.db
            .update(activityEntries)
            .set(updates)
            .where(eq(activityEntries.journalEntryId, input.id));
        }
      }

      if (entry.entryType === "blood_pressure" && entry.bloodPressureEntry) {
        const updates: Record<string, number | undefined> = {};
        if (input.systolic !== undefined) updates.systolic = input.systolic;
        if (input.diastolic !== undefined) updates.diastolic = input.diastolic;
        if (input.pulse !== undefined) updates.pulse = input.pulse;

        if (Object.keys(updates).length > 0) {
          await ctx.db
            .update(bloodPressureEntries)
            .set(updates)
            .where(eq(bloodPressureEntries.journalEntryId, input.id));
        }
      }

      if (entry.entryType === "blood_oxygen" && entry.bloodOxygenEntry) {
        if (input.percentage !== undefined) {
          await ctx.db
            .update(bloodOxygenEntries)
            .set({ percentage: input.percentage })
            .where(eq(bloodOxygenEntries.journalEntryId, input.id));
        }
      }

      if (entry.entryType === "vo2_max" && entry.vo2MaxEntry) {
        if (input.vo2MaxValue !== undefined) {
          await ctx.db
            .update(vo2MaxEntries)
            .set({ value: input.vo2MaxValue })
            .where(eq(vo2MaxEntries.journalEntryId, input.id));
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
        householdMemberId: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).default(10),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const memberFilter = input.householdMemberId
        ? eq(healthDataImports.householdMemberId, input.householdMemberId)
        : isNull(healthDataImports.householdMemberId);

      const imports = await ctx.db.query.healthDataImports.findMany({
        where: and(
          eq(healthDataImports.userId, ctx.user.id),
          memberFilter
        ),
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

  // ===================
  // CHART DATA ENDPOINTS
  // ===================

  // Get sleep stages data for charts (aggregated by timeframe)
  getSleepStagesData: protectedProcedure
    .input(
      z.object({
        timeframe: z.enum(["week", "month", "year"]),
        householdMemberId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Calculate date range based on timeframe
      const now = new Date();
      const fromDate = new Date();

      if (input.timeframe === "week") {
        fromDate.setDate(now.getDate() - 7);
      } else if (input.timeframe === "month") {
        fromDate.setDate(now.getDate() - 30);
      } else {
        fromDate.setFullYear(now.getFullYear() - 1);
      }

      const fromDateStr = fromDate.toISOString().split("T")[0];
      const toDateStr = now.toISOString().split("T")[0];

      const memberFilter = input.householdMemberId
        ? eq(healthJournalEntries.householdMemberId, input.householdMemberId)
        : isNull(healthJournalEntries.householdMemberId);

      // Get sleep entries with stage data
      const entries = await ctx.db.query.healthJournalEntries.findMany({
        where: and(
          eq(healthJournalEntries.userId, ctx.user.id),
          eq(healthJournalEntries.entryType, "sleep"),
          gte(healthJournalEntries.entryDate, fromDateStr),
          lte(healthJournalEntries.entryDate, toDateStr),
          memberFilter
        ),
        orderBy: [desc(healthJournalEntries.entryDate)],
        with: {
          sleepEntry: true,
        },
      });

      // Format data for chart
      // For weekly view: show each day
      // For monthly view: aggregate by week
      // For yearly view: aggregate by month
      type SleepDataPoint = {
        date: string;
        label: string;
        deepMinutes: number;
        coreMinutes: number;
        remMinutes: number;
        awakeMinutes: number;
        totalSleepMinutes: number;
      };

      const dataPoints: SleepDataPoint[] = [];

      if (input.timeframe === "week") {
        // Daily data points
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });

          const dayEntry = entries.find((e) => e.entryDate === dateStr);
          const sleepData = dayEntry?.sleepEntry;

          dataPoints.push({
            date: dateStr,
            label: dayLabel,
            deepMinutes: sleepData?.deepMinutes ?? 0,
            coreMinutes: sleepData?.coreMinutes ?? 0,
            remMinutes: sleepData?.remMinutes ?? 0,
            awakeMinutes: sleepData?.awakeMinutes ?? 0,
            totalSleepMinutes: sleepData?.durationMinutes ?? 0,
          });
        }
      } else if (input.timeframe === "month") {
        // Weekly aggregates
        for (let week = 3; week >= 0; week--) {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - (week + 1) * 7);
          const weekEnd = new Date();
          weekEnd.setDate(weekEnd.getDate() - week * 7);

          const weekStartStr = weekStart.toISOString().split("T")[0];
          const weekEndStr = weekEnd.toISOString().split("T")[0];

          const weekEntries = entries.filter(
            (e) => e.entryDate >= weekStartStr && e.entryDate < weekEndStr
          );

          const avgDeep = weekEntries.length > 0
            ? weekEntries.reduce((sum, e) => sum + (e.sleepEntry?.deepMinutes ?? 0), 0) / weekEntries.length
            : 0;
          const avgCore = weekEntries.length > 0
            ? weekEntries.reduce((sum, e) => sum + (e.sleepEntry?.coreMinutes ?? 0), 0) / weekEntries.length
            : 0;
          const avgRem = weekEntries.length > 0
            ? weekEntries.reduce((sum, e) => sum + (e.sleepEntry?.remMinutes ?? 0), 0) / weekEntries.length
            : 0;
          const avgAwake = weekEntries.length > 0
            ? weekEntries.reduce((sum, e) => sum + (e.sleepEntry?.awakeMinutes ?? 0), 0) / weekEntries.length
            : 0;
          const avgTotal = weekEntries.length > 0
            ? weekEntries.reduce((sum, e) => sum + (e.sleepEntry?.durationMinutes ?? 0), 0) / weekEntries.length
            : 0;

          dataPoints.push({
            date: weekStartStr,
            label: `Week ${4 - week}`,
            deepMinutes: Math.round(avgDeep),
            coreMinutes: Math.round(avgCore),
            remMinutes: Math.round(avgRem),
            awakeMinutes: Math.round(avgAwake),
            totalSleepMinutes: Math.round(avgTotal),
          });
        }
      } else {
        // Monthly aggregates for yearly view
        for (let month = 11; month >= 0; month--) {
          const monthDate = new Date();
          monthDate.setMonth(monthDate.getMonth() - month);
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
          const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

          const monthStartStr = monthStart.toISOString().split("T")[0];
          const monthEndStr = monthEnd.toISOString().split("T")[0];

          const monthEntries = entries.filter(
            (e) => e.entryDate >= monthStartStr && e.entryDate <= monthEndStr
          );

          const avgDeep = monthEntries.length > 0
            ? monthEntries.reduce((sum, e) => sum + (e.sleepEntry?.deepMinutes ?? 0), 0) / monthEntries.length
            : 0;
          const avgCore = monthEntries.length > 0
            ? monthEntries.reduce((sum, e) => sum + (e.sleepEntry?.coreMinutes ?? 0), 0) / monthEntries.length
            : 0;
          const avgRem = monthEntries.length > 0
            ? monthEntries.reduce((sum, e) => sum + (e.sleepEntry?.remMinutes ?? 0), 0) / monthEntries.length
            : 0;
          const avgAwake = monthEntries.length > 0
            ? monthEntries.reduce((sum, e) => sum + (e.sleepEntry?.awakeMinutes ?? 0), 0) / monthEntries.length
            : 0;
          const avgTotal = monthEntries.length > 0
            ? monthEntries.reduce((sum, e) => sum + (e.sleepEntry?.durationMinutes ?? 0), 0) / monthEntries.length
            : 0;

          dataPoints.push({
            date: monthStartStr,
            label: monthStart.toLocaleDateString("en-US", { month: "short" }),
            deepMinutes: Math.round(avgDeep),
            coreMinutes: Math.round(avgCore),
            remMinutes: Math.round(avgRem),
            awakeMinutes: Math.round(avgAwake),
            totalSleepMinutes: Math.round(avgTotal),
          });
        }
      }

      return dataPoints;
    }),

  // Get heart rate data for charts (daily or aggregated)
  getHeartRateData: protectedProcedure
    .input(
      z.object({
        viewMode: z.enum(["day", "week", "month"]),
        selectedDate: z.string().optional(), // For day view
        householdMemberId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const memberFilter = input.householdMemberId
        ? eq(hourlyHeartRateEntries.householdMemberId, input.householdMemberId)
        : isNull(hourlyHeartRateEntries.householdMemberId);

      type HeartRateDataPoint = {
        date: string;
        label: string;
        hour?: number;
        avgHeartRate: number | null;
        minHeartRate: number | null;
        maxHeartRate: number | null;
      };

      const dataPoints: HeartRateDataPoint[] = [];

      if (input.viewMode === "day") {
        // Hourly data for a specific day
        const targetDate = input.selectedDate || new Date().toISOString().split("T")[0];

        const hourlyData = await ctx.db.query.hourlyHeartRateEntries.findMany({
          where: and(
            eq(hourlyHeartRateEntries.userId, ctx.user.id),
            eq(hourlyHeartRateEntries.entryDate, targetDate),
            memberFilter
          ),
          orderBy: [hourlyHeartRateEntries.hour],
        });

        // Fill all 24 hours, use null for missing data to show gaps in charts
        for (let hour = 0; hour < 24; hour++) {
          const hourData = hourlyData.find((d) => d.hour === hour);
          dataPoints.push({
            date: targetDate,
            label: `${hour.toString().padStart(2, "0")}:00`,
            hour,
            avgHeartRate: hourData?.avgHeartRate && hourData.avgHeartRate > 0 ? hourData.avgHeartRate : null,
            minHeartRate: hourData?.minHeartRate && hourData.minHeartRate > 0 ? hourData.minHeartRate : null,
            maxHeartRate: hourData?.maxHeartRate && hourData.maxHeartRate > 0 ? hourData.maxHeartRate : null,
          });
        }
      } else {
        // Daily aggregates for week/month view
        const now = new Date();
        const fromDate = new Date();
        const days = input.viewMode === "week" ? 7 : 30;
        fromDate.setDate(now.getDate() - days);

        const fromDateStr = fromDate.toISOString().split("T")[0];

        // Get daily heart rate entries from journal
        const journalMemberFilter = input.householdMemberId
          ? eq(healthJournalEntries.householdMemberId, input.householdMemberId)
          : isNull(healthJournalEntries.householdMemberId);

        const entries = await ctx.db.query.healthJournalEntries.findMany({
          where: and(
            eq(healthJournalEntries.userId, ctx.user.id),
            eq(healthJournalEntries.entryType, "heart_rate"),
            gte(healthJournalEntries.entryDate, fromDateStr),
            journalMemberFilter
          ),
          orderBy: [healthJournalEntries.entryDate],
          with: {
            heartRateEntry: true,
          },
        });

        // Also get hourly data for min/max calculation
        const hourlyData = await ctx.db.query.hourlyHeartRateEntries.findMany({
          where: and(
            eq(hourlyHeartRateEntries.userId, ctx.user.id),
            gte(hourlyHeartRateEntries.entryDate, fromDateStr),
            memberFilter
          ),
        });

        // Group hourly data by date
        const hourlyByDate = new Map<string, typeof hourlyData>();
        for (const h of hourlyData) {
          const existing = hourlyByDate.get(h.entryDate) ?? [];
          existing.push(h);
          hourlyByDate.set(h.entryDate, existing);
        }

        for (let i = days - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          const label = input.viewMode === "week"
            ? date.toLocaleDateString("en-US", { weekday: "short" })
            : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

          const journalEntry = entries.find((e) => e.entryDate === dateStr);
          const dayHourlyData = hourlyByDate.get(dateStr) ?? [];

          // Calculate avgHR from journal entry (resting HR) or from hourly data
          let avgHR: number | null = null;
          if (journalEntry?.heartRateEntry?.restingHeartRate) {
            avgHR = journalEntry.heartRateEntry.restingHeartRate;
          } else if (dayHourlyData.length > 0) {
            // Calculate average from hourly avgHeartRate values
            const validHourlyAvgs = dayHourlyData
              .filter(d => d.avgHeartRate && d.avgHeartRate > 0)
              .map(d => d.avgHeartRate!);
            if (validHourlyAvgs.length > 0) {
              avgHR = Math.round(
                validHourlyAvgs.reduce((sum, v) => sum + v, 0) / validHourlyAvgs.length
              );
            }
          }

          // Calculate min/max from hourly data
          const validMinData = dayHourlyData.filter(d => d.minHeartRate && d.minHeartRate > 0);
          const validMaxData = dayHourlyData.filter(d => d.maxHeartRate && d.maxHeartRate > 0);
          const minHR = validMinData.length > 0
            ? Math.min(...validMinData.map(d => d.minHeartRate!))
            : null;
          const maxHR = validMaxData.length > 0
            ? Math.max(...validMaxData.map(d => d.maxHeartRate!))
            : null;

          dataPoints.push({
            date: dateStr,
            label,
            avgHeartRate: avgHR,
            minHeartRate: minHR,
            maxHeartRate: maxHR,
          });
        }
      }

      return dataPoints;
    }),

  // Get HRV data for charts
  getHRVData: protectedProcedure
    .input(
      z.object({
        timeframe: z.enum(["week", "month", "year"]),
        householdMemberId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const fromDate = new Date();

      if (input.timeframe === "week") {
        fromDate.setDate(now.getDate() - 7);
      } else if (input.timeframe === "month") {
        fromDate.setDate(now.getDate() - 30);
      } else {
        fromDate.setFullYear(now.getFullYear() - 1);
      }

      const fromDateStr = fromDate.toISOString().split("T")[0];

      const memberFilter = input.householdMemberId
        ? eq(healthJournalEntries.householdMemberId, input.householdMemberId)
        : isNull(healthJournalEntries.householdMemberId);

      const entries = await ctx.db.query.healthJournalEntries.findMany({
        where: and(
          eq(healthJournalEntries.userId, ctx.user.id),
          eq(healthJournalEntries.entryType, "heart_rate"),
          gte(healthJournalEntries.entryDate, fromDateStr),
          memberFilter
        ),
        orderBy: [healthJournalEntries.entryDate],
        with: {
          heartRateEntry: true,
        },
      });

      type HRVDataPoint = {
        date: string;
        label: string;
        hrv: number | null;
      };

      const dataPoints: HRVDataPoint[] = [];

      if (input.timeframe === "week") {
        // Daily data points
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });

          const dayEntry = entries.find((e) => e.entryDate === dateStr);
          const hrvValue = dayEntry?.heartRateEntry?.heartRateVariability
            ? Math.round(parseFloat(dayEntry.heartRateEntry.heartRateVariability))
            : null;

          dataPoints.push({
            date: dateStr,
            label: dayLabel,
            hrv: hrvValue,
          });
        }
      } else if (input.timeframe === "month") {
        // Daily data points for month
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          const dayLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

          const dayEntry = entries.find((e) => e.entryDate === dateStr);
          const hrvValue = dayEntry?.heartRateEntry?.heartRateVariability
            ? Math.round(parseFloat(dayEntry.heartRateEntry.heartRateVariability))
            : null;

          dataPoints.push({
            date: dateStr,
            label: i % 5 === 0 ? dayLabel : "", // Show label every 5 days
            hrv: hrvValue,
          });
        }
      } else {
        // Monthly averages for year
        for (let month = 11; month >= 0; month--) {
          const monthDate = new Date();
          monthDate.setMonth(monthDate.getMonth() - month);
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
          const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

          const monthStartStr = monthStart.toISOString().split("T")[0];
          const monthEndStr = monthEnd.toISOString().split("T")[0];

          const monthEntries = entries.filter(
            (e) => e.entryDate >= monthStartStr && e.entryDate <= monthEndStr
          );

          const hrvValues = monthEntries
            .filter((e) => e.heartRateEntry?.heartRateVariability)
            .map((e) => parseFloat(e.heartRateEntry!.heartRateVariability!));

          const avgHRV = hrvValues.length > 0
            ? Math.round(hrvValues.reduce((sum, v) => sum + v, 0) / hrvValues.length)
            : null;

          dataPoints.push({
            date: monthStartStr,
            label: monthStart.toLocaleDateString("en-US", { month: "short" }),
            hrv: avgHRV,
          });
        }
      }

      return dataPoints;
    }),

  // Clear Apple Health imported data for re-import (does NOT touch manual entries)
  clearAllHealthData: protectedProcedure
    .input(
      z.object({
        householdMemberId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only delete entries with source = "apple_health", never manual entries
      const baseCondition = eq(healthJournalEntries.userId, ctx.user.id);
      const memberCondition = input.householdMemberId
        ? eq(healthJournalEntries.householdMemberId, input.householdMemberId)
        : isNull(healthJournalEntries.householdMemberId);
      const sourceCondition = eq(healthJournalEntries.source, "apple_health");

      // Get journal entry IDs for Apple Health imports only
      const entries = await ctx.db.query.healthJournalEntries.findMany({
        where: and(baseCondition, memberCondition, sourceCondition),
        columns: { id: true },
      });

      const entryIds = entries.map((e) => e.id);

      if (entryIds.length === 0) {
        // Still clean up hourly HR and import records even if no journal entries
      } else {
        // Delete from specific entry tables first (foreign key constraints)
        await ctx.db.delete(weightEntries).where(sql`${weightEntries.journalEntryId} IN ${entryIds}`);
        await ctx.db.delete(sleepEntries).where(sql`${sleepEntries.journalEntryId} IN ${entryIds}`);
        await ctx.db.delete(glucoseEntries).where(sql`${glucoseEntries.journalEntryId} IN ${entryIds}`);
        await ctx.db.delete(heartRateEntries).where(sql`${heartRateEntries.journalEntryId} IN ${entryIds}`);
        await ctx.db.delete(activityEntries).where(sql`${activityEntries.journalEntryId} IN ${entryIds}`);
        await ctx.db.delete(bloodPressureEntries).where(sql`${bloodPressureEntries.journalEntryId} IN ${entryIds}`);
        await ctx.db.delete(bloodOxygenEntries).where(sql`${bloodOxygenEntries.journalEntryId} IN ${entryIds}`);
        await ctx.db.delete(vo2MaxEntries).where(sql`${vo2MaxEntries.journalEntryId} IN ${entryIds}`);

        // Delete from main journal entries table (Apple Health only)
        await ctx.db.delete(healthJournalEntries).where(and(baseCondition, memberCondition, sourceCondition));
      }

      // Delete from hourly heart rate table (always source=apple_health)
      const hourlyCondition = input.householdMemberId
        ? and(
            eq(hourlyHeartRateEntries.userId, ctx.user.id),
            eq(hourlyHeartRateEntries.householdMemberId, input.householdMemberId)
          )
        : and(
            eq(hourlyHeartRateEntries.userId, ctx.user.id),
            isNull(hourlyHeartRateEntries.householdMemberId)
          );
      await ctx.db.delete(hourlyHeartRateEntries).where(hourlyCondition);

      // Delete import records
      const importCondition = input.householdMemberId
        ? and(
            eq(healthDataImports.userId, ctx.user.id),
            eq(healthDataImports.householdMemberId, input.householdMemberId)
          )
        : and(
            eq(healthDataImports.userId, ctx.user.id),
            isNull(healthDataImports.householdMemberId)
          );
      await ctx.db.delete(healthDataImports).where(importCondition);

      return { deleted: entryIds.length };
    }),
});
