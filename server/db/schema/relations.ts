import { relations } from "drizzle-orm";
import { users, sessions, accounts } from "./users";
import { households, householdMembers } from "./households";
import { bloodTests } from "./blood-tests";
import { bloodTestResults } from "./blood-test-results";
import { biomarkers, referenceRanges } from "./biomarkers";
import { biomarkerEducation } from "./biomarker-education";
import {
  healthJournalEntries,
  weightEntries,
  sleepEntries,
  glucoseEntries,
  medications,
  supplements,
} from "./health-journal";
import { healthDataImports } from "./health-data-imports";

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  bloodTests: many(bloodTests),
  healthJournalEntries: many(healthJournalEntries),
  medications: many(medications),
  supplements: many(supplements),
  households: many(households),
  healthDataImports: many(healthDataImports),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const bloodTestsRelations = relations(bloodTests, ({ one, many }) => ({
  user: one(users, {
    fields: [bloodTests.userId],
    references: [users.id],
  }),
  householdMember: one(householdMembers, {
    fields: [bloodTests.householdMemberId],
    references: [householdMembers.id],
  }),
  results: many(bloodTestResults),
}));

export const bloodTestResultsRelations = relations(
  bloodTestResults,
  ({ one }) => ({
    bloodTest: one(bloodTests, {
      fields: [bloodTestResults.bloodTestId],
      references: [bloodTests.id],
    }),
    biomarker: one(biomarkers, {
      fields: [bloodTestResults.biomarkerId],
      references: [biomarkers.id],
    }),
  })
);

export const biomarkersRelations = relations(biomarkers, ({ many, one }) => ({
  referenceRanges: many(referenceRanges),
  results: many(bloodTestResults),
  education: one(biomarkerEducation),
}));

export const referenceRangesRelations = relations(
  referenceRanges,
  ({ one }) => ({
    biomarker: one(biomarkers, {
      fields: [referenceRanges.biomarkerId],
      references: [biomarkers.id],
    }),
  })
);

// Biomarker Education Relations
export const biomarkerEducationRelations = relations(
  biomarkerEducation,
  ({ one }) => ({
    biomarker: one(biomarkers, {
      fields: [biomarkerEducation.biomarkerId],
      references: [biomarkers.id],
    }),
  })
);

// Health Journal Relations
export const healthJournalEntriesRelations = relations(
  healthJournalEntries,
  ({ one }) => ({
    user: one(users, {
      fields: [healthJournalEntries.userId],
      references: [users.id],
    }),
    weightEntry: one(weightEntries),
    sleepEntry: one(sleepEntries),
    glucoseEntry: one(glucoseEntries),
    import: one(healthDataImports, {
      fields: [healthJournalEntries.importId],
      references: [healthDataImports.id],
    }),
  })
);

export const weightEntriesRelations = relations(weightEntries, ({ one }) => ({
  journalEntry: one(healthJournalEntries, {
    fields: [weightEntries.journalEntryId],
    references: [healthJournalEntries.id],
  }),
}));

export const sleepEntriesRelations = relations(sleepEntries, ({ one }) => ({
  journalEntry: one(healthJournalEntries, {
    fields: [sleepEntries.journalEntryId],
    references: [healthJournalEntries.id],
  }),
}));

export const glucoseEntriesRelations = relations(glucoseEntries, ({ one }) => ({
  journalEntry: one(healthJournalEntries, {
    fields: [glucoseEntries.journalEntryId],
    references: [healthJournalEntries.id],
  }),
}));

// Medications & Supplements Relations
export const medicationsRelations = relations(medications, ({ one }) => ({
  user: one(users, {
    fields: [medications.userId],
    references: [users.id],
  }),
}));

export const supplementsRelations = relations(supplements, ({ one }) => ({
  user: one(users, {
    fields: [supplements.userId],
    references: [users.id],
  }),
}));

// Household Relations
export const householdsRelations = relations(households, ({ one, many }) => ({
  owner: one(users, {
    fields: [households.ownerId],
    references: [users.id],
  }),
  members: many(householdMembers),
}));

export const householdMembersRelations = relations(
  householdMembers,
  ({ one, many }) => ({
    household: one(households, {
      fields: [householdMembers.householdId],
      references: [households.id],
    }),
    bloodTests: many(bloodTests),
  })
);

// Health Data Import Relations
export const healthDataImportsRelations = relations(
  healthDataImports,
  ({ one, many }) => ({
    user: one(users, {
      fields: [healthDataImports.userId],
      references: [users.id],
    }),
    journalEntries: many(healthJournalEntries),
  })
);
