"use client";

import React from "react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { 
  ShieldCheck, 
  Database, 
  Zap, 
  Lock, 
  Check
} from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: ShieldCheck,
      title: "Atomic Transfers",
      description:
        "Debit and credit operations execute inside an indivisible database transaction. If any check or constraint fails, the entire transfer rolls back instantly.",
      points: [
        "All-or-nothing execution",
        "Zero risk of orphaned balances",
        "Instant automatic rollback",
      ],
    },
    {
      icon: Database,
      title: "Consistent Ledger",
      description:
        "Account rows are locked in strict, deterministic UUID order before funds move. Even under peak reciprocal concurrency, deadlocks are mathematically impossible.",
      points: [
        "Deterministic row-level locking",
        "Deadlock-free concurrency",
        "Strict balance conservation",
      ],
    },
    {
      icon: Zap,
      title: "Real-time Updates",
      description:
        "Server-Sent Events push balance changes to active client dashboards the microsecond a ledger row commits. Instant updates without battery-draining polling.",
      points: [
        "Sub-millisecond event push",
        "Lightweight persistent SSE stream",
        "Zero client polling overhead",
      ],
    },
    {
      icon: Lock,
      title: "Built for Trust",
      description:
        "Every transfer requires an enforced unique idempotency key with replay defense. Network timeouts, retries, or accidental double taps never charge twice.",
      points: [
        "Enforced idempotency keys",
        "Automated replay protection",
        "Tamper-evident audit trail",
      ],
    },
  ];

  return (
    <section
      id="features"
      className="py-20 sm:py-28 bg-[#040A0F] text-white relative z-20 font-sans select-none overflow-hidden"
    >
      {/* ── Left Edge Ambient Highlight ── */}
      <div 
        className="absolute top-[18%] -left-[12%] w-[38%] h-[68%] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle at 20% 50%, rgba(101, 137, 182, 0.11) 0%, rgba(49, 70, 98, 0.04) 50%, transparent 70%)",
          filter: "blur(50px)",
        }}
        aria-hidden="true"
      />

      {/* ── Right Edge Ambient Highlight ── */}
      <div 
        className="absolute top-[18%] -right-[12%] w-[38%] h-[68%] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle at 80% 50%, rgba(101, 137, 182, 0.11) 0%, rgba(49, 70, 98, 0.04) 50%, transparent 70%)",
          filter: "blur(50px)",
        }}
        aria-hidden="true"
      />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        
        {/* ── Section Header with Flanked Side Highlight Lines ── */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <div className="flex items-center justify-center gap-3.5 mb-3.5">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-white/25" />
            <p className="text-[11px] sm:text-xs font-mono font-semibold uppercase tracking-[0.25em] text-slate-400">
              WHY ATOMICPAY
            </p>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-white/25" />
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-[44px] font-bold tracking-tight text-white leading-[1.15] mb-4">
            Transfers that stay correct,<br className="hidden sm:inline" />{" "}
            <span className="text-[#48566A]">
              even under concurrency.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-400 font-normal leading-relaxed max-w-2xl mx-auto">
            Traditional ledgers crack when concurrent requests mutate the same balance at the exact same millisecond. 
            AtomicPay enforces database-level ACID guarantees, ordered row locks, and idempotent execution.
          </p>
        </div>

        {/* ── 4 Feature Cards (Compact, Icon Beside Heading) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <SpotlightCard key={idx}>
                <div>
                  {/* Top Row: Icon Beside Title */}
                  <div className="flex items-center gap-3.5 mb-3.5">
                    <div
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-white shrink-0 transition-all duration-300 group-hover:scale-105"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        boxShadow:
                          "0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      <Icon className="w-5 h-5 text-white/90 stroke-[2]" />
                    </div>

                    <h3 className="text-base sm:text-[17px] font-bold text-white tracking-tight leading-tight group-hover:text-white transition-colors">
                      {feature.title}
                    </h3>
                  </div>
                  
                  {/* Description */}
                  <p className="text-xs sm:text-[13px] text-slate-400 font-normal leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Clean Feature Highlights */}
                <div className="mt-5 pt-4 border-t border-white/[0.07] space-y-2">
                  {feature.points.map((pt, pIdx) => (
                    <div
                      key={pIdx}
                      className="flex items-center gap-2 text-[12px] text-slate-300/85"
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 text-white/80 stroke-[2.5]" />
                      </div>
                      <span className="font-medium tracking-tight">{pt}</span>
                    </div>
                  ))}
                </div>
              </SpotlightCard>
            );
          })}
        </div>

      </div>
    </section>
  );
}
