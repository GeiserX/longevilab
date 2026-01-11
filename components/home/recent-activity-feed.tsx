"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  WeightScale01Icon,
  SleepingIcon,
  TestTube02Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type ActivityType = "weight" | "sleep" | "glucose" | "blood_test";

interface ActivityItem {
  id: string;
  type: ActivityType;
  value: string;
  unit?: string;
  date: Date;
  subtext?: string;
}

interface RecentActivityFeedProps {
  activities: ActivityItem[];
}

function getActivityIcon(type: ActivityType) {
  switch (type) {
    case "weight":
      return WeightScale01Icon;
    case "sleep":
      return SleepingIcon;
    case "glucose":
      return TestTube02Icon;
    case "blood_test":
      return TestTube02Icon;
    default:
      return TestTube02Icon;
  }
}

function getActivityLabel(type: ActivityType) {
  switch (type) {
    case "weight":
      return "Weight";
    case "sleep":
      return "Sleep";
    case "glucose":
      return "Glucose";
    case "blood_test":
      return "Blood Test";
    default:
      return "Activity";
  }
}

function getActivityColor(type: ActivityType) {
  switch (type) {
    case "weight":
      return "bg-blue-500/10 text-blue-500";
    case "sleep":
      return "bg-purple-500/10 text-purple-500";
    case "glucose":
      return "bg-amber-500/10 text-amber-500";
    case "blood_test":
      return "bg-emerald-500/10 text-emerald-500";
    default:
      return "bg-primary/10 text-primary";
  }
}

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">No recent activity</p>
            <p className="text-muted-foreground text-xs mt-1">
              Start tracking your health to see activity here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <Link
          href="/journal"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "flex items-center gap-1 text-sm"
          )}
        >
          View all
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.map((activity) => {
          const Icon = getActivityIcon(activity.type);
          const label = getActivityLabel(activity.type);
          const colorClass = getActivityColor(activity.type);

          return (
            <div
              key={activity.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className={`p-2 rounded-lg ${colorClass}`}>
                <HugeiconsIcon icon={Icon} className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-sm">
                    {activity.value}
                    {activity.unit && (
                      <span className="text-muted-foreground ml-1">{activity.unit}</span>
                    )}
                  </span>
                </div>
                {activity.subtext && (
                  <span className="text-xs text-muted-foreground">{activity.subtext}</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(activity.date, { addSuffix: true })}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
