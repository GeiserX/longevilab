"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  SleepingIcon,
  WeightScale01Icon,
  TestTube02Icon,
  Medicine01Icon,
} from "@hugeicons/core-free-icons";
import { trpc } from "@/lib/trpc";
import { useSelectedMember } from "@/contexts/selected-member-context";
import {
  BiologicalAgeBlob,
  HealthStatCard,
  RecentActivityFeed,
  QuickActions,
  type TrendDirection,
} from "@/components/home";

export default function HomePage() {
  const { selectedMemberId } = useSelectedMember();

  // Fetch household members to determine if we should wait for member selection
  const { data: members, isLoading: membersLoading } = trpc.household.getMembers.useQuery();

  // Determine if we should run queries
  // Wait until members are loaded AND a member is selected
  // The sidebar auto-selects the primary member on initial load
  const shouldQuery = !membersLoading && (members?.length === 0 || !!selectedMemberId);

  // Fetch biological age data (filtered by selected member)
  const { data: bioAgeData } = trpc.biologicalAge.calculate.useQuery(
    { householdMemberId: selectedMemberId },
    { enabled: shouldQuery }
  );

  // Fetch latest journal entries by type (filtered by selected member)
  const { data: latestByType } = trpc.journal.getLatestByType.useQuery(
    { householdMemberId: selectedMemberId },
    { enabled: shouldQuery }
  );

  // Fetch weekly stats (filtered by selected member)
  const { data: weeklyStats } = trpc.journal.getWeeklyStats.useQuery(
    { householdMemberId: selectedMemberId },
    { enabled: shouldQuery }
  );

  // Fetch recent journal entries for activity feed (filtered by selected member)
  const { data: recentJournalEntries } = trpc.journal.getRecent.useQuery(
    { limit: 3, householdMemberId: selectedMemberId },
    { enabled: shouldQuery }
  );

  // Fetch recent blood tests (filtered by selected member)
  const { data: recentBloodTests } = trpc.bloodTest.getAll.useQuery(
    { householdMemberId: selectedMemberId },
    { enabled: shouldQuery }
  );

  // Fetch active medications/supplements count
  const { data: medCounts } = trpc.medications.getActiveCounts.useQuery();

  // Calculate sleep trend
  let sleepTrend: TrendDirection = null;
  let sleepValue: string | null = null;
  if (latestByType?.sleep?.sleepEntry) {
    const hours = latestByType.sleep.sleepEntry.durationMinutes / 60;
    sleepValue = hours.toFixed(1);

    if (weeklyStats?.avgSleepMinutes && weeklyStats.sleepEntryCount >= 2) {
      const avgHours = weeklyStats.avgSleepMinutes / 60;
      const diff = hours - avgHours;
      if (diff > 0.25) sleepTrend = "up";
      else if (diff < -0.25) sleepTrend = "down";
      else sleepTrend = "stable";
    }
  }

  // Calculate weight trend
  let weightTrend: TrendDirection = null;
  let weightValue: string | null = null;
  let weightTrendValue: string | undefined;
  if (latestByType?.weight?.weightEntry) {
    weightValue = latestByType.weight.weightEntry.weight;

    if (weeklyStats?.weightChange !== null && weeklyStats?.weightChange !== undefined) {
      const change = weeklyStats.weightChange;
      if (change > 0.2) {
        weightTrend = "up";
        weightTrendValue = `+${change.toFixed(1)}`;
      } else if (change < -0.2) {
        weightTrend = "down";
        weightTrendValue = change.toFixed(1);
      } else {
        weightTrend = "stable";
      }
    }
  }

  // Get glucose value
  let glucoseValue: string | null = null;
  if (latestByType?.glucose?.glucoseEntry) {
    glucoseValue = latestByType.glucose.glucoseEntry.value;
  }

  // Build activity feed data
  const activities = [
    // Add journal entries
    ...(recentJournalEntries ?? []).map((entry) => {
      let value = "";
      let unit = "";

      if (entry.entryType === "weight" && entry.weightEntry) {
        value = entry.weightEntry.weight;
        unit = "kg";
      } else if (entry.entryType === "sleep" && entry.sleepEntry) {
        value = (entry.sleepEntry.durationMinutes / 60).toFixed(1);
        unit = "hours";
      } else if (entry.entryType === "glucose" && entry.glucoseEntry) {
        value = entry.glucoseEntry.value;
        unit = "mmol/L";
      }

      return {
        id: entry.id,
        type: entry.entryType as "weight" | "sleep" | "glucose",
        value,
        unit,
        date: new Date(entry.entryDate),
      };
    }),
    // Add latest blood test
    ...(recentBloodTests?.slice(0, 1).map((test) => ({
      id: test.id,
      type: "blood_test" as const,
      value: "uploaded",
      date: new Date(test.createdAt),
      subtext: test.status === "completed" ? "Processed" : test.status,
    })) ?? []),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Biological Age Hero */}
      <section className="flex flex-col items-center py-8">
        <BiologicalAgeBlob
          biologicalAge={bioAgeData?.biologicalAge ?? null}
          chronologicalAge={bioAgeData?.chronologicalAge ?? 0}
          confidence={bioAgeData?.confidence ?? "low"}
          missingBiomarkers={bioAgeData?.missingBiomarkers}
        />
      </section>

      {/* Health Stats Quick Cards */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <HealthStatCard
            title="Sleep"
            value={sleepValue}
            unit="hours"
            trend={sleepTrend}
            icon={SleepingIcon}
            href="/journal?type=sleep"
            colorClass="bg-purple-500/10 text-purple-500"
            emptyMessage="No sleep data"
          />
          <HealthStatCard
            title="Weight"
            value={weightValue}
            unit="kg"
            trend={weightTrend}
            trendValue={weightTrendValue}
            icon={WeightScale01Icon}
            href="/journal?type=weight"
            colorClass="bg-blue-500/10 text-blue-500"
            emptyMessage="No weight data"
          />
          <HealthStatCard
            title="Glucose"
            value={glucoseValue}
            unit="mmol/L"
            icon={TestTube02Icon}
            href="/journal?type=glucose"
            colorClass="bg-amber-500/10 text-amber-500"
            emptyMessage="No glucose data"
          />
          <HealthStatCard
            title="Meds & Supps"
            value={medCounts?.total ?? 0}
            unit="active"
            icon={Medicine01Icon}
            href="/journal?type=medications"
            colorClass="bg-emerald-500/10 text-emerald-500"
            emptyMessage="None tracked"
          />
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <QuickActions />
      </section>

      {/* Recent Activity */}
      <section>
        <RecentActivityFeed activities={activities} />
      </section>
    </div>
  );
}
