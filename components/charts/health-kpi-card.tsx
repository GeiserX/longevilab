"use client";

import * as React from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";

interface HealthKPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: IconSvgElement;
  iconColor?: string;
  sparklineData: { value: number | null }[];
  sparklineColor: string;
  trend?: "up" | "down" | "stable";
  trendLabel?: string;
  onClick?: () => void;
}

export function HealthKPICard({
  title,
  value,
  subtitle,
  icon,
  iconColor = "text-muted-foreground",
  sparklineData,
  sparklineColor,
  trend,
  trendLabel,
  onClick,
}: HealthKPICardProps) {
  // Generate unique gradient ID based on title
  const gradientId = React.useMemo(
    () => `spark-${title.replace(/\s+/g, "-").toLowerCase()}`,
    [title]
  );

  // Transform data for recharts - undefined creates gaps
  const validData = sparklineData.map((d, i) => ({
    index: i,
    value: d.value ?? undefined,
  }));

  return (
    <Card
      className={cn(
        "overflow-hidden",
        onClick && "cursor-pointer hover:bg-muted/50 transition-colors"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={icon} className={cn("h-5 w-5", iconColor)} />
            <span className="text-sm font-medium text-muted-foreground">
              {title}
            </span>
          </div>
          {trend && trendLabel && (
            <span
              className={cn(
                "text-xs font-medium",
                trend === "up"
                  ? "text-green-500"
                  : trend === "down"
                    ? "text-red-500"
                    : "text-muted-foreground"
              )}
            >
              {trendLabel}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>

          <div className="h-12 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={validData}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={sparklineColor}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={sparklineColor}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={sparklineColor}
                  strokeWidth={1.5}
                  fill={`url(#${gradientId})`}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
