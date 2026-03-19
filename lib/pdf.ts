import { PDFDocument, rgb } from "pdf-lib"
import type { ProxyItem, PrintSettings, BleedMethod } from "@/types"

// Page dimensions in points (72 points = 1 inch)
const PAGE_SIZES = {
  letter: { width: 612, height: 792 },
  a4: { width: 595, height: 842 },
}

const PAGE_DIMS_MM = {
  letter: { width: 216, height: 279 },
  a4: { width: 210, height: 297 },
}

function mmToPoints(mm: number): number {
  return (mm * 72) / 25.4
}

function getFullImageUrl(
  baseUrl: string | undefined,
  quality: "low" | "high" = "high"
): string | undefined {
  if (!baseUrl) return undefined
  return `${baseUrl}/${quality}.png`
}

// Image cache to avoid double-fetching
const imageCache = new Map<string, Uint8Array>()

async function fetchImage(url: string): Promise<Uint8Array | null> {
  try {
    // Check cache first
    if (imageCache.has(url)) {
      return imageCache.get(url)!
    }

    // Handle data URLs
    if (url.startsWith("data:")) {
      const base64Data = url.split(",")[1]
      if (!base64Data) return null
      const buffer = Buffer.from(base64Data, "base64")
      const data = new Uint8Array(buffer)
      imageCache.set(url, data)
      return data
    }

    // Handle regular URLs
    const response = await fetch(url)
    if (!response.ok) throw new Error("Failed to fetch image")
    const arrayBuffer = await response.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)
    imageCache.set(url, data)
    return data
  } catch (error) {
    console.error("Error fetching image:", error)
    return null
  }
}

/**
 * Generate bleed image via API
 */
async function generateBleedImage(
  imageUrl: string,
  method: BleedMethod,
  bleedMm: number,
  bleedColor?: { r: number; g: number; b: number }
): Promise<string | null> {
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
      throw new Error("Failed to generate bleed")
    }

    const data = await response.json()
    return data.image
  } catch (error) {
    console.error("Error generating bleed:", error)
    return null
  }
}

/**
 * Process items in chunks to avoid overwhelming the browser/API
 */
async function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  chunkSize: number,
  onProgress?: (completed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = []
  const total = items.length

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    const chunkResults = await Promise.all(chunk.map(processor))
    results.push(...chunkResults)

    if (onProgress) {
      onProgress(Math.min(i + chunkSize, total), total)
    }

    // Small delay between chunks to let the browser breathe
    if (i + chunkSize < total) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }

  return results
}

export interface PDFGenerationProgress {
  stage: "bleed-generation" | "pdf-assembly" | "pdf-save"
  current: number
  total: number
  message: string
}

