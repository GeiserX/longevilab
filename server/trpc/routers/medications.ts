import { z } from "zod";
import { eq, and, desc, isNull, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { medications, supplements } from "../../db/schema";

// Input validation schemas
const createMedicationSchema = z.object({
  name: z.string().min(1).max(255),
  dosage: z.string().max(100).optional(),
  frequency: z.enum(["daily", "twice_daily", "weekly", "as_needed", "other"]).optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

const createSupplementSchema = z.object({
  name: z.string().min(1).max(255),
  dosage: z.string().max(100).optional(),
  frequency: z.enum(["daily", "twice_daily", "weekly", "as_needed", "other"]).optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  dosage: z.string().max(100).optional(),
  frequency: z.enum(["daily", "twice_daily", "weekly", "as_needed", "other"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const medicationsRouter = createTRPCRouter({
  // Get all medications
  getAllMedications: protectedProcedure
    .input(
      z.object({
        activeOnly: z.boolean().default(false),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(medications.userId, ctx.user.id)];

      if (input.activeOnly) {
        conditions.push(eq(medications.isActive, true));
      }

      return ctx.db.query.medications.findMany({
        where: and(...conditions),
        orderBy: [desc(medications.isActive), desc(medications.startDate)],
        limit: input.limit,
        offset: input.offset,
      });
    }),

  // Get all supplements
  getAllSupplements: protectedProcedure
    .input(
      z.object({
        activeOnly: z.boolean().default(false),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(supplements.userId, ctx.user.id)];

      if (input.activeOnly) {
        conditions.push(eq(supplements.isActive, true));
      }

      return ctx.db.query.supplements.findMany({
        where: and(...conditions),
        orderBy: [desc(supplements.isActive), desc(supplements.startDate)],
        limit: input.limit,
        offset: input.offset,
      });
    }),

  // Get active counts (for dashboard card)
  getActiveCounts: protectedProcedure.query(async ({ ctx }) => {
    const activeMeds = await ctx.db.query.medications.findMany({
      where: and(
        eq(medications.userId, ctx.user.id),
        eq(medications.isActive, true)
      ),
      columns: { id: true },
    });

    const activeSupps = await ctx.db.query.supplements.findMany({
      where: and(
        eq(supplements.userId, ctx.user.id),
        eq(supplements.isActive, true)
      ),
      columns: { id: true },
    });

    return {
      medications: activeMeds.length,
      supplements: activeSupps.length,
      total: activeMeds.length + activeSupps.length,
    };
  }),

  // Create medication
  createMedication: protectedProcedure
    .input(createMedicationSchema)
    .mutation(async ({ ctx, input }) => {
      const [medication] = await ctx.db
        .insert(medications)
        .values({
          userId: ctx.user.id,
          name: input.name,
          dosage: input.dosage,
          frequency: input.frequency,
          startDate: input.startDate,
          endDate: input.endDate,
          notes: input.notes,
          isActive: true,
        })
        .returning();

      return medication;
    }),

  // Create supplement
  createSupplement: protectedProcedure
    .input(createSupplementSchema)
    .mutation(async ({ ctx, input }) => {
      const [supplement] = await ctx.db
        .insert(supplements)
        .values({
          userId: ctx.user.id,
          name: input.name,
          dosage: input.dosage,
          frequency: input.frequency,
          startDate: input.startDate,
          endDate: input.endDate,
          notes: input.notes,
          isActive: true,
        })
        .returning();

      return supplement;
    }),

  // Update medication
  updateMedication: protectedProcedure
    .input(updateSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.query.medications.findFirst({
        where: and(
          eq(medications.id, input.id),
          eq(medications.userId, ctx.user.id)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Medication not found",
        });
      }

      const { id, ...updates } = input;
      const [updated] = await ctx.db
        .update(medications)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(medications.id, id))
        .returning();

      return updated;
    }),

  // Update supplement
  updateSupplement: protectedProcedure
    .input(updateSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.query.supplements.findFirst({
        where: and(
          eq(supplements.id, input.id),
          eq(supplements.userId, ctx.user.id)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Supplement not found",
        });
      }

      const { id, ...updates } = input;
      const [updated] = await ctx.db
        .update(supplements)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(supplements.id, id))
        .returning();

      return updated;
    }),

  // Toggle medication active status
  toggleMedicationActive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership and get current status
      const existing = await ctx.db.query.medications.findFirst({
        where: and(
          eq(medications.id, input.id),
          eq(medications.userId, ctx.user.id)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Medication not found",
        });
      }

      const [updated] = await ctx.db
        .update(medications)
        .set({
          isActive: !existing.isActive,
          // If deactivating, set end date to today
          ...(existing.isActive && { endDate: new Date().toISOString().split("T")[0] }),
          updatedAt: new Date(),
        })
        .where(eq(medications.id, input.id))
        .returning();

      return updated;
    }),

  // Toggle supplement active status
  toggleSupplementActive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership and get current status
      const existing = await ctx.db.query.supplements.findFirst({
        where: and(
          eq(supplements.id, input.id),
          eq(supplements.userId, ctx.user.id)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Supplement not found",
        });
      }

      const [updated] = await ctx.db
        .update(supplements)
        .set({
          isActive: !existing.isActive,
          // If deactivating, set end date to today
          ...(existing.isActive && { endDate: new Date().toISOString().split("T")[0] }),
          updatedAt: new Date(),
        })
        .where(eq(supplements.id, input.id))
        .returning();

      return updated;
    }),

  // Delete medication
  deleteMedication: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.query.medications.findFirst({
        where: and(
          eq(medications.id, input.id),
          eq(medications.userId, ctx.user.id)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Medication not found",
        });
      }

      await ctx.db.delete(medications).where(eq(medications.id, input.id));

      return { success: true };
    }),

  // Delete supplement
  deleteSupplement: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.query.supplements.findFirst({
        where: and(
          eq(supplements.id, input.id),
          eq(supplements.userId, ctx.user.id)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Supplement not found",
        });
      }

      await ctx.db.delete(supplements).where(eq(supplements.id, input.id));

      return { success: true };
    }),
});
