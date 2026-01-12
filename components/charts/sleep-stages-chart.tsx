"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { SleepingIcon } from "@hugeicons/core-free-icons";

export interface SleepStagesData {
  date: string;
  label: string;
  deepMinutes: number;
  coreMinutes: number;
  remMinutes: number;
  awakeMinutes: number;
  totalSleepMinutes: number;
}

interface SleepStagesChartProps {
  data: SleepStagesData[];
  timeframe: "week" | "month" | "year";
  onTimeframeChange: (timeframe: "week" | "month" | "year") => void;
  isLoading?: boolean;
}

const chartConfig = {
  deepMinutes: {
    label: "Deep",
    color: "var(--color-sleep-deep, oklch(0.6 0.15 270))",
  },
  coreMinutes: {
    label: "Core",
    color: "var(--color-sleep-core, oklch(0.65 0.15 220))",
  },
  remMinutes: {
    label: "REM",
    color: "var(--color-sleep-rem, oklch(0.7 0.15 170))",
  },
  awakeMinutes: {
    label: "Awake",
    color: "var(--color-sleep-awake, oklch(0.75 0.1 60))",
  },
} satisfies ChartConfig;

function formatMinutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

const timeframeOptions = [
  { value: "week", label: "W" },
  { value: "month", label: "M" },
  { value: "year", label: "Y" },
] as const;

export function SleepStagesChart({
  data,
  timeframe,
  onTimeframeChange,
  isLoading = false,
}: SleepStagesChartProps) {
  const averageTotalSleep = React.useMemo(() => {
    if (data.length === 0) return 0;
    const total = data.reduce((acc, item) => acc + item.totalSleepMinutes, 0);
    return total / data.length;
  }, [data]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={SleepingIcon} className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-base">Sleep Stages</CardTitle>
            <CardDescription>
              Avg. {formatMinutesToHours(averageTotalSleep)} / night
            </CardDescription>
          </div>
        </div>
        <div className="flex gap-1 rounded-md border p-0.5">
          {timeframeOptions.map((option) => (
            <Button
              key={option.value}
              variant={timeframe === option.value ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onTimeframeChange(option.value)}
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
        ) : data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center">
            <div className="text-muted-foreground text-sm">No sleep data available</div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart
              data={data}
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
                tickFormatter={(value) => formatMinutesToHours(value)}
                width={50}
              />
              <Tooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      const config = chartConfig[name as keyof typeof chartConfig];
                      return (
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            {config?.label || name}
                          </span>
                          <span className="font-mono font-medium">
                            {formatMinutesToHours(value as number)}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="deepMinutes"
                stackId="sleep"
                fill="var(--color-deepMinutes)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="coreMinutes"
                stackId="sleep"
                fill="var(--color-coreMinutes)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="remMinutes"
                stackId="sleep"
                fill="var(--color-remMinutes)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="awakeMinutes"
                stackId="sleep"
                fill="var(--color-awakeMinutes)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
