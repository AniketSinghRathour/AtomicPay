"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { AtomicPayHero } from "@/components/hero/AtomicPayHero";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { DemoPreview } from "@/components/landing/DemoPreview";
import { Footer } from "@/components/layout/Footer";

export default function LandingPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const handleGetStarted = () => {
    if (session?.user) {
      router.push("/dashboard");
    } else {
      router.push("/sign-in?mode=signup");
    }
  };

  return (
    <div className="min-h-screen bg-[#040A0F] text-white selection:bg-[#475569]/30 scroll-smooth">
      {/* HERO SECTION */}
      <AtomicPayHero
        cardHolderName={session?.user?.name ? session.user.name.toUpperCase() : "ANIKET SINGH"}
        cardNumber="0000 0000 0000 0000"
        expiryDate="12/30"
        primaryCtaText="Get started"
        onPrimaryCtaClick={handleGetStarted}
      />

      {/* LANDING SECTIONS */}
      <main className="relative z-10">
        <FeaturesSection />
        <HowItWorksSection />
        <DemoPreview />
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
