"use client"

import { useState, useRef, useEffect } from "react"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import Image from "next/image"
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  RARITY_CONFIG,
  type TrophyDefinition,
  type TrophyRarity,
} from "@/lib/trophies"

interface TrophyCardProps {
  trophy: TrophyDefinition
  isUnlocked: boolean
  unlockedAt?: string | null
  progress?: number
  progressTarget?: number
  onClick?: () => void
}

function RarityParticles({
  rarity,
  isUnlocked,
}: {
  rarity: TrophyRarity
  isUnlocked: boolean
}) {
  const config = RARITY_CONFIG[rarity]
  if (config.particleCount === 0 || !isUnlocked) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(config.particleCount)].map((_, i) => (
        <div
          key={i}
          className="animate-float absolute rounded-full"
          style={{
            width: `${3 + (i % 3)}px`,
            height: `${3 + (i % 3)}px`,
            left: `${10 + (i * 80) / config.particleCount}%`,
            bottom: `${5 + (i % 4) * 20}%`,
            background: `radial-gradient(circle, ${config.color} 0%, transparent 70%)`,
            animationDelay: `${i * 0.4}s`,
            animationDuration: `${2.5 + (i % 3)}s`,
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  )
}

function TiltCard({
  children,
  isUnlocked,
  rarity,
  onClick,
  onHoverChange,
}: {
  children: React.ReactNode
  isUnlocked: boolean
  rarity: TrophyRarity
  onClick?: () => void
  onHoverChange?: (hovered: boolean) => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const config = RARITY_CONFIG[rarity]

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { stiffness: 150, damping: 20, restDelta: 0.001 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [12, -12])
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-12, 12])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !isUnlocked) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(x)
    mouseY.set(y)
  }

  const handleMouseEnter = () => {
    onHoverChange?.(true)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
    onHoverChange?.(false)
  }

  return (
    <motion.div
      ref={cardRef}
      className={cn("relative cursor-pointer", !isUnlocked && "cursor-default")}
      style={{
        perspective: 800,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <motion.div
        className="relative"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        whileHover={isUnlocked ? { scale: 1.05 } : {}}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Glow effect for unlocked rare+ cards */}
        {isUnlocked && config.particleCount > 0 && (
          <div
            className="absolute -inset-2 rounded-xl opacity-40 blur-xl"
            style={{ background: config.glowColor }}
          />
        )}

        {/* Card container */}
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border-2 bg-slate-950/80 backdrop-blur-sm",
            isUnlocked ? config.borderColor : "border-slate-700/30",
            "transition-all duration-300"
          )}
          style={{
            boxShadow: isUnlocked
              ? `0 0 20px ${config.glowColor}, inset 0 1px 1px rgba(255,255,255,0.1)`
              : "none",
          }}
        >
          {children}
        </div>
      </motion.div>
    </motion.div>
  )
}

