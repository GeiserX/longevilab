import {
  StarsBackground,
  HeroTitle,
  LandingCta,
  FeaturesSection,
  Footer,
} from "@/components/landing";

export default function HomePage() {
  return (
    <div className="bg-stone-950">
      {/* Hero Section - Full Height */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Animated stars background */}
        <StarsBackground
          starCount={150}
          speed={50}
          starColor="rgba(255, 255, 255, 0.9)"
          factor={0.03}
        />

        {/* Big typography - top left */}
        <HeroTitle />

        {/* CTA section - bottom left */}
        <LandingCta />

        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent pointer-events-none z-0" />
      </section>

      {/* Features Section */}
      <FeaturesSection />

      {/* Footer */}
      <Footer />
    </div>
  );
}
