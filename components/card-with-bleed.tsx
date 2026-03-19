"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"

// Global cache for processed bleed images to avoid reprocessing
const bleedImageCache = new Map<string, string>()

export type BleedMethod = "replicate" | "mirror" | "edge"

export interface CardWithBleedProps {
  imageUrl: string
  name?: string
  bleedMm?: number
  method?: BleedMethod
  showTrimLines?: boolean
  className?: string
  onBleedGenerated?: (bleedImageUrl: string) => void
  // Optional pre-generated bleed image (from API)
  bleedImageUrl?: string
  // Optional color for replicate method
  bleedColor?: { r: number; g: number; b: number }
  // DPI for rendering (default 300 for print, use 96 for screen preview)
  dpi?: number
  // Fill parent container instead of setting explicit mm dimensions
  // Use when parent already accounts for bleed area sizing
  fillParent?: boolean
  // Card dimensions in mm (defaults to standard Pokemon card size: 63mm x 88mm)
  cardWidth?: number
  cardHeight?: number
}

/**
 * CardWithBleed Component
 *
 * Displays a card with proper bleed extension. The card content (63mm×88mm)
 * remains at original size, while the bleed area extends outward.
 *
 * Layout:
 * - Container: 63mm × 88mm (trim size)
 * - Canvas: (63 + 2×bleed)mm × (88 + 2×bleed)mm
 * - Canvas is positioned absolutely with negative margins to extend outward
 */
