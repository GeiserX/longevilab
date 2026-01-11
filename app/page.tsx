import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TestTube02Icon,
  Upload02Icon,
  ChartLineData01Icon,
  SecurityCheckIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted to-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HugeiconsIcon
              icon={TestTube02Icon}
              className="h-8 w-8 text-primary"
            />
            <span className="text-xl font-bold text-foreground">
              Bloodwork Tracker
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
          Track Your Health
          <br />
          <span className="text-primary">With Confidence</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Upload your blood test PDFs, automatically extract biomarker values,
          and monitor your health trends over time. Self-hosted and
          privacy-focused.
        </p>
        <div className="flex items-center justify-center space-x-4">
          <Link href="/register">
            <Button size="lg">Start Tracking Free</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="p-6">
            <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
              <HugeiconsIcon
                icon={Upload02Icon}
                className="h-6 w-6 text-primary"
              />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Easy Upload
            </h3>
            <p className="text-muted-foreground">
              Simply upload your blood test PDF. Our OCR and AI technology
              automatically extracts all biomarker values.
            </p>
          </Card>

          <Card className="p-6">
            <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
              <HugeiconsIcon
                icon={ChartLineData01Icon}
                className="h-6 w-6 text-primary"
              />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Track Trends
            </h3>
            <p className="text-muted-foreground">
              Monitor your biomarkers over time. See what&apos;s improving and
              what needs attention with clear visualizations.
            </p>
          </Card>

          <Card className="p-6">
            <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
              <HugeiconsIcon
                icon={SecurityCheckIcon}
                className="h-6 w-6 text-primary"
              />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Private & Secure
            </h3>
            <p className="text-muted-foreground">
              Self-hosted and open-source. Your health data stays on your
              server, under your control.
            </p>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>Open-source health tracking. Built with privacy in mind.</p>
        </div>
      </footer>
    </div>
  );
}
