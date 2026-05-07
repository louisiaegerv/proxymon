"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"

import {
  Check,
  Crown,
  Zap,
  Sparkles,
  Users,
  Clock,
  Lock,
  Infinity as InfinityIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { PRICING, FOUNDING_TRAINER_TIERS } from "@/lib/pricing"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { TROPHY_MEDIA } from "@/lib/trophy-media"

const freeFeatures = [
  "2 deck slots",
  "60 cards per deck",
  "Unlimited exports",
  "Fast export speed",
  "Session-only storage",
]

const proFeatures = [
  "Unlimited decks",
  "Unlimited cards per deck",
  "High quality exports",
  "Persistent storage + cloud sync",
  "Priority support",
  "All future updates",
]

// Particle component for founding tier cards
function Particles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="animate-float absolute h-1 w-1 rounded-full bg-amber-400/60"
          style={{
            left: `${15 + i * 10}%`,
            bottom: "0%",
            animationDelay: `${i * 0.3}s`,
            animationDuration: `${3 + (i % 3)}s`,
          }}
        />
      ))}
      {[...Array(4)].map((_, i) => (
        <div
          key={`orb-${i}`}
          className="animate-float-slow absolute rounded-full blur-sm"
          style={{
            width: `${6 + i * 3}px`,
            height: `${6 + i * 3}px`,
            left: `${20 + i * 15}%`,
            bottom: "10%",
            background: `radial-gradient(circle, rgba(251,191,36,${0.3 + i * 0.1}) 0%, transparent 70%)`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${4 + (i % 2)}s`,
          }}
        />
      ))}
    </div>
  )
}

interface BackgroundCardProps {
  left?: number | string
  right?: number | string
  top?: number | string
  bottom?: number | string
  baseRotateZ: number
  baseRotateY: number
  brightness: number
  blur?: number
  opacity?: number
  floatDelay: number
  rotateLeftFirst?: boolean
  width?: string
  height?: string
}

function BackgroundCard({
  left,
  right,
  top,
  bottom,
  baseRotateZ,
  baseRotateY,
  brightness,
  blur,
  opacity = 1,
  floatDelay,
  rotateLeftFirst = true,
  width,
  height,
}: BackgroundCardProps) {
  return (
    <motion.div
      className="absolute"
      style={{
        left,
        right,
        top,
        bottom,
        height,
        width,
        rotateZ: baseRotateZ,
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        opacity: { duration: 0.8, ease: "easeOut", delay: floatDelay },
        y: { duration: 0.8, ease: "easeOut", delay: floatDelay },
      }}
    >
      <motion.div
        initial={{ rotateY: baseRotateY }}
        animate={{
          y: [0, 20, 0],
          rotateY: rotateLeftFirst
            ? [baseRotateY - 45, baseRotateY + 45, baseRotateY - 45]
            : [baseRotateY + 45, baseRotateY - 45, baseRotateY + 45],
        }}
        transition={{
          y: {
            repeat: Infinity,
            duration: 7,
            ease: "easeInOut",
          },
          rotateY: {
            repeat: Infinity,
            duration: 12,
            ease: "easeInOut",
          },
        }}
      >
        <div className={cn("h-auto", width || "w-20 md:w-32 lg:w-[45]")}>
          <Image
            src="/cards/pokemon-card-back.webp"
            alt="Pokemon Card Back"
            width={180}
            height={252}
            className="h-auto w-full"
            style={{
              filter: `brightness(${brightness})${blur ? ` blur(${blur}px)` : ""}`,
              opacity,
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ──────────────────────────────────────────────
   Tier data: copy, accent colors, images
   ────────────────────────────────────────────── */

const TIER_META = [
  {
    key: "alpha",
    image: TROPHY_MEDIA.Pikachu1.image,
    accent: {
      name: "Alpha",
      text: "text-amber-300",
      textMuted: "text-amber-400/70",
      border: "border-amber-500/25",
      borderActive: "border-amber-500/40",
      bg: "bg-amber-500/10",
      glowColor: "rgba(245,158,11,0.99)",
      progressFrom: "from-amber-400",
      progressTo: "to-yellow-300",
      buttonBg: "bg-linear-to-r from-amber-500 to-yellow-500",
      buttonHover: "hover:from-amber-400 hover:to-yellow-400",
      badgeBg: "bg-amber-500",
      badgeText: "text-black",
    },
    copy: [
      "Only 100 will ever exist.",
      "Founding number permanently displayed in your profile.",
      'Exclusive "Founding Trainer Pikachu" card saved to your Trophy Case.',
      "The lowest price. The highest status.",
    ],
    savingsPct: 41,
  },
  {
    key: "beta",
    image: TROPHY_MEDIA.Lugia.image,
    accent: {
      name: "Beta",
      text: "text-slate-200",
      textMuted: "text-slate-400/70",
      border: "border-slate-400/20",
      borderActive: "border-slate-300/40",
      bg: "bg-slate-400/10",
      glowColor: "rgba(148,163,184,0.40)",
      progressFrom: "from-slate-300",
      progressTo: "to-slate-100",
      buttonBg: "bg-linear-to-r from-slate-400 to-slate-300",
      buttonHover: "hover:from-slate-300 hover:to-slate-200",
      badgeBg: "bg-slate-400",
      badgeText: "text-slate-950",
    },
    copy: [
      "150 spots for the early believers.",
      "Same lifetime Champion access.",
      "Seals shut the moment Alpha sells out.",
    ],
    savingsPct: 29,
  },
  {
    key: "gamma",
    image: TROPHY_MEDIA.Charizard.image,
    accent: {
      name: "Gamma",
      text: "text-orange-300",
      textMuted: "text-orange-400/70",
      border: "border-orange-600/20",
      borderActive: "border-orange-500/40",
      bg: "bg-orange-600/10",
      glowColor: "rgba(234,88,12,0.30)",
      progressFrom: "from-orange-400",
      progressTo: "to-amber-300",
      buttonBg: "bg-linear-to-r from-orange-600 to-amber-600",
      buttonHover: "hover:from-orange-500 hover:to-amber-500",
      badgeBg: "bg-orange-600",
      badgeText: "text-white",
    },
    copy: [
      "This is it. The final wave. 250 spots.",
      "Your last chance at a founding number.",
      "Still 20% less than Lifetime. Still forever.",
    ],
    savingsPct: 20,
  },
] as const

interface FoundingTierRowProps {
  tier: (typeof FOUNDING_TRAINER_TIERS)[number]
  stats: { sold: number; limit: number }
  isActive: boolean
  isSoldOut: boolean
  tierIndex: number
}

function FoundingTierRow({
  tier,
  stats,
  isActive,
  isSoldOut,
  tierIndex,
}: FoundingTierRowProps) {
  const meta = TIER_META[tierIndex]
  const a = meta.accent
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const sold = stats.sold
  const remaining = stats.limit - sold
  const nextNumber = Math.min(sold + 1, stats.limit)
  const pctClaimed = (sold / stats.limit) * 100

  const isLocked = !isActive && !isSoldOut

  return (
    <motion.div
      className={cn(
        "relative flex flex-col items-center gap-8 md:flex-row md:items-stretch md:gap-10 lg:gap-16",
        isSoldOut && "opacity-40 grayscale"
      )}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: isSoldOut ? 0.4 : 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* ─── Metal Card (left on desktop, top on mobile) ─── */}
      <div className="relative flex shrink-0 justify-center md:w-[42%] md:items-center md:justify-end md:self-stretch">
        <div className="relative aspect-[5/7] h-[70dvh] w-fit md:h-[80%] lg:h-full">
          {/* Particles */}
          {isActive && (
            <div className="pointer-events-none absolute inset-0 z-[30] overflow-hidden">
              <Particles />
            </div>
          )}

          {/* Card Image with 3D tilt */}
          <div
            className="relative z-10 h-full w-full"
            style={{ perspective: 600 }}
          >
            <motion.div
              className="relative h-full w-full"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = (e.clientX - rect.left) / rect.width - 0.5
                const y = (e.clientY - rect.top) / rect.height - 0.5
                setTilt({ x: y * -12, y: x * 12 })
              }}
              onMouseLeave={() => setTilt({ x: 0, y: 0 })}
              animate={{ rotateX: tilt.x, rotateY: tilt.y }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <Image
                src={meta.image}
                alt={tier.name}
                fill
                className="object-contain"
                priority
              />
              {isLocked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[30px] bg-black/40 backdrop-blur-[0px]">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/80 ring-2 ring-slate-600/50">
                    <Lock className="h-8 w-8 text-slate-400" />
                  </div>
                  <span className="mt-3 text-sm font-bold tracking-widest text-slate-400 uppercase text-shadow-[0px_1px_1px_rgba(0,0,0,0.9)]">
                    Locked
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* ─── Pitch Panel (right on desktop, below on mobile) ─── */}
      <div className="flex w-full flex-col md:flex-1">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border backdrop-blur-md",
            "bg-black/25 p-6 sm:p-8 lg:p-10",
            isActive ? a.borderActive : "border-white/10"
          )}
        >
          {/* Subtle accent tint */}
          <div className={cn("absolute inset-0 opacity-20", a.bg)} />

          {/* Content */}
          <div className="relative z-10 flex flex-col gap-5">
            {/* Header row: status badge + tier name */}
            <div className="flex flex-wrap items-center gap-3">
              {isActive && (
                <Badge
                  className={cn(
                    "px-3 py-1 text-xs font-bold",
                    a.badgeBg,
                    a.badgeText
                  )}
                >
                  <Clock className="mr-1.5 h-3 w-3" />
                  Open Now
                </Badge>
              )}
              {isSoldOut && (
                <Badge
                  variant="secondary"
                  className="bg-slate-800 px-3 py-1 text-xs text-slate-400"
                >
                  Sold Out
                </Badge>
              )}
              {isLocked && (
                <Badge
                  variant="outline"
                  className="border-slate-600 px-3 py-1 text-xs text-slate-400"
                >
                  <Lock className="mr-1 h-3 w-3" />
                  Locked
                </Badge>
              )}
            </div>

            {/* Tier title */}
            <h2
              className={cn(
                "font-cinzel text-3xl font-bold tracking-tight sm:text-4xl",
                a.text
              )}
            >
              {tier.name}
            </h2>

            {/* Price block */}
            <div className="flex items-baseline gap-4">
              <span className={cn("text-5xl font-extrabold", a.text)}>
                ${tier.price}
              </span>
              <span className="text-xl text-slate-500 line-through">
                ${PRICING.lifetime.price}
              </span>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-bold",
                  a.bg,
                  a.text
                )}
              >
                Save {meta.savingsPct}%
              </span>
            </div>

            {/* Emotional exclusivity copy */}
            <div className="space-y-1.5">
              {meta.copy.map((line, i) => (
                <p
                  key={i}
                  className="text-base leading-relaxed text-slate-300 sm:text-lg"
                >
                  {line}
                </p>
              ))}
            </div>

            {/* Serial motif */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-md border px-2.5 py-1 font-mono text-xs font-bold tracking-wider",
                  isSoldOut
                    ? "border-slate-700 text-slate-500"
                    : cn(a.border, a.textMuted)
                )}
              >
                {isSoldOut
                  ? "SOLD OUT"
                  : `No. ${String(nextNumber).padStart(3, "0")} of ${stats.limit}`}
              </span>
              <span className="text-xs text-slate-500">
                {sold} claimed · {remaining} left
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/80">
                <motion.div
                  className={cn(
                    "h-full rounded-full bg-linear-to-r",
                    isActive
                      ? `${a.progressFrom} ${a.progressTo}`
                      : "from-slate-700 to-slate-600"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${pctClaimed}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* CTA */}
            <div className="pt-2">
              {isActive ? (
                <Button
                  size="lg"
                  className={cn(
                    "w-full py-6 text-base font-bold tracking-wide sm:w-auto sm:px-12",
                    a.buttonBg,
                    a.buttonHover,
                    "text-black shadow-lg transition-all"
                  )}
                >
                  Claim Your Spot
                </Button>
              ) : (
                <Button
                  size="lg"
                  disabled
                  variant="outline"
                  className="w-full cursor-not-allowed border-slate-700 py-6 text-base font-bold tracking-wide text-slate-500 sm:w-auto sm:px-12"
                >
                  {isSoldOut ? "Sold Out" : "Locked"}
                </Button>
              )}
            </div>

            {/* Champion indicator */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Crown className="h-3.5 w-3.5" />
              <span>Includes all Champion tier features</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function PricingPage() {
  const [foundingStats, setFoundingStats] = useState({
    alpha: { sold: 0, limit: 100 },
    beta: { sold: 0, limit: 150 },
    gamma: { sold: 0, limit: 250 },
  })

  useEffect(() => {
    fetch("/api/pricing/founding-stats")
      .then((res) => res.json())
      .then(setFoundingStats)
      .catch(console.error)
  }, [])

  const totalSold =
    foundingStats.alpha.sold +
    foundingStats.beta.sold +
    foundingStats.gamma.sold
  const totalRemaining = 500 - totalSold

  const getTierStatus = (tierName: string) => {
    if (tierName.includes("α") || tierName.includes("Alpha")) {
      if (foundingStats.alpha.sold >= 100) return "sold-out"
      return foundingStats.alpha.sold > 0 ? "active" : "locked"
    }
    if (tierName.includes("β") || tierName.includes("Beta")) {
      if (foundingStats.beta.sold >= 150) return "sold-out"
      if (foundingStats.alpha.sold >= 100) return "active"
      return "locked"
    }
    if (tierName.includes("γ") || tierName.includes("Gamma")) {
      if (foundingStats.gamma.sold >= 250) return "sold-out"
      if (foundingStats.beta.sold >= 150) return "active"
      return "locked"
    }
    return "locked"
  }

  const getTierIndex = (tierName: string) => {
    if (tierName.includes("α") || tierName.includes("Alpha")) return 0
    if (tierName.includes("β") || tierName.includes("Beta")) return 1
    return 2
  }

  return (
    <div className="relative min-h-screen overflow-hidden p-6 md:p-10">
      {/* blurred background layer */}
      <div
        className="pointer-events-none fixed inset-0 -z-20 bg-cover bg-fixed bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg-space.webp')" }}
      />

      {/* Background floating cards — hover + gentle Y rotation only */}
      <div className="cards-container fixed inset-0">
        {/* Top left */}
        <BackgroundCard
          top="8%"
          left="6%"
          baseRotateZ={-8}
          baseRotateY={0}
          brightness={0.6}
          blur={2}
          opacity={0.6}
          floatDelay={0}
          rotateLeftFirst={true}
          width="w-14 md:w-20 lg:w-24"
        />
        {/* Top right */}
        <BackgroundCard
          top="4%"
          right="8%"
          baseRotateZ={10}
          baseRotateY={-20}
          brightness={0.6}
          blur={2}
          opacity={0.65}
          floatDelay={0}
          rotateLeftFirst={false}
          width="w-14 md:w-20 lg:w-28"
        />
        {/* Bottom left */}
        <BackgroundCard
          bottom="12%"
          left="3%"
          baseRotateZ={-32}
          baseRotateY={20}
          brightness={0.75}
          opacity={1}
          floatDelay={0}
          rotateLeftFirst={true}
          width="w-20 md:w-32 lg:w-44"
        />
        {/* Bottom right */}
        <BackgroundCard
          bottom="6%"
          right="4%"
          baseRotateZ={14}
          baseRotateY={0}
          opacity={1}
          brightness={0.75}
          floatDelay={0}
          rotateLeftFirst={false}
          width="w-20 md:w-32 lg:w-40"
        />
      </div>

      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-transparent to-black/20" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <Link
            href="/"
            className="absolute top-0 left-0 text-sm text-slate-400 transition-colors hover:text-slate-200"
          >
            ← Back
          </Link>

          <Badge
            variant="secondary"
            className="mb-8 bg-gradient-to-r from-amber-500 to-yellow-400 px-4 py-1.5 text-sm font-bold text-black"
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            Limited Launch Pricing
          </Badge>

          <h1 className="text-4xl font-bold text-slate-100 drop-shadow-xs/90 md:text-5xl">
            Choose Your{" "}
            <span className="bg-linear-to-r from-amber-400 via-yellow-500 to-amber-400 bg-clip-text text-transparent">
              Trainer Tier
            </span>
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-slate-300 drop-shadow-xs/90 text-shadow-lg">
            Join the first 500 founding trainers and secure{" "}
            <strong className="text-slate-200">lifetime Champion access</strong>{" "}
            at exclusive launch prices. Your founding number will be displayed
            forever.
          </p>
        </div>

        {/* Global Scarcity Banner */}
        <Card className="mb-16 rounded-2xl border border-white/10 bg-slate-950/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-lg lg:mb-20">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-amber-500" />
                <div>
                  <div className="font-semibold text-slate-100">
                    Founding Trainer Spots
                  </div>
                  <div className="text-sm text-slate-400">
                    Only 500 will ever exist
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-amber-400">
                  {totalRemaining}
                </div>
                <div className="text-sm text-slate-400">remaining</div>
              </div>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-linear-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                style={{ width: `${(totalSold / 500) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Founding Tiers — Showcase + Pitch rows */}
        <div className="mb-20 space-y-16 md:space-y-20 lg:space-y-28">
          {FOUNDING_TRAINER_TIERS.map((tier) => {
            const stats = tier.name.includes("α")
              ? foundingStats.alpha
              : tier.name.includes("β")
                ? foundingStats.beta
                : foundingStats.gamma
            const status = getTierStatus(tier.name)
            const isActive = status === "active"
            const isSoldOut = status === "sold-out"
            const tierIndex = getTierIndex(tier.name)

            return (
              <FoundingTierRow
                key={tier.name}
                tier={tier}
                stats={stats}
                isActive={isActive}
                isSoldOut={isSoldOut}
                tierIndex={tierIndex}
              />
            )
          })}
        </div>

        {/* ─── Section Break: Standard Pricing ─── */}
        <div className="relative my-20 flex items-center gap-6 md:my-24">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-100/50 to-transparent" />
          <div className="flex flex-col items-center gap-2 text-lg text-slate-200 text-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
            <div className="flex items-center gap-2">
              <InfinityIcon className="h-5 w-5" />
              <span className="font-semibold tracking-widest uppercase">
                Standard Pricing
              </span>
              <InfinityIcon className="h-5 w-5" />
            </div>
            <p className="max-w-md text-center text-sm text-slate-300 md:text-lg">
              After the founding tiers sell out, these plans will always be
              available. No scarcity — just solid value.
            </p>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-100/50 to-transparent" />
        </div>

        {/* Regular Pricing - Glass-Neumorphic */}
        <div className="mx-auto mb-12 grid max-w-3xl gap-6 md:grid-cols-2">
          {/* Annual */}
          <Card className="rounded-2xl border border-white/10 bg-slate-950/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-lg">
            <CardHeader className="text-center">
              <div className="relative mx-auto mb-3 aspect-[63/88] w-32 overflow-hidden rounded-lg">
                <Image
                  src={TROPHY_MEDIA.Tyranitar.image}
                  alt="Gym Leader Trophy"
                  fill
                  className="object-contain"
                  sizes="128px"
                />
              </div>
              <div className="mb-2 flex items-center justify-center gap-2">
                <Zap className="h-5 w-5 text-blue-400" />
                <h2 className="text-xl font-semibold text-slate-100">
                  Gym Leader
                </h2>
              </div>
              <p className="text-sm text-slate-400">Season Pass</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-slate-100">
                  ${PRICING.annual.price}
                </span>
                <span className="text-slate-500">/year</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">~$1.58/month</p>
            </CardHeader>
            <CardContent>
              <ul className="mb-6 space-y-2">
                {proFeatures.slice(0, 4).map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-slate-300"
                  >
                    <Check className="h-4 w-4 text-blue-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full border-slate-600 hover:bg-slate-800"
              >
                Choose Annual
              </Button>
            </CardContent>
          </Card>

          {/* Lifetime */}
          <Card className="rounded-2xl border border-white/10 bg-slate-950/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-lg">
            <CardHeader className="text-center">
              <div className="relative mx-auto mb-3 aspect-[63/88] w-32 overflow-hidden rounded-lg">
                <Image
                  src={TROPHY_MEDIA.Rayquaza.image}
                  alt="Champion Trophy"
                  fill
                  className="object-contain"
                  sizes="128px"
                />
              </div>
              <div className="mb-2 flex items-center justify-center gap-2">
                <Crown className="h-5 w-5 text-amber-400" />
                <h2 className="text-xl font-semibold text-slate-100">
                  Champion
                </h2>
              </div>
              <p className="text-sm text-slate-400">Lifetime</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-slate-100">
                  ${PRICING.lifetime.price}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Pay once, own forever
              </p>
            </CardHeader>
            <CardContent>
              <ul className="mb-6 space-y-2">
                {proFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-slate-300"
                  >
                    <Check className="h-4 w-4 text-amber-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full border-slate-600 hover:bg-slate-800"
              >
                Choose Lifetime
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Free Comparison */}
        <Card className="mx-auto max-w-md rounded-2xl border border-white/10 bg-slate-950/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-lg">
          <CardHeader className="text-center">
            <h2 className="text-lg font-semibold text-slate-100">Free</h2>
            <div className="text-3xl font-bold text-slate-100">$0</div>
          </CardHeader>
          <CardContent>
            <ul className="mb-4 space-y-2">
              {freeFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-slate-400"
                >
                  <Check className="h-4 w-4 text-slate-600" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link href="/">
              <Button
                variant="ghost"
                className="w-full text-slate-400 hover:text-slate-200"
              >
                Continue with Free
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* FAQ */}
        <div className="mx-auto mt-16 max-w-2xl">
          <h3 className="mb-6 text-center text-lg font-semibold text-slate-100">
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-lg">
              <h4 className="font-medium text-slate-100">
                What&apos;s a Founding Trainer?
              </h4>
              <p className="mt-1 text-sm text-slate-400">
                The first 500 users to support Proxidex get{" "}
                <strong className="text-slate-200">
                  lifetime Champion access
                </strong>{" "}
                at exclusive prices. Your founding number (e.g., #29) is
                displayed forever on your profile.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-lg">
              <h4 className="font-medium text-slate-100">
                What do Founding Trainers get?
              </h4>
              <p className="mt-1 text-sm text-slate-400">
                Founding Trainers receive{" "}
                <strong className="text-slate-200">
                  all Champion tier benefits
                </strong>
                : unlimited decks, unlimited cards, high quality exports, cloud
                storage, priority support, and all future updates. Plus a
                special Founding Trainer badge with your unique number!
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-lg">
              <h4 className="font-medium text-slate-100">
                What happens when founding tiers sell out?
              </h4>
              <p className="mt-1 text-sm text-slate-400">
                Each tier unlocks when the previous sells out. Once all 500
                spots are gone, only Annual ($19/yr) and Lifetime ($49) options
                remain.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-lg">
              <h4 className="font-medium text-slate-100">
                Can I upgrade later?
              </h4>
              <p className="mt-1 text-sm text-slate-400">
                Yes! You can upgrade from Free to any tier at any time. Founding
                spots are limited, so &quot;catch &apos;em&quot; while you still
                can!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
