import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { households, householdMembers, users, bloodTests } from "../../db/schema";

// Input validation schemas
const createMemberSchema = z.object({
  name: z.string().min(1).max(255),
  dateOfBirth: z.string().optional(),
  sex: z.enum(["male", "female", "other"]).optional(),
  relationship: z.enum(["self", "spouse", "child", "parent", "sibling", "other"]).optional(),
});

const updateMemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  dateOfBirth: z.string().nullable().optional(),
  sex: z.enum(["male", "female", "other"]).nullable().optional(),
  relationship: z.enum(["self", "spouse", "child", "parent", "sibling", "other"]).nullable().optional(),
});

export const householdRouter = createTRPCRouter({
  // Get or create user's household with members
  getOrCreate: protectedProcedure.query(async ({ ctx }) => {
    // Check if user already has a household
    let household = await ctx.db.query.households.findFirst({
      where: eq(households.ownerId, ctx.user.id),
      with: {
        members: true,
      },
    });

    // If no household exists, create one with the user as primary member
    if (!household) {
      // Get user details to create primary member
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Create household
      const [newHousehold] = await ctx.db
        .insert(households)
        .values({
          name: `${user.name}'s Household`,
          ownerId: ctx.user.id,
        })
        .returning();

      // Create primary member (self)
      const [primaryMember] = await ctx.db.insert(householdMembers).values({
        householdId: newHousehold.id,
        name: user.name,
        dateOfBirth: user.dateOfBirth,
        sex: user.sex,
        relationship: "self",
        isPrimary: true,
      }).returning();

      // Link existing blood tests (without a household member) to the primary member
      await ctx.db
        .update(bloodTests)
        .set({ householdMemberId: primaryMember.id })
        .where(
          and(
            eq(bloodTests.userId, ctx.user.id),
            isNull(bloodTests.householdMemberId)
          )
        );

      // Fetch the household with the newly created member
      household = await ctx.db.query.households.findFirst({
        where: eq(households.id, newHousehold.id),
        with: {
          members: true,
        },
      });
    }

    return household;
  }),

  // Get household with members
  get: protectedProcedure.query(async ({ ctx }) => {
    const household = await ctx.db.query.households.findFirst({
      where: eq(households.ownerId, ctx.user.id),
      with: {
        members: true,
      },
    });

    return household;
  }),

  // Get all members (creates household if doesn't exist)
  getMembers: protectedProcedure.query(async ({ ctx }) => {
    let household = await ctx.db.query.households.findFirst({
      where: eq(households.ownerId, ctx.user.id),
    });

    // Auto-create household for existing users
    if (!household) {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      if (!user) {
        return [];
      }

      // Create household
      const [newHousehold] = await ctx.db
        .insert(households)
        .values({
          name: `${user.name}'s Household`,
          ownerId: ctx.user.id,
        })
        .returning();

      // Create primary member (self)
      const [primaryMember] = await ctx.db.insert(householdMembers).values({
        householdId: newHousehold.id,
        name: user.name,
        dateOfBirth: user.dateOfBirth,
        sex: user.sex,
        relationship: "self",
        isPrimary: true,
      }).returning();

      // Link existing blood tests to the primary member
      await ctx.db
        .update(bloodTests)
        .set({ householdMemberId: primaryMember.id })
        .where(
          and(
            eq(bloodTests.userId, ctx.user.id),
            isNull(bloodTests.householdMemberId)
          )
        );

      household = newHousehold;
    }

    return ctx.db.query.householdMembers.findMany({
      where: eq(householdMembers.householdId, household.id),
      orderBy: (members, { desc }) => [desc(members.isPrimary), members.name],
    });
  }),

  // Get a specific member
  getMember: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const household = await ctx.db.query.households.findFirst({
        where: eq(households.ownerId, ctx.user.id),
      });

      if (!household) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Household not found",
        });
      }

      const member = await ctx.db.query.householdMembers.findFirst({
        where: and(
          eq(householdMembers.id, input.id),
          eq(householdMembers.householdId, household.id)
        ),
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      return member;
    }),

  // Add a household member
  addMember: protectedProcedure
    .input(createMemberSchema)
    .mutation(async ({ ctx, input }) => {
      // Get or create household
      let household = await ctx.db.query.households.findFirst({
        where: eq(households.ownerId, ctx.user.id),
      });

      if (!household) {
        // Create household first
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.id, ctx.user.id),
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        const [newHousehold] = await ctx.db
          .insert(households)
          .values({
            name: `${user.name}'s Household`,
            ownerId: ctx.user.id,
          })
          .returning();

        // Create primary member (self)
        const [primaryMember] = await ctx.db.insert(householdMembers).values({
          householdId: newHousehold.id,
          name: user.name,
          dateOfBirth: user.dateOfBirth,
          sex: user.sex,
          relationship: "self",
          isPrimary: true,
        }).returning();

        // Link existing blood tests (without a household member) to the primary member
        await ctx.db
          .update(bloodTests)
          .set({ householdMemberId: primaryMember.id })
          .where(
            and(
              eq(bloodTests.userId, ctx.user.id),
              isNull(bloodTests.householdMemberId)
            )
          );

        household = newHousehold;
      }

      // Add new member
      const [member] = await ctx.db
        .insert(householdMembers)
        .values({
          householdId: household.id,
          name: input.name,
          dateOfBirth: input.dateOfBirth,
          sex: input.sex,
          relationship: input.relationship,
          isPrimary: false,
        })
        .returning();

      return member;
    }),

  // Update a household member
  updateMember: protectedProcedure
    .input(updateMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const household = await ctx.db.query.households.findFirst({
        where: eq(households.ownerId, ctx.user.id),
      });

      if (!household) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Household not found",
        });
      }

      // Verify member belongs to user's household
      const existing = await ctx.db.query.householdMembers.findFirst({
        where: and(
          eq(householdMembers.id, input.id),
          eq(householdMembers.householdId, household.id)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      const { id, ...updates } = input;
      const [updated] = await ctx.db
        .update(householdMembers)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(householdMembers.id, id))
        .returning();

      return updated;
    }),

  // Remove a household member
  removeMember: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const household = await ctx.db.query.households.findFirst({
        where: eq(households.ownerId, ctx.user.id),
      });

      if (!household) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Household not found",
        });
      }

      // Verify member belongs to user's household
      const existing = await ctx.db.query.householdMembers.findFirst({
        where: and(
          eq(householdMembers.id, input.id),
          eq(householdMembers.householdId, household.id)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      // Cannot delete primary member
      if (existing.isPrimary) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete the primary household member",
        });
      }

      // Delete member (blood tests will have householdMemberId set to null due to onDelete: "set null")
      await ctx.db.delete(householdMembers).where(eq(householdMembers.id, input.id));

      return { success: true };
    }),

  // Update household name
  updateHousehold: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(255) }))
    .mutation(async ({ ctx, input }) => {
      const household = await ctx.db.query.households.findFirst({
        where: eq(households.ownerId, ctx.user.id),
      });

      if (!household) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Household not found",
        });
      }

      const [updated] = await ctx.db
        .update(households)
        .set({
          name: input.name,
          updatedAt: new Date(),
        })
        .where(eq(households.id, household.id))
        .returning();

      return updated;
    }),
});