function TrophyMedia({
  trophy,
  isUnlocked,
  isHovered,
}: {
  trophy: TrophyDefinition
  isUnlocked: boolean
  isHovered: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasVideo = isUnlocked && trophy.video

  useEffect(() => {
    if (!videoRef.current) return
    if (isHovered && hasVideo) {
      videoRef.current.play().catch(() => {
        // Autoplay blocked — image remains visible
      })
    } else {
      videoRef.current.pause()
    }
  }, [isHovered, hasVideo])

  if (!isUnlocked) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center rounded-lg bg-slate-900/50">
        <div className="relative flex h-full w-full items-center justify-center opacity-20">
          <Image
            src={trophy.image}
            alt="?"
            fill
            className="object-contain grayscale blur-[1px]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
          <div className="absolute inset-0 bg-slate-950/70" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Lock className="h-8 w-8 text-slate-500/50" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      {/* Base image — always rendered as fallback */}
      <Image
        src={trophy.image}
        alt={trophy.name}
        fill
        unoptimized
        className={cn(
          "object-contain transition-opacity duration-300",
          hasVideo && isHovered ? "opacity-0" : "opacity-100"
        )}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
      />

      {/* Hover video (thumbnail = 360p) */}
      {hasVideo && (
        <video
          ref={videoRef}
          src={trophy.video!.thumbnail}
          muted
          loop
          playsInline
          preload="metadata"
          className={cn(
            "absolute inset-0 h-full w-full object-contain transition-opacity duration-300",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        />
      )}

      {/* Shine sweep effect on hover */}
      <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    </div>
  )
}

export function TrophyCard({
  trophy,
  isUnlocked,
  unlockedAt,
  progress = 0,
  progressTarget = 1,
  onClick,
}: TrophyCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const config = RARITY_CONFIG[trophy.rarity]

  const handleClick = () => {
    if (onClick) {
      onClick()
      return
    }
    if (!isUnlocked) {
      setShowDetails(!showDetails)
    }
  }

  return (
    <TiltCard
      isUnlocked={isUnlocked}
      rarity={trophy.rarity}
      onClick={handleClick}
      onHoverChange={setIsHovered}
    >
      <div className="relative aspect-[63/88] w-full overflow-hidden rounded-lg">
        {/* Background glow for unlocked */}
        {isUnlocked && (
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `radial-gradient(ellipse at center, ${config.glowColor} 0%, transparent 70%)`,
            }}
          />
        )}

        {/* Card image or silhouette */}
        <div className="relative h-full w-full p-2">
          {isUnlocked ? (
            <div className="relative h-full w-full overflow-hidden rounded-lg">
              <TrophyMedia trophy={trophy} isUnlocked={isUnlocked} isHovered={isHovered} />

              {/* Rarity badge */}
              <div
                className="absolute top-1 right-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase"
                style={{
                  background: `${config.color}30`,
                  color: config.color,
                  border: `1px solid ${config.color}50`,
                }}
              >
                {config.label}
              </div>

              {/* Particles */}
              <RarityParticles rarity={trophy.rarity} isUnlocked={isUnlocked} />
            </div>
          ) : (
            <div className="relative flex h-full w-full flex-col items-center justify-center rounded-lg bg-slate-900/50">
              {/* Silhouette placeholder */}
              <div className="relative flex h-full w-full items-center justify-center opacity-20">
                <Image
                  src={trophy.image}
                  alt="?"
                  fill
                  unoptimized
                  className="object-contain grayscale blur-[1px]"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
                <div className="absolute inset-0 bg-slate-950/70" />
              </div>

              {/* Lock icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="h-8 w-8 text-slate-500/50" />
              </div>

              {/* Progress bar (if in progress) */}
              {progress > 0 && progress < progressTarget && (
                <div className="absolute right-3 bottom-3 left-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{
                        width: `${Math.min(100, (progress / progressTarget) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-center text-[10px] text-slate-400">
                    {progress} / {progressTarget}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card info below image */}
      <div className="border-t border-white/5 p-2">
        <h4
          className={cn(
            "truncate text-xs font-bold",
            isUnlocked ? "text-slate-200" : "text-slate-500"
          )}
        >
          {trophy.name}
        </h4>
        <p className="truncate text-[10px] text-slate-500">
          {trophy.description}
        </p>

        {/* Unlocked date for unlocked cards */}
        {isUnlocked && unlockedAt && (
          <p className="mt-1 text-[9px] text-slate-600">
            Unlocked{" "}
            {new Date(unlockedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      {/* Expanded details (click locked card) */}
      {showDetails && !isUnlocked && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border-t border-white/5 bg-slate-900/50 p-2"
        >
          <p className="text-[10px] text-slate-400">
            <span className="font-semibold text-slate-300">
              How to unlock:{" "}
            </span>
            {trophy.condition}
          </p>
        </motion.div>
      )}
    </TiltCard>
  )
}
