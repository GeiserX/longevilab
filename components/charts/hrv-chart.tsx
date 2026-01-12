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
import { Activity01Icon } from "@hugeicons/core-free-icons";

export interface HRVData {
  date: string;
  label: string;
  hrv: number | null; // HRV in ms (SDNN)
}

interface HRVChartProps {
  data: HRVData[];
  timeframe: "week" | "month" | "year";
  onTimeframeChange: (timeframe: "week" | "month" | "year") => void;
  isLoading?: boolean;
}

const chartConfig = {
  hrv: {
    label: "HRV",
    color: "var(--color-hrv, oklch(0.65 0.2 140))",
  },
} satisfies ChartConfig;

const timeframeOptions = [
  { value: "week", label: "W" },
  { value: "month", label: "M" },
  { value: "year", label: "Y" },
] as const;

export function HRVChart({
  data,
  timeframe,
  onTimeframeChange,
  isLoading = false,
}: HRVChartProps) {
  const stats = React.useMemo(() => {
    if (data.length === 0) return { avg: null, trend: "stable" as const };

    const validData = data.filter(
      (d): d is HRVData & { hrv: number } => d.hrv !== null && d.hrv > 0
    );
    if (validData.length === 0)
      return { avg: null, trend: "stable" as const };

    const avg = Math.round(
      validData.reduce((acc, item) => acc + item.hrv, 0) / validData.length
    );

    // Calculate trend (comparing last 7 vs previous 7)
    let trend: "up" | "down" | "stable" = "stable";
    if (validData.length >= 14) {
      const recent = validData.slice(-7);
      const previous = validData.slice(-14, -7);
      const recentAvg =
        recent.reduce((acc, item) => acc + item.hrv, 0) / recent.length;
      const previousAvg =
        previous.reduce((acc, item) => acc + item.hrv, 0) / previous.length;
      const diff = recentAvg - previousAvg;
      if (diff > 3) trend = "up";
      else if (diff < -3) trend = "down";
    }

    return { avg, trend };
  }, [data]);

  const yAxisDomain = React.useMemo(() => {
    const validValues = data
      .filter((d): d is HRVData & { hrv: number } => d.hrv !== null && d.hrv > 0)
      .map((d) => d.hrv);
    if (validValues.length === 0) return [0, 100];
    const minVal = Math.min(...validValues);
    const maxVal = Math.max(...validValues);
    return [Math.max(0, minVal - 5), maxVal + 5];
  }, [data]);

  const trendText =
    stats.trend === "up"
      ? "Improving"
      : stats.trend === "down"
        ? "Declining"
        : "Stable";
  const trendColor =
    stats.trend === "up"
      ? "text-green-500"
      : stats.trend === "down"
        ? "text-red-500"
        : "text-muted-foreground";

  const hasValidData = data.some((d) => d.hrv !== null && d.hrv > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={Activity01Icon}
            className="h-5 w-5 text-green-500"
          />
          <div>
            <CardTitle className="text-base">Heart Rate Variability</CardTitle>
            <CardDescription>
              {stats.avg !== null ? (
                <>
                  Avg. {stats.avg}ms{" "}
                  <span className={trendColor}>({trendText})</span>
                </>
              ) : (
                "No data"
              )}
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
        ) : data.length === 0 || !hasValidData ? (
          <div className="flex h-[300px] items-center justify-center">
            <div className="text-muted-foreground text-sm">
              No HRV data available
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart
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
                domain={yAxisDomain}
                tickFormatter={(value) => `${value}`}
                width={40}
              />
              <Tooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, item) => {
                      const dataPoint = item.payload as HRVData;
                      return (
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            HRV (SDNN)
                          </span>
                          <span className="font-mono font-medium">
                            {dataPoint.hrv !== null ? `${dataPoint.hrv}ms` : "—"}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              {stats.avg !== null && (
                <ReferenceLine
                  y={stats.avg}
                  stroke="var(--color-hrv)"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              )}
              <Line
                type="monotone"
                dataKey="hrv"
                stroke="var(--color-hrv)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-hrv)" }}
                activeDot={{ r: 5, fill: "var(--color-hrv)" }}
                connectNulls={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
