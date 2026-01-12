"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Pulse02Icon } from "@hugeicons/core-free-icons";

export interface HeartRateData {
  date: string;
  label: string;
  hour?: number;
  avgHeartRate: number | null;
  minHeartRate: number | null;
  maxHeartRate: number | null;
}

interface HeartRateChartProps {
  data: HeartRateData[];
  viewMode: "day" | "week" | "month";
  onViewModeChange: (mode: "day" | "week" | "month") => void;
  selectedDate?: string;
  isLoading?: boolean;
}

const chartConfig = {
  avgHeartRate: {
    label: "Average",
    color: "var(--color-heart-rate, oklch(0.65 0.2 25))",
  },
} satisfies ChartConfig;

const viewModeOptions = [
  { value: "day", label: "D" },
  { value: "week", label: "W" },
  { value: "month", label: "M" },
] as const;

export function HeartRateChart({
  data,
  viewMode,
  onViewModeChange,
  isLoading = false,
}: HeartRateChartProps) {
  const stats = React.useMemo(() => {
    if (data.length === 0) return { avg: null, min: null, max: null };

    const validAvg = data
      .filter((d) => d.avgHeartRate !== null && d.avgHeartRate > 0)
      .map((d) => d.avgHeartRate!);
    const validMin = data
      .filter((d) => d.minHeartRate !== null && d.minHeartRate > 0)
      .map((d) => d.minHeartRate!);
    const validMax = data
      .filter((d) => d.maxHeartRate !== null && d.maxHeartRate > 0)
      .map((d) => d.maxHeartRate!);

    if (validAvg.length === 0) return { avg: null, min: null, max: null };

    const avg = Math.round(
      validAvg.reduce((acc, v) => acc + v, 0) / validAvg.length
    );
    const min = validMin.length > 0 ? Math.min(...validMin) : null;
    const max = validMax.length > 0 ? Math.max(...validMax) : null;

    return { avg, min, max };
  }, [data]);

  // Transform data for chart - null values create gaps when connectNulls is false
  const chartData = React.useMemo(() => {
    return data.map((d) => ({
      ...d,
      // Keep null as null for proper gap rendering
      avgHeartRate: d.avgHeartRate,
    }));
  }, [data]);

  const yAxisDomain = React.useMemo(() => {
    const validValues = data.flatMap((d) =>
      [d.avgHeartRate, d.minHeartRate, d.maxHeartRate].filter(
        (v): v is number => v !== null && v > 0
      )
    );
    if (validValues.length === 0) return [40, 120];
    const minVal = Math.min(...validValues);
    const maxVal = Math.max(...validValues);
    return [Math.max(40, minVal - 10), maxVal + 10];
  }, [data]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Pulse02Icon} className="h-5 w-5 text-red-500" />
          <div>
            <CardTitle className="text-base">Heart Rate</CardTitle>
            <CardDescription>
              {stats.avg !== null ? (
                <>
                  Avg. {stats.avg} bpm
                  {stats.min !== null && stats.max !== null && (
                    <> ({stats.min}-{stats.max})</>
                  )}
                </>
              ) : (
                "No data"
              )}
            </CardDescription>
          </div>
        </div>
        <div className="flex gap-1 rounded-md border p-0.5">
          {viewModeOptions.map((option) => (
            <Button
              key={option.value}
              variant={viewMode === option.value ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onViewModeChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <div className="text-muted-foreground text-sm">Loading...</div>
          </div>
        ) : data.length === 0 ||
          !data.some((d) => d.avgHeartRate !== null) ? (
          <div className="flex h-[300px] items-center justify-center">
            <div className="text-muted-foreground text-sm">
              No heart rate data available
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                domain={yAxisDomain}
                tickFormatter={(value) => `${value}`}
                width={40}
              />
              <Tooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, item) => {
                      const dataPoint = item.payload as HeartRateData;
                      return (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Avg</span>
                            <span className="font-mono font-medium">
                              {dataPoint.avgHeartRate !== null
                                ? `${dataPoint.avgHeartRate} bpm`
                                : "—"}
                            </span>
                          </div>
                          {dataPoint.minHeartRate !== null && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Min</span>
                              <span className="font-mono font-medium">
                                {dataPoint.minHeartRate} bpm
                              </span>
                            </div>
                          )}
                          {dataPoint.maxHeartRate !== null && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Max</span>
                              <span className="font-mono font-medium">
                                {dataPoint.maxHeartRate} bpm
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                }
              />
              {/* Reference line for overall average */}
              {stats.avg !== null && (
                <ReferenceLine
                  y={stats.avg}
                  stroke="var(--color-avgHeartRate)"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              )}
              <Line
                type="monotone"
                dataKey="avgHeartRate"
                stroke="var(--color-avgHeartRate)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--color-avgHeartRate)" }}
                activeDot={{ r: 6, fill: "var(--color-avgHeartRate)" }}
                connectNulls={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
