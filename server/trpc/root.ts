import { createTRPCRouter } from "./trpc";
import { userRouter } from "./routers/user";
import { biomarkerRouter } from "./routers/biomarker";
import { bloodTestRouter } from "./routers/blood-test";
import { journalRouter } from "./routers/journal";
import { medicationsRouter } from "./routers/medications";
import { biologicalAgeRouter } from "./routers/biological-age";
import { householdRouter } from "./routers/household";

export const appRouter = createTRPCRouter({
  user: userRouter,
  biomarker: biomarkerRouter,
  bloodTest: bloodTestRouter,
  journal: journalRouter,
  medications: medicationsRouter,
  biologicalAge: biologicalAgeRouter,
  household: householdRouter,
});

export type AppRouter = typeof appRouter;
