"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { UserCircleIcon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "other">("male");
  const [preferredUnits, setPreferredUnits] = useState<
    "metric" | "imperial" | "us"
  >("metric");
  const [error, setError] = useState("");

  const completeOnboarding = trpc.user.completeOnboarding.useMutation({
    onSuccess: () => {
      router.push("/dashboard");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !dateOfBirth || !sex) {
      setError("Please fill in all required fields");
      return;
    }

    completeOnboarding.mutate({
      name,
      dateOfBirth,
      sex,
      preferredUnits,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 -mt-16">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <HugeiconsIcon
              icon={UserCircleIcon}
              className="w-6 h-6 text-primary"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Complete Your Profile
          </h1>
          <p className="text-muted-foreground mt-2">
            We need a few details to personalize your experience and provide
            accurate reference ranges.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Used to calculate age-appropriate reference ranges
            </p>
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
                required
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
            <p className="text-xs text-muted-foreground">
              Used to determine sex-specific reference ranges
            </p>
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

          <Button
            type="submit"
            className="w-full"
            disabled={completeOnboarding.isPending}
          >
            {completeOnboarding.isPending ? "Saving..." : "Complete Setup"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