export async function generateProxyPDF(
  items: ProxyItem[],
  settings: PrintSettings,
  onProgress?: (progress: PDFGenerationProgress) => void
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()

  const pageSize = PAGE_SIZES[settings.pageSize]
  const pageDimsMm = PAGE_DIMS_MM[settings.pageSize]

  // Card dimensions (trim box)
  const cardWidthMm = settings.cardWidth
  const cardHeightMm = settings.cardHeight
  const bleedMm = settings.bleed

  // Image extends past card by bleed
  const imageWidthMm = cardWidthMm + bleedMm * 2
  const imageHeightMm = cardHeightMm + bleedMm * 2

  // Convert to points
  const cardWidthPoints = mmToPoints(cardWidthMm)
  const cardHeightPoints = mmToPoints(cardHeightMm)
  const imageWidthPoints = mmToPoints(imageWidthMm)
  const imageHeightPoints = mmToPoints(imageHeightMm)
  const bleedPoints = mmToPoints(bleedMm)
  const offsetXPoints = mmToPoints(settings.offsetX)
  const offsetYPoints = mmToPoints(settings.offsetY)

  // Spacing is based on IMAGE size + gap to prevent overlap
  const spacingX = mmToPoints(imageWidthMm + settings.gap)
  const spacingY = mmToPoints(imageHeightMm + settings.gap)

  // Cut line spacing is based on card size (trim box boundaries)
  const cutLineSpacingX = mmToPoints(cardWidthMm + settings.gap)
  const cutLineSpacingY = mmToPoints(cardHeightMm + settings.gap)

  // Grid dimensions based on IMAGE sizes + gaps
  const gridWidthMm =
    settings.cardsPerRow * imageWidthMm +
    (settings.cardsPerRow - 1) * settings.gap
  const gridHeightMm =
    settings.rowsPerPage * imageHeightMm +
    (settings.rowsPerPage - 1) * settings.gap

  // Center the image grid + apply offsets
  const marginXMm = (pageDimsMm.width - gridWidthMm) / 2 + settings.offsetX
  const marginYMm = (pageDimsMm.height - gridHeightMm) / 2 + settings.offsetY
  const marginX = mmToPoints(marginXMm)
  const marginY = mmToPoints(marginYMm)

  // Flatten items
  const cardsToPrint: ProxyItem[] = []
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      cardsToPrint.push(item)
    }
  }

  const cardsPerPage = settings.cardsPerRow * settings.rowsPerPage
  const totalPages = Math.ceil(cardsToPrint.length / cardsPerPage)

  // Cache for generated bleed images (key: cardId, value: base64 image data)
  const bleedImageCache = new Map<string, string>()

  // Pre-generate bleed images for all unique cards if bleed is enabled
  if (bleedMm > 0) {
    const uniqueCards = [
      ...new Map(cardsToPrint.map((c) => [c.cardId, c])).values(),
    ]

    onProgress?.({
      stage: "bleed-generation",
      current: 0,
      total: uniqueCards.length,
      message: `Generating bleed for ${uniqueCards.length} unique cards...`,
    })

    // Process in chunks of 5 to avoid overwhelming the API
    await processInChunks(
      uniqueCards,
      async (card) => {
        const imageUrl = getFullImageUrl(card.image, settings.imageQuality)
        if (!imageUrl) return null

        const bleedImageUrl = await generateBleedImage(
          imageUrl,
          settings.bleedMethod as BleedMethod,
          bleedMm,
          settings.bleedColor
        )

        if (bleedImageUrl) {
          bleedImageCache.set(card.cardId, bleedImageUrl)
        }
        return card.cardId
      },
      5, // Process 5 cards at a time
      (completed, total) => {
        onProgress?.({
          stage: "bleed-generation",
          current: completed,
          total,
          message: `Generated bleed for ${completed} of ${total} cards...`,
        })
      }
    )
  }

  onProgress?.({
    stage: "pdf-assembly",
    current: 0,
    total: totalPages,
    message: `Assembling ${totalPages} pages...`,
  })

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const page = pdfDoc.addPage([pageSize.width, pageSize.height])
    const startCardIndex = pageIndex * cardsPerPage
    const pageCards = cardsToPrint.slice(
      startCardIndex,
      startCardIndex + cardsPerPage
    )

    // Report progress every few pages
    if (pageIndex % 3 === 0 || pageIndex === totalPages - 1) {
      onProgress?.({
        stage: "pdf-assembly",
        current: pageIndex + 1,
        total: totalPages,
        message: `Assembling page ${pageIndex + 1} of ${totalPages}...`,
      })
    }

    // Helper function to draw cut lines at each card's trim box boundaries
    const drawCutLines = () => {
      if (!settings.showCutLines) return

      // Get custom cut line color or default to emerald
      const cutColor = settings.cutLineColor
        ? rgb(
            settings.cutLineColor.r / 255,
            settings.cutLineColor.g / 255,
            settings.cutLineColor.b / 255
          )
        : rgb(0.06, 0.73, 0.49)
      const lineWidth = settings.cutLineWidth ?? 1.5
      const extension = mmToPoints(settings.cutLineLength ?? 8)

      // Draw cut lines for EACH card individually
      // Card's trim box is offset by bleed from image position
      for (let row = 0; row < settings.rowsPerPage; row++) {
        for (let col = 0; col < settings.cardsPerRow; col++) {
          const cardX = marginX + col * spacingX + bleedPoints
          const cardTopY =
            pageSize.height - marginY - row * spacingY - bleedPoints
          const cardBottomY = cardTopY - cardHeightPoints

          // Top edge of this card
          page.drawLine({
            start: { x: cardX - extension, y: cardTopY },
            end: { x: cardX + cardWidthPoints + extension, y: cardTopY },
            thickness: lineWidth,
            color: cutColor,
            dashArray: [4, 2],
          })

          // Bottom edge of this card
          page.drawLine({
            start: { x: cardX - extension, y: cardBottomY },
            end: { x: cardX + cardWidthPoints + extension, y: cardBottomY },
            thickness: lineWidth,
            color: cutColor,
            dashArray: [4, 2],
          })

          // Left edge of this card
          page.drawLine({
            start: { x: cardX, y: cardTopY + extension },
            end: { x: cardX, y: cardBottomY - extension },
            thickness: lineWidth,
            color: cutColor,
            dashArray: [4, 2],
          })

          // Right edge of this card
          page.drawLine({
            start: { x: cardX + cardWidthPoints, y: cardTopY + extension },
            end: { x: cardX + cardWidthPoints, y: cardBottomY - extension },
            thickness: lineWidth,
            color: cutColor,
            dashArray: [4, 2],
          })
        }
      }
    }

    // Helper function to draw card images (with bleed extending past cut lines)
    const drawCardImages = async () => {
      for (let i = 0; i < pageCards.length; i++) {
        const card = pageCards[i]
        const row = Math.floor(i / settings.cardsPerRow)
        const col = i % settings.cardsPerRow

        // Image position: base grid position
        // Trim box is at: image position + bleed
        // Image extends bleed past trim box on each side
        // In PDF coordinates, y is the bottom of the image
        const imageX = marginX + col * spacingX
        const imageY =
          pageSize.height - marginY - row * spacingY - imageHeightPoints

        // Use cached bleed image if available, otherwise fall back to original
        const cachedBleedImage = bleedImageCache.get(card.cardId)
        const imageUrl =
          cachedBleedImage || getFullImageUrl(card.image, settings.imageQuality)

        if (imageUrl) {
          try {
            const imageData = await fetchImage(imageUrl)
            if (imageData) {
              let embeddedImage
              try {
                embeddedImage = await pdfDoc.embedPng(imageData)
              } catch {
                try {
                  embeddedImage = await pdfDoc.embedJpg(imageData)
                } catch {
                  continue
                }
              }

              page.drawImage(embeddedImage, {
                x: imageX,
                y: imageY,
                width: imageWidthPoints,
                height: imageHeightPoints,
              })
            }
          } catch (error) {
            console.error("Error embedding image:", error)
          }
        }
      }
    }

    // Draw based on cutLinePosition setting
    // PDF uses painter's model: later drawings appear on top
    if (settings.cutLinePosition === "front") {
      // Draw images first, then cut lines on top
      await drawCardImages()
      drawCutLines()
    } else {
      // Default: draw cut lines first, then images on top
      drawCutLines()
      await drawCardImages()
    }
  }

  onProgress?.({
    stage: "pdf-save",
    current: 1,
    total: 1,
    message: "Finalizing PDF...",
  })

  return await pdfDoc.save()
}

export function downloadPDF(
  pdfBytes: Uint8Array,
  filename: string = "proxymon-cards.pdf"
) {
  const blob = new Blob([pdfBytes as unknown as BlobPart], {
    type: "application/pdf",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export { getFullImageUrl }

/**
 * Clear the image cache to free memory
 */
export function clearImageCache() {
  imageCache.clear()
}
