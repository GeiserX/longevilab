"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon, Loading03Icon } from "@hugeicons/core-free-icons";
import { trpc } from "@/lib/trpc";
import { useSelectedMember } from "@/contexts/selected-member-context";

interface BiomarkerEducation {
  id: string;
  description: string | null;
  whyItMatters: string | null;
  ifLow: string | null;
  ifHigh: string | null;
  howToImprove: string | null;
  relatedBiomarkerCodes: string[] | null;
}

interface BiomarkerEducationPanelProps {
  education: BiomarkerEducation | null;
  biomarkerName: string;
  biomarkerId: string;
  biomarkerCode: string;
  biomarkerCategory: string;
  relatedBiomarkers?: { code: string; name: string }[];
  onRelatedClick?: (code: string) => void;
}

export function BiomarkerEducationPanel({
  education,
  biomarkerName,
  biomarkerId,
  biomarkerCode,
  biomarkerCategory,
  relatedBiomarkers,
  onRelatedClick,
}: BiomarkerEducationPanelProps) {
  const { selectedMemberId } = useSelectedMember();
  const [insights, setInsights] = useState<string | null>(null);

  const insightsMutation = trpc.biomarker.getPersonalizedInsights.useMutation({
    onSuccess: (data) => {
      setInsights(data.insights);
    },
  });

  const handleGetInsights = () => {
    insightsMutation.mutate({
      biomarkerId,
      householdMemberId: selectedMemberId,
    });
  };

  // Render personalized insights - only button initially, card with content after generated
  const renderInsightsSection = () => {
    // Show card with insights after generated
    if (insights) {
      return (
        <Card className="p-3 border-purple-500/20 bg-purple-500/5">
          <div className="flex items-center gap-2 mb-2">
            <HugeiconsIcon icon={SparklesIcon} className="h-4 w-4 text-purple-500" />
            <h4 className="text-sm font-medium text-purple-600 dark:text-purple-400">
              Personalized Insights
            </h4>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground whitespace-pre-line">{insights}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGetInsights}
              disabled={insightsMutation.isPending}
              className="text-xs"
            >
              {insightsMutation.isPending ? (
                <>
                  <HugeiconsIcon icon={Loading03Icon} className="h-3 w-3 mr-1 animate-spin" />
                  Regenerating...
                </>
              ) : (
                "Regenerate"
              )}
            </Button>
          </div>
        </Card>
      );
    }

    // Show just the button initially
    return (
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleGetInsights}
          disabled={insightsMutation.isPending}
          className="w-fit"
        >
          {insightsMutation.isPending ? (
            <>
              <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 mr-2 animate-spin" />
              Generating Insights...
            </>
          ) : (
            <>
              <HugeiconsIcon icon={SparklesIcon} className="h-4 w-4 mr-2" />
              Get Personalized Insights
            </>
          )}
        </Button>
        {insightsMutation.isError && (
          <p className="text-sm text-destructive">
            {insightsMutation.error?.message || "Failed to generate insights. Please try again."}
          </p>
        )}
      </div>
    );
  };

  // Format category for display
  const formatCategory = (category: string) => {
    return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Truncate text to first 2 sentences
  const truncateToSentences = (text: string | null, count: number = 2) => {
    if (!text) return null;
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.slice(0, count).join(" ").trim();
  };

  if (!education) {
    return (
      <div className="p-4 space-y-4 bg-muted/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {formatCategory(biomarkerCategory)}
            </Badge>
            <span className="text-xs text-muted-foreground">({biomarkerCode})</span>
          </div>
          <p className="text-sm text-muted-foreground">
            No detailed information available for {biomarkerName} yet.
          </p>
        </div>
        {renderInsightsSection()}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 bg-muted/30">
      {/* Brief description - just 2 sentences */}
      {education.description && (
        <p className="text-sm text-muted-foreground">{truncateToSentences(education.description)}</p>
      )}

      {/* Personalized AI Insights button and Related Biomarkers in a row */}
      <div className="flex items-center gap-4 flex-wrap">
        {renderInsightsSection()}

        {relatedBiomarkers && relatedBiomarkers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Related:</span>
            <div className="flex flex-wrap gap-1">
              {relatedBiomarkers.map((related) => (
                <Badge
                  key={related.code}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80 text-xs"
                  onClick={() => onRelatedClick?.(related.code)}
                >
                  {related.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
