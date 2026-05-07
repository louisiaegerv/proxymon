"use client"

import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RARITY_CONFIG, type TrophyDefinition } from "@/lib/trophies"
import { cn } from "@/lib/utils"
import { Link2, Twitter, Check, Calendar, Lock, Trophy, Film, ImageIcon, Sparkles } from "lucide-react"
import { useState, useRef, useEffect } from "react"

interface TrophyDetailModalProps {
  trophy: TrophyDefinition | null
  isUnlocked: boolean
  unlockedAt: string | null
  progress: number
  progressTarget: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getShareText(trophy: TrophyDefinition, isUnlocked: boolean): string {
  if (isUnlocked) {
    return `I just unlocked the "${trophy.name}" trophy on Proxidex! ${trophy.description}`
  }
  return `I'm working toward unlocking the "${trophy.name}" trophy on Proxidex. ${trophy.description}`
}

function getShareUrl(trophyId: string): string {
  return `https://app.proxidex.com/trophies/share/${trophyId}`
}

function TrophyDetailMedia({
  trophy,
  isUnlocked,
  open,
  showVideo,
}: {
  trophy: TrophyDefinition
  isUnlocked: boolean
  open: boolean
  showVideo: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const hasVideo = isUnlocked && trophy.video

  useEffect(() => {
    if (!open || !videoRef.current) return
    if (hasVideo && showVideo) {
      videoRef.current.play().catch(() => {})
    }
  }, [open, hasVideo, showVideo])

  useEffect(() => {
    if (!videoRef.current) return
    if (!showVideo) {
      videoRef.current.pause()
    } else if (videoLoaded) {
      videoRef.current.play().catch(() => {})
    }
  }, [showVideo, videoLoaded])

  if (!isUnlocked) {
    return (
      <div className="relative flex h-full w-full items-center justify-center rounded-2xl bg-slate-800/40 ring-1 ring-white/5">
        <div className="relative flex h-4/5 w-4/5 items-center justify-center opacity-15">
          <Image
            src={trophy.image}
            alt="?"
            fill
            unoptimized
            className="object-contain grayscale"
            sizes="480px"
          />
          <div className="absolute inset-0 bg-slate-950/80" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/80 ring-1 ring-slate-600/40">
            <Lock className="h-6 w-6 text-slate-500" />
          </div>
          <span className="text-xs font-medium tracking-wider text-slate-500 uppercase">
            Locked
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl ring-1 ring-white/5">
      {/* Ambient glow behind card */}
      <div
        className="absolute -inset-8 opacity-20 blur-3xl"
        style={{
          background: `radial-gradient(ellipse at center, ${RARITY_CONFIG[trophy.rarity].glowColor} 0%, transparent 60%)`,
        }}
      />

      {/* Static image */}
      <Image
        src={trophy.image}
        alt={trophy.name}
        fill
        unoptimized
        className={cn(
          "relative z-10 object-contain transition-opacity duration-500",
          hasVideo && showVideo && videoLoaded ? "opacity-0" : "opacity-100"
        )}
        sizes="480px"
        priority
      />

      {/* Detail video */}
      {hasVideo && (
        <video
          ref={videoRef}
          src={trophy.video!.detail}
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={() => setVideoLoaded(true)}
          className={cn(
            "absolute inset-0 z-10 h-full w-full object-contain transition-opacity duration-500",
            showVideo && videoLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  )
}

export function TrophyDetailModal({
  trophy,
  isUnlocked,
  unlockedAt,
  progress,
  progressTarget,
  open,
  onOpenChange,
}: TrophyDetailModalProps) {
  const [copied, setCopied] = useState(false)
  const [showVideo, setShowVideo] = useState(true)
  const hasVideo = isUnlocked && !!trophy?.video

  if (!trophy) return null

  const config = RARITY_CONFIG[trophy.rarity]
  const shareText = getShareText(trophy, isUnlocked)
  const shareUrl = getShareUrl(trophy.id)
  const fullShareMessage = `${shareText}\n\n${shareUrl}`

  const twitterIntentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullShareMessage)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Silently fail
    }
  }

  const unlockedDate = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl gap-0 overflow-hidden border-slate-700/40 bg-slate-950 p-0 text-slate-100 md:max-w-6xl">
        <DialogTitle className="sr-only">{trophy.name}</DialogTitle>
        <div className="flex flex-col md:flex-row">
          {/* ─── Left: Large Card Image / Video ─── */}
          <div className="relative flex items-center justify-center bg-gradient-to-b from-slate-900/50 to-slate-950 p-6 md:w-[55%] md:p-8">
            {/* Subtle bg pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, ${config.color} 1px, transparent 0)`,
                backgroundSize: "24px 24px",
              }}
            />

            <div className="relative aspect-[63/88] w-full max-w-[740px]">
              <TrophyDetailMedia
                trophy={trophy}
                isUnlocked={isUnlocked}
                open={open}
                showVideo={showVideo}
              />

              {/* Rarity badge - top right */}
              <div
                className="absolute top-3 right-3 z-20 rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase"
                style={{
                  background: `${config.color}25`,
                  color: config.color,
                  border: `1px solid ${config.color}40`,
                  backdropFilter: "blur(8px)",
                }}
              >
                {config.label}
              </div>

              {/* Video toggle - bottom right */}
              {hasVideo && (
                <button
                  onClick={() => setShowVideo((v) => !v)}
                  className="absolute right-3 bottom-3 z-20 flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-[11px] font-medium text-slate-300 backdrop-blur-md transition-colors hover:bg-slate-900 hover:text-slate-100"
                  title={showVideo ? "Show static image" : "Show animated video"}
                >
                  {showVideo ? (
                    <>
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>Image</span>
                    </>
                  ) : (
                    <>
                      <Film className="h-3.5 w-3.5" />
                      <span>Video</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* ─── Right: Metadata Panel ─── */}
          <div className="flex flex-col justify-between border-t border-white/5 md:w-[45%] md:border-t-0 md:border-l">
            <div className="p-6 md:p-8">
              {/* Header */}
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles
                    className="h-4 w-4"
                    style={{ color: config.color }}
                  />
                  <span
                    className="text-[11px] font-bold tracking-widest uppercase"
                    style={{ color: config.color }}
                  >
                    {trophy.category === "tier" ? "Tier Trophy" : "Achievement"}
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-slate-100 md:text-3xl">
                  {trophy.name}
                </h2>

                {/* Unlock status */}
                {isUnlocked && unlockedDate ? (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Unlocked {unlockedDate}</span>
                  </div>
                ) : !isUnlocked ? (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Locked</span>
                  </div>
                ) : null}
              </div>

              {/* Description */}
              <p className="mb-6 text-sm leading-relaxed text-slate-300">
                {trophy.description}
              </p>

              {/* Condition / Progress */}
              <div className="mb-6 space-y-4">
                {!isUnlocked ? (
                  <div className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-white/5">
                    <p className="mb-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                      How to unlock
                    </p>
                    <p className="text-sm text-slate-300">{trophy.condition}</p>

                    {progress > 0 && progress < progressTarget && (
                      <div className="mt-3">
                        <div className="mb-1.5 flex justify-between text-[11px] text-slate-400">
                          <span>Progress</span>
                          <span>
                            {progress} / {progressTarget}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (progress / progressTarget) * 100)}%`,
                              backgroundColor: config.color,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-3 rounded-xl p-4 ring-1"
                    style={{
                      background: `${config.color}08`,
                      borderColor: `${config.color}20`,
                    }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `${config.color}15` }}
                    >
                      <Trophy
                        className="h-4 w-4"
                        style={{ color: config.color }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        Trophy Unlocked
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {trophy.condition}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Share section - bottom sticky */}
            <div className="border-t border-white/5 p-6 md:p-8">
              <p className="mb-3 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                Share your trophy
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "flex-1 gap-2 border-slate-700/60 bg-slate-900/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800/60 hover:text-slate-100",
                    copied && "border-green-700/40 text-green-400"
                  )}
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Link2 className="h-3.5 w-3.5" />
                      Copy Link
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2 border-slate-700/60 bg-slate-900/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800/60 hover:text-slate-100"
                  onClick={() => window.open(twitterIntentUrl, "_blank")}
                >
                  <Twitter className="h-3.5 w-3.5" />
                  Share on X
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