export function CardWithBleed({
  imageUrl,
  name = "Card",
  bleedMm = 0,
  method = "replicate",
  showTrimLines = true,
  className,
  onBleedGenerated,
  bleedImageUrl,
  bleedColor,
  dpi = 300,
  fillParent = false,
  cardWidth = 63,
  cardHeight = 88,
}: CardWithBleedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedBleedUrl, setGeneratedBleedUrl] = useState<
    string | undefined
  >(bleedImageUrl)

  // Use provided dimensions or defaults (standard Pokemon card: 63mm x 88mm)
  const cardWidthMm = cardWidth
  const cardHeightMm = cardHeight

  // Calculate dimensions in pixels at specified DPI
  const mmToPx = (mm: number) => (mm * dpi) / 25.4
  const cardWidthPx = mmToPx(cardWidthMm)
  const cardHeightPx = mmToPx(cardHeightMm)
  const bleedPx = mmToPx(bleedMm)

  // Canvas dimensions (includes bleed on all sides)
  const canvasWidthPx = cardWidthPx + bleedPx * 2
  const canvasHeightPx = cardHeightPx + bleedPx * 2

  // Generate bleed via API with caching
  const generateBleed = useCallback(async () => {
    if (bleedMm === 0 || bleedImageUrl) {
      setGeneratedBleedUrl(bleedImageUrl)
      return
    }

    // Create cache key from all parameters that affect the output
    const cacheKey = `${imageUrl}|${method}|${bleedMm}|${bleedColor?.r ?? "auto"}|${bleedColor?.g ?? "auto"}|${bleedColor?.b ?? "auto"}`

    // Check cache first
    if (bleedImageCache.has(cacheKey)) {
      const cached = bleedImageCache.get(cacheKey)!
      setGeneratedBleedUrl(cached)
      onBleedGenerated?.(cached)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const body: {
        imageUrl: string
        method: BleedMethod
        bleedMm: number
        colorR?: number
        colorG?: number
        colorB?: number
      } = {
        imageUrl,
        method,
        bleedMm,
      }

      // Include color for replicate method
      if (method === "replicate" && bleedColor) {
        body.colorR = bleedColor.r
        body.colorG = bleedColor.g
        body.colorB = bleedColor.b
      }

      const response = await fetch("/api/generate-bleed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate bleed")
      }

      const data = await response.json()
      // Store in cache
      bleedImageCache.set(cacheKey, data.image)
      setGeneratedBleedUrl(data.image)
      onBleedGenerated?.(data.image)
    } catch (err) {
      console.error("Error generating bleed:", err)
      setError(err instanceof Error ? err.message : "Failed to generate bleed")
    } finally {
      setIsLoading(false)
    }
  }, [imageUrl, method, bleedMm, bleedImageUrl, onBleedGenerated, bleedColor])

  // Draw the card on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = canvasWidthPx
    canvas.height = canvasHeightPx

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const draw = async () => {
      try {
        // Load the image (either original or with bleed)
        const img = new Image()
        img.crossOrigin = "anonymous"

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error("Failed to load image"))
          img.src = generatedBleedUrl || imageUrl
        })

        // Draw the image to fill the canvas
        // The image from API is at 300 DPI, canvas might be at different DPI
        // Scale to fit canvas dimensions
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Draw trim lines if enabled
        if (showTrimLines && bleedMm > 0) {
          ctx.strokeStyle = "rgba(239, 68, 68, 0.8)" // Red-500 with opacity
          ctx.lineWidth = 1
          ctx.setLineDash([4, 4])

          // Top trim line
          ctx.beginPath()
          ctx.moveTo(0, bleedPx)
          ctx.lineTo(canvasWidthPx, bleedPx)
          ctx.stroke()

          // Bottom trim line
          ctx.beginPath()
          ctx.moveTo(0, canvasHeightPx - bleedPx)
          ctx.lineTo(canvasWidthPx, canvasHeightPx - bleedPx)
          ctx.stroke()

          // Left trim line
          ctx.beginPath()
          ctx.moveTo(bleedPx, 0)
          ctx.lineTo(bleedPx, canvasHeightPx)
          ctx.stroke()

          // Right trim line
          ctx.beginPath()
          ctx.moveTo(canvasWidthPx - bleedPx, 0)
          ctx.lineTo(canvasWidthPx - bleedPx, canvasHeightPx)
          ctx.stroke()

          // Reset line dash
          ctx.setLineDash([])

          // Add "TRIM" labels at corners
          ctx.fillStyle = "rgba(239, 68, 68, 0.9)"
          ctx.font = "bold 10px sans-serif"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"

          // Draw small corner markers
          const markerSize = 8
          const corners = [
            { x: bleedPx, y: bleedPx }, // Top-left
            { x: canvasWidthPx - bleedPx, y: bleedPx }, // Top-right
            { x: bleedPx, y: canvasHeightPx - bleedPx }, // Bottom-left
            { x: canvasWidthPx - bleedPx, y: canvasHeightPx - bleedPx }, // Bottom-right
          ]

          corners.forEach((corner) => {
            ctx.fillRect(corner.x - 1, corner.y - 1, 3, 3)
          })
        }
      } catch (err) {
        console.error("Error drawing card:", err)
        // Draw placeholder
        ctx.fillStyle = "#e2e8f0"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = "#64748b"
        ctx.font = "14px sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(name || "Card", canvas.width / 2, canvas.height / 2)
      }
    }

    draw()
  }, [
    imageUrl,
    generatedBleedUrl,
    bleedMm,
    canvasWidthPx,
    canvasHeightPx,
    bleedPx,
    showTrimLines,
    name,
  ])

  // Generate bleed when dependencies change
  useEffect(() => {
    generateBleed()
  }, [generateBleed])

  // Convert pixel dimensions back to mm for display
  const displayWidthMm = cardWidthMm + bleedMm * 2
  const displayHeightMm = cardHeightMm + bleedMm * 2

  return (
    <div
      className={cn("relative", className)}
      style={
        fillParent
          ? {
              width: "100%",
              height: "100%",
            }
          : {
              width: `${cardWidthMm}mm`,
              height: `${cardHeightMm}mm`,
            }
      }
    >
      {/* Canvas - fills container when fillParent, otherwise extends outward with bleed */}
      <canvas
        ref={canvasRef}
        style={
          fillParent
            ? {
                width: "100%",
                height: "100%",
                left: 0,
                top: 0,
              }
            : {
                width: `${displayWidthMm}mm`,
                height: `${displayHeightMm}mm`,
                left: `-${bleedMm}mm`,
                top: `-${bleedMm}mm`,
              }
        }
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/20 p-2">
          <span className="text-center text-xs text-red-400">{error}</span>
        </div>
      )}
    </div>
  )
}
