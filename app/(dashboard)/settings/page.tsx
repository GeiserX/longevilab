"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Settings01Icon, CheckmarkCircle01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { HouseholdSection } from "@/components/settings/household-section";

export default function SettingsPage() {
  const { data: profile, isLoading } = trpc.user.getProfile.useQuery();
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "other">("male");
  const [preferredUnits, setPreferredUnits] = useState<
    "metric" | "imperial" | "us"
  >("metric");
  const [saved, setSaved] = useState(false);

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      utils.user.getProfile.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setDateOfBirth(profile.dateOfBirth || "");
      setSex((profile.sex as "male" | "female" | "other") || "male");
      setPreferredUnits(
        (profile.preferredUnits as "metric" | "imperial" | "us") || "metric"
      );
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    updateProfile.mutate({
      name,
      dateOfBirth,
      sex,
      preferredUnits,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <HugeiconsIcon
              icon={Settings01Icon}
              className="h-5 w-5 text-primary"
            />
          </div>
          <div className="ml-4">
            <h2 className="text-lg font-semibold text-foreground">
              Profile Settings
            </h2>
            <p className="text-sm text-muted-foreground">
              Update your personal information
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {saved && (
            <div className="flex items-center p-3 rounded-lg bg-success/10 text-success text-sm">
              <HugeiconsIcon
                icon={CheckmarkCircle01Icon}
                className="h-4 w-4 mr-2"
              />
              Settings saved successfully
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sex">Biological Sex</Label>
            <div className="relative">
              <select
                id="sex"
                value={sex}
                onChange={(e) =>
                  setSex(e.target.value as "male" | "female" | "other")
                }
                className="w-full h-9 rounded-4xl border border-input bg-input/30 px-3 pr-10 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none appearance-none cursor-pointer"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredUnits">Preferred Units</Label>
            <div className="relative">
              <select
                id="preferredUnits"
                value={preferredUnits}
                onChange={(e) =>
                  setPreferredUnits(
                    e.target.value as "metric" | "imperial" | "us"
                  )
                }
                className="w-full h-9 rounded-4xl border border-input bg-input/30 px-3 pr-10 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none appearance-none cursor-pointer"
              >
                <option value="metric">Metric (SI units)</option>
                <option value="us">US Conventional (mg/dL)</option>
                <option value="imperial">Imperial</option>
              </select>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
              />
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>

      <HouseholdSection />
    </div>
  );
}
