"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useSelectedMember } from "@/contexts/selected-member-context";
import {
  SleepStagesChart,
  HeartRateChart,
  HRVChart,
  HealthKPICard,
} from "@/components/charts";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChartHistogramIcon,
  Pulse02Icon,
  Activity01Icon,
  SleepingIcon,
} from "@hugeicons/core-free-icons";

export default function InsightsPage() {
  const { selectedMemberId } = useSelectedMember();

  // Sleep chart state
  const [sleepTimeframe, setSleepTimeframe] = useState<
    "week" | "month" | "year"
  >("week");

  // Heart rate chart state
  const [hrViewMode, setHrViewMode] = useState<"day" | "week" | "month">(
    "week"
  );
  const [hrSelectedDate, setHrSelectedDate] = useState<string | undefined>(
    undefined
  );

  // HRV chart state
  const [hrvTimeframe, setHrvTimeframe] = useState<"week" | "month" | "year">(
    "week"
  );

  // Fetch chart data
  const { data: sleepData, isLoading: sleepLoading } =
    trpc.journal.getSleepStagesData.useQuery({
      timeframe: sleepTimeframe,
      householdMemberId: selectedMemberId,
    });

  const { data: heartRateData, isLoading: hrLoading } =
    trpc.journal.getHeartRateData.useQuery({
      viewMode: hrViewMode,
      selectedDate: hrViewMode === "day" ? hrSelectedDate : undefined,
      householdMemberId: selectedMemberId,
    });

  const { data: hrvData, isLoading: hrvLoading } =
    trpc.journal.getHRVData.useQuery({
      timeframe: hrvTimeframe,
      householdMemberId: selectedMemberId,
    });

  // Calculate KPI summaries
  const heartRateKPI = useMemo(() => {
    if (!heartRateData || heartRateData.length === 0) {
      return { value: "—", subtitle: "No data", sparkline: [] };
    }

    const validData = heartRateData.filter(
      (d) => d.avgHeartRate !== null && d.avgHeartRate > 0
    );
    if (validData.length === 0) {
      return { value: "—", subtitle: "No data", sparkline: [] };
    }

    const avg = Math.round(
      validData.reduce((sum, d) => sum + d.avgHeartRate!, 0) / validData.length
    );
    const minVals = validData
      .filter((d) => d.minHeartRate !== null && d.minHeartRate > 0)
      .map((d) => d.minHeartRate!);
    const maxVals = validData
      .filter((d) => d.maxHeartRate !== null && d.maxHeartRate > 0)
      .map((d) => d.maxHeartRate!);

    const min = minVals.length > 0 ? Math.min(...minVals) : null;
    const max = maxVals.length > 0 ? Math.max(...maxVals) : null;

    const subtitle =
      min !== null && max !== null ? `${min}-${max} bpm range` : undefined;

    return {
      value: `${avg} bpm`,
      subtitle,
      sparkline: heartRateData.map((d) => ({ value: d.avgHeartRate })),
    };
  }, [heartRateData]);

  const hrvKPI = useMemo(() => {
    if (!hrvData || hrvData.length === 0) {
      return { value: "—", subtitle: "No data", sparkline: [], trend: undefined };
    }

    const validData = hrvData.filter((d) => d.hrv !== null && d.hrv > 0);
    if (validData.length === 0) {
      return { value: "—", subtitle: "No data", sparkline: [], trend: undefined };
    }

    const avg = Math.round(
      validData.reduce((sum, d) => sum + d.hrv!, 0) / validData.length
    );

    // Calculate trend
    let trend: "up" | "down" | "stable" | undefined = undefined;
    let trendLabel: string | undefined = undefined;
    if (validData.length >= 14) {
      const recent = validData.slice(-7);
      const previous = validData.slice(-14, -7);
      const recentAvg =
        recent.reduce((sum, d) => sum + d.hrv!, 0) / recent.length;
      const previousAvg =
        previous.reduce((sum, d) => sum + d.hrv!, 0) / previous.length;
      const diff = recentAvg - previousAvg;
      const pctChange = Math.round((diff / previousAvg) * 100);
      if (diff > 3) {
        trend = "up";
        trendLabel = `+${pctChange}%`;
      } else if (diff < -3) {
        trend = "down";
        trendLabel = `${pctChange}%`;
      }
    }

    return {
      value: `${avg} ms`,
      subtitle: "SDNN average",
      sparkline: hrvData.map((d) => ({ value: d.hrv })),
      trend,
      trendLabel,
    };
  }, [hrvData]);

  const sleepKPI = useMemo(() => {
    if (!sleepData || sleepData.length === 0) {
      return { value: "—", subtitle: "No data", sparkline: [] };
    }

    const validData = sleepData.filter((d) => d.totalSleepMinutes > 0);
    if (validData.length === 0) {
      return { value: "—", subtitle: "No data", sparkline: [] };
    }

    const avgMinutes = Math.round(
      validData.reduce((sum, d) => sum + d.totalSleepMinutes, 0) /
        validData.length
    );
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;

    return {
      value: `${hours}h ${mins}m`,
      subtitle: "nightly average",
      sparkline: sleepData.map((d) => ({ value: d.totalSleepMinutes || null })),
    };
  }, [sleepData]);

  const hasAnyData =
    (heartRateData?.some((d) => d.avgHeartRate !== null) ?? false) ||
    (hrvData?.some((d) => d.hrv !== null) ?? false) ||
    (sleepData?.some((d) => d.totalSleepMinutes > 0) ?? false);

  const isLoading = sleepLoading || hrLoading || hrvLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <HugeiconsIcon
          icon={ChartHistogramIcon}
          className="h-6 w-6 text-primary"
        />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Health Insights</h1>
          <p className="text-muted-foreground">
            Visualize your health data trends over time
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <HealthKPICard
          title="Heart Rate"
          value={heartRateKPI.value}
          subtitle={heartRateKPI.subtitle}
          icon={Pulse02Icon}
          iconColor="text-red-500"
          sparklineData={heartRateKPI.sparkline}
          sparklineColor="var(--color-heart-rate, oklch(0.65 0.2 25))"
        />
        <HealthKPICard
          title="HRV"
          value={hrvKPI.value}
          subtitle={hrvKPI.subtitle}
          icon={Activity01Icon}
          iconColor="text-green-500"
          sparklineData={hrvKPI.sparkline}
          sparklineColor="var(--color-hrv, oklch(0.65 0.2 140))"
          trend={hrvKPI.trend}
          trendLabel={hrvKPI.trendLabel}
        />
        <HealthKPICard
          title="Sleep"
          value={sleepKPI.value}
          subtitle={sleepKPI.subtitle}
          icon={SleepingIcon}
          iconColor="text-indigo-500"
          sparklineData={sleepKPI.sparkline}
          sparklineColor="var(--color-sleep-deep, oklch(0.6 0.15 270))"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sleep Stages Chart */}
        <SleepStagesChart
          data={sleepData ?? []}
          timeframe={sleepTimeframe}
          onTimeframeChange={setSleepTimeframe}
          isLoading={sleepLoading}
        />

        {/* Heart Rate Chart */}
        <HeartRateChart
          data={heartRateData ?? []}
          viewMode={hrViewMode}
          onViewModeChange={setHrViewMode}
          selectedDate={hrSelectedDate}
          isLoading={hrLoading}
        />

        {/* HRV Chart */}
        <HRVChart
          data={hrvData ?? []}
          timeframe={hrvTimeframe}
          onTimeframeChange={setHrvTimeframe}
          isLoading={hrvLoading}
        />
      </div>

      {/* Empty state hint */}
      {!isLoading && !hasAnyData && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">
            No health data to display yet. Import data from your iPhone Health
            app to see insights.
          </p>
        </div>
      )}
    </div>
  );
}
