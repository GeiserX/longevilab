"use client";

import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type TrendDirection = "up" | "down" | "stable" | null;

interface HealthStatCardProps {
  title: string;
  value: string | number | null;
  unit?: string;
  trend?: TrendDirection;
  trendValue?: string;
  icon: IconSvgElement;
  href?: string;
  emptyMessage?: string;
  colorClass?: string;
}

function getTrendIcon(trend: TrendDirection) {
  switch (trend) {
    case "up":
      return ArrowUp01Icon;
    case "down":
      return ArrowDown01Icon;
    case "stable":
      return MinusSignIcon;
    default:
      return null;
  }
}

function getTrendColor(trend: TrendDirection, invertColors = false) {
  if (trend === "stable") return "text-muted-foreground";

  // For weight, down is usually good (green), up is warning (amber)
  // For other metrics like sleep, up is good (green), down is warning (amber)
  if (invertColors) {
    return trend === "down" ? "text-emerald-500" : "text-amber-500";
  }
  return trend === "up" ? "text-emerald-500" : "text-amber-500";
}

export function HealthStatCard({
  title,
  value,
  unit,
  trend,
  trendValue,
  icon,
  href,
  emptyMessage = "No data",
  colorClass = "bg-primary/10 text-primary",
}: HealthStatCardProps) {
  const TrendIcon = getTrendIcon(trend ?? null);
  const isWeightCard = title.toLowerCase().includes("weight");
  const trendColor = getTrendColor(trend ?? null, isWeightCard);

  const content = (
    <Card className={cn("transition-all duration-200", href && "hover:shadow-md hover:scale-[1.02] cursor-pointer")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("p-2 rounded-lg", colorClass)}>
                <HugeiconsIcon icon={icon} className="size-4" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{title}</span>
            </div>

            {value !== null && value !== undefined ? (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight">{value}</span>
                {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">{emptyMessage}</span>
            )}
          </div>

          {/* Trend indicator */}
          {trend && TrendIcon && (
            <div className={cn("flex items-center gap-1", trendColor)}>
              <HugeiconsIcon icon={TrendIcon} className="size-4" />
              {trendValue && <span className="text-xs font-medium">{trendValue}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
