import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { biomarkers, referenceRanges, biomarkerEducation } from "../schema";
import { biomarkersData, referenceRangesData } from "./biomarkers-data";
import { biomarkerEducationData } from "./biomarker-education-data";

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log("Seeding biomarkers...");

  // Insert biomarkers
  const insertedBiomarkers = await db
    .insert(biomarkers)
    .values(biomarkersData)
    .onConflictDoNothing()
    .returning();

  console.log(`Inserted ${insertedBiomarkers.length} biomarkers`);

  // Create a map of biomarker codes to IDs
  const allBiomarkers = await db.select().from(biomarkers);
  const biomarkerMap = new Map(allBiomarkers.map((b) => [b.code, b.id]));

  // Insert reference ranges
  console.log("Seeding reference ranges...");

  const referenceRangeValues = referenceRangesData.map((range) => ({
    biomarkerId: biomarkerMap.get(range.code)!,
    minAge: 0,
    maxAge: 150,
    sex: range.sex || null,
    minValue: range.minValue?.toString() || null,
    maxValue: range.maxValue?.toString() || null,
    unit: range.unit,
  }));

  const insertedRanges = await db
    .insert(referenceRanges)
    .values(referenceRangeValues)
    .onConflictDoNothing()
    .returning();

  console.log(`Inserted ${insertedRanges.length} reference ranges`);

  // Insert biomarker education content
  console.log("Seeding biomarker education content...");

  const educationValues = biomarkerEducationData
    .map((edu) => {
      const biomarkerId = biomarkerMap.get(edu.code);
      if (!biomarkerId) {
        console.warn(`Biomarker not found for education content: ${edu.code}`);
        return null;
      }
      return {
        biomarkerId,
        description: edu.description,
        whyItMatters: edu.whyItMatters,
        ifLow: edu.ifLow,
        ifHigh: edu.ifHigh,
        howToImprove: edu.howToImprove,
        relatedBiomarkerCodes: edu.relatedBiomarkerCodes,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const insertedEducation = await db
    .insert(biomarkerEducation)
    .values(educationValues)
    .onConflictDoNothing()
    .returning();

  console.log(`Inserted ${insertedEducation.length} education entries`);

  await pool.end();
  console.log("Seed completed!");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
