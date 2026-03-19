"use client"

import {
  Settings2,
  Printer,
  Move,
  RotateCcw,
  Layers,
  ExternalLink,
  Palette,
  Grid3X3,
  Ruler,
  Scissors,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Check,
} from "lucide-react"
import { useProxyList } from "@/stores/proxy-list"
import { generateProxyPDF, downloadPDF, clearImageCache } from "@/lib/pdf"
import { OFFSET_LIMITS } from "@/types"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { NumberInput } from "@/components/ui/number-input"
import { ProfileManager } from "./profile-manager"
import { useState, useCallback } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const ALL_SECTIONS = [
  "page-layout",
  "spacing-bleed",
  "cut-lines",
  "position",
  "options",
  "profiles",
]

export function SettingsSidebar() {
  const {
    settings,
    updateSettings,
    items,
    getTotalCards,
    isGenerating,
    setIsGenerating,
    setGenerationProgress,
  } = useProxyList()
  const [copied, setCopied] = useState(false)
  const [openSections, setOpenSections] = useState<string[]>([
    "page-layout",
    "spacing-bleed",
  ])

  const totalCards = getTotalCards()

  const allExpanded = openSections.length === ALL_SECTIONS.length

  const toggleAll = useCallback(() => {
    if (allExpanded) {
      setOpenSections([])
    } else {
      setOpenSections([...ALL_SECTIONS])
    }
  }, [allExpanded])

  const handleGeneratePDF = async () => {
    if (items.length === 0) return
    setIsGenerating(true)
    setGenerationProgress(null)
    try {
      const pdfBytes = await generateProxyPDF(items, settings, (progress) => {
        setGenerationProgress(progress)
      })
      downloadPDF(pdfBytes, `proxymon-${totalCards}-cards.pdf`)
    } catch (error) {
      console.error("Failed to generate PDF:", error)
    } finally {
      setIsGenerating(false)
      setGenerationProgress(null)
      // Clear image cache to free memory after generation
      clearImageCache()
    }
  }

  const handleCopyCardList = async () => {
    if (items.length === 0) return

    // Helper to extract setId from image URL if item.setId is empty
    // URL format: https://assets.tcgdex.net/en/{series}/{set}/{localId}
    const getSetId = (item: (typeof items)[0]): string => {
      if (item.setId) return item.setId

      // Try to extract from originalImage or image URL
      const imageUrl = item.originalImage || item.image
      if (imageUrl) {
        const match = imageUrl.match(/\/en\/[^/]+\/([^/]+)\//)
        if (match) return match[1]
      }

      return ""
    }

    // Helper to get a unique key for a card (for comparison)
    const getCardKey = (item: (typeof items)[0]): string => {
      return `${item.name}|${getSetId(item)}|${item.localId}`
    }

    // Merge adjacent identical cards
    const mergedLines: string[] = []
    let currentKey: string | null = null
    let currentQuantity = 0
    let currentName = ""
    let currentSetId = ""
    let currentLocalId = ""

    for (const item of items) {
      const key = getCardKey(item)

      if (key === currentKey) {
        // Same card as previous, accumulate quantity
        currentQuantity += item.quantity
      } else {
        // Different card, output previous if exists
        if (currentKey !== null) {
          mergedLines.push(
            `${currentQuantity} ${currentName} ${currentSetId} ${currentLocalId}`
          )
        }
        // Start new group
        currentKey = key
        currentQuantity = item.quantity
        currentName = item.name
        currentSetId = getSetId(item)
        currentLocalId = item.localId
      }
    }

    // Output the last group
    if (currentKey !== null) {
      mergedLines.push(
        `${currentQuantity} ${currentName} ${currentSetId} ${currentLocalId}`
      )
    }

    const cardList = mergedLines.join("\n")

    try {
      await navigator.clipboard.writeText(cardList)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-100">Print Settings</h2>
          </div>
          <button
            onClick={toggleAll}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            title={allExpanded ? "Collapse All" : "Expand All"}
          >
            {allExpanded ? (
              <ChevronsDownUp className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Accordion
          type="multiple"
          value={openSections}
          onValueChange={setOpenSections}
          className="space-y-2"
        >
          {/* Page & Layout */}
          <AccordionItem value="page-layout" className="border-slate-800">
            <AccordionTrigger className="py-3 text-sm text-slate-300 hover:no-underline">
              <div className="flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-slate-400" />
                <span>Page & Layout</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              {/* Page Size */}
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Page Size</Label>
                <Select
                  value={settings.pageSize}
                  onValueChange={(value: "letter" | "a4") =>
                    updateSettings({ pageSize: value })
                  }
                >
                  <SelectTrigger className="h-9 border-slate-700 bg-slate-900/50 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-900">
                    <SelectItem
                      value="letter"
                      className="text-slate-100 focus:bg-slate-800"
                    >
                      Letter (8.5&quot; × 11&quot;)
                    </SelectItem>
                    <SelectItem
                      value="a4"
                      className="text-slate-100 focus:bg-slate-800"
                    >
                      A4 (210mm × 297mm)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cards Per Row */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Cards per row</span>
                  <span className="text-slate-500">{settings.cardsPerRow}</span>
                </div>
                <Slider
                  value={[settings.cardsPerRow]}
                  onValueChange={([value]) =>
                    updateSettings({ cardsPerRow: value })
                  }
                  min={1}
                  max={4}
                  step={1}
                />
              </div>

              {/* Rows Per Page */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Rows per page</span>
                  <span className="text-slate-500">{settings.rowsPerPage}</span>
                </div>
                <Slider
                  value={[settings.rowsPerPage]}
                  onValueChange={([value]) =>
                    updateSettings({ rowsPerPage: value })
                  }
                  min={1}
                  max={5}
                  step={1}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Spacing & Bleed */}
          <AccordionItem value="spacing-bleed" className="border-slate-800">
            <AccordionTrigger className="py-3 text-sm text-slate-300 hover:no-underline">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-slate-400" />
                <span>Spacing & Bleed</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              {/* Gap */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Gap between cards</span>
                  <span className="text-slate-500">{settings.gap}mm</span>
                </div>
                <Slider
                  value={[settings.gap]}
                  onValueChange={([value]) => updateSettings({ gap: value })}
                  min={0}
                  max={10}
                  step={0.5}
                />
              </div>

              {/* Bleed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Bleed area</span>
                  <span className="text-slate-500">{settings.bleed}mm</span>
                </div>
                <Slider
                  value={[settings.bleed]}
                  onValueChange={([value]) => updateSettings({ bleed: value })}
                  min={0}
                  max={5}
                  step={0.5}
                />
                <p className="text-[10px] text-slate-600">
                  Extends image past cut line to prevent white edges
                </p>
              </div>

              {/* Bleed Method */}
              {settings.bleed > 0 && (
                <div className="space-y-2 pt-2">
                  <Label className="text-xs text-slate-400">Bleed method</Label>
                  <Select
                    value={settings.bleedMethod}
                    onValueChange={(value: "replicate" | "mirror" | "edge") =>
                      updateSettings({ bleedMethod: value })
                    }
                  >
                    <SelectTrigger className="h-8 border-slate-700 bg-slate-900/50 text-xs text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-900">
                      <SelectItem
                        value="replicate"
                        className="text-xs text-slate-100 focus:bg-slate-800"
                      >
                        Solid Color (from border)
                      </SelectItem>
                      <SelectItem
                        value="mirror"
                        className="text-xs text-slate-100 focus:bg-slate-800"
                      >
                        Mirror (flip edges)
                      </SelectItem>
                      <SelectItem
                        value="edge"
                        className="text-xs text-slate-100 focus:bg-slate-800"
                      >
                        Edge Stretch (1px border)
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Color picker for replicate method */}
                  {settings.bleedMethod === "replicate" && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs text-slate-400">
                        Bleed color
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={
                            settings.bleedColor
                              ? `#${settings.bleedColor.r.toString(16).padStart(2, "0")}${settings.bleedColor.g.toString(16).padStart(2, "0")}${settings.bleedColor.b.toString(16).padStart(2, "0")}`
                              : "#000000"
                          }
                          onChange={(e) => {
                            const hex = e.target.value
                            const r = parseInt(hex.slice(1, 3), 16)
                            const g = parseInt(hex.slice(3, 5), 16)
                            const b = parseInt(hex.slice(5, 7), 16)
                            updateSettings({ bleedColor: { r, g, b } })
                          }}
                          className="h-8 w-8 cursor-pointer rounded border border-slate-700 bg-transparent"
                        />
                        <span className="text-xs text-slate-500">
                          {settings.bleedColor
                            ? `RGB(${settings.bleedColor.r}, ${settings.bleedColor.g}, ${settings.bleedColor.b})`
                            : "Auto-detected from border"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bleed Comparison Link */}
              <a
                href="/bleed-comparison"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-between rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
              >
                <span className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-emerald-400" />
                  Compare Bleed Methods
                </span>
                <ExternalLink className="h-3 w-3 text-slate-500" />
              </a>
            </AccordionContent>
          </AccordionItem>

          {/* Cut Lines */}
          <AccordionItem value="cut-lines" className="border-slate-800">
            <AccordionTrigger className="py-3 text-sm text-slate-300 hover:no-underline">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-slate-400" />
                <span>Cut Lines</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Show cut lines</span>
                <Switch
                  checked={settings.showCutLines}
                  onCheckedChange={(checked) =>
                    updateSettings({ showCutLines: checked })
                  }
                />
              </div>

              {settings.showCutLines && (
                <div className="space-y-2 pt-2">
                  <Label className="text-xs text-slate-400">
                    Cut line color
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={
                        settings.cutLineColor
                          ? `#${settings.cutLineColor.r.toString(16).padStart(2, "0")}${settings.cutLineColor.g.toString(16).padStart(2, "0")}${settings.cutLineColor.b.toString(16).padStart(2, "0")}`
                          : "#10b981"
                      }
                      onChange={(e) => {
                        const hex = e.target.value
                        const r = parseInt(hex.slice(1, 3), 16)
                        const g = parseInt(hex.slice(3, 5), 16)
                        const b = parseInt(hex.slice(5, 7), 16)
                        updateSettings({ cutLineColor: { r, g, b } })
                      }}
                      className="h-8 w-8 cursor-pointer rounded border border-slate-700 bg-transparent"
                    />
                    <span className="text-xs text-slate-500">
                      {settings.cutLineColor
                        ? `RGB(${settings.cutLineColor.r}, ${settings.cutLineColor.g}, ${settings.cutLineColor.b})`
                        : "Default (Emerald)"}
                    </span>
                  </div>

                  {/* Cut Line Width */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Line width</span>
                      <span className="text-slate-500">
                        {settings.cutLineWidth ?? 1.5}px
                      </span>
                    </div>
                    <Slider
                      value={[settings.cutLineWidth ?? 1.5]}
                      onValueChange={([value]) =>
                        updateSettings({ cutLineWidth: value })
                      }
                      min={0.5}
                      max={3}
                      step={0.5}
                    />
                  </div>

                  {/* Cut Line Length */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Line length</span>
                      <span className="text-slate-500">
                        {settings.cutLineLength ?? 8}mm
                      </span>
                    </div>
                    <Slider
                      value={[settings.cutLineLength ?? 8]}
                      onValueChange={([value]) =>
                        updateSettings({ cutLineLength: value })
                      }
                      min={0}
                      max={15}
                      step={1}
                    />
                  </div>

                  {/* Cut Line Position */}
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs text-slate-400">
                      Line position
                    </Label>
                    <Select
                      value={settings.cutLinePosition ?? "behind"}
                      onValueChange={(value: "front" | "behind") =>
                        updateSettings({ cutLinePosition: value })
                      }
                    >
                      <SelectTrigger className="h-8 border-slate-700 bg-slate-900/50 text-xs text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-700 bg-slate-900">
                        <SelectItem
                          value="front"
                          className="text-xs text-slate-100 focus:bg-slate-800"
                        >
                          In front of cards
                        </SelectItem>
                        <SelectItem
                          value="behind"
                          className="text-xs text-slate-100 focus:bg-slate-800"
                        >
                          Behind cards
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Position Offset */}
          <AccordionItem value="position" className="border-slate-800">
            <AccordionTrigger className="py-3 text-sm text-slate-300 hover:no-underline">
              <div className="flex items-center gap-2">
                <Move className="h-4 w-4 text-slate-400" />
                <span>Position Offset</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              {/* Horizontal Offset */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Horizontal</span>
                </div>
                <NumberInput
                  value={settings.offsetX}
                  onChange={(value) => updateSettings({ offsetX: value })}
                  min={OFFSET_LIMITS.min}
                  max={OFFSET_LIMITS.max}
                  step={OFFSET_LIMITS.step}
                  unit="mm"
                />
                <p className="flex justify-between text-[10px] text-slate-600">
                  <span>← Left</span>
                  <span>Right →</span>
                </p>
              </div>

              {/* Vertical Offset */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Vertical</span>
                </div>
                <NumberInput
                  value={settings.offsetY}
                  onChange={(value) => updateSettings({ offsetY: value })}
                  min={OFFSET_LIMITS.min}
                  max={OFFSET_LIMITS.max}
                  step={OFFSET_LIMITS.step}
                  unit="mm"
                />
                <p className="flex justify-between text-[10px] text-slate-600">
                  <span>↑ Up</span>
                  <span>Down ↓</span>
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Options */}
          <AccordionItem value="options" className="border-slate-800">
            <AccordionTrigger className="py-3 text-sm text-slate-300 hover:no-underline">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-slate-400" />
                <span>Options</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  High quality images
                </span>
                <Switch
                  checked={settings.imageQuality === "high"}
                  onCheckedChange={(checked) =>
                    updateSettings({ imageQuality: checked ? "high" : "low" })
                  }
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Profiles */}
          <AccordionItem value="profiles" className="border-slate-800">
            <AccordionTrigger className="py-3 text-sm text-slate-300 hover:no-underline">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-slate-400" />
                <span>Profiles</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <ProfileManager />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 border-t border-slate-800 p-4">
        {/* Copy Card List Button */}
        <Button
          className="w-full border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          variant="outline"
          disabled={items.length === 0}
          onClick={handleCopyCardList}
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy Card List
            </>
          )}
        </Button>

        {/* Download PDF Button */}
        <Button
          className="w-full bg-blue-600 text-white hover:bg-blue-500"
          size="lg"
          disabled={items.length === 0 || isGenerating}
          onClick={handleGeneratePDF}
        >
          {isGenerating ? (
            <>
              <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Printer className="mr-2 h-4 w-4" />
              Download PDF
            </>
          )}
        </Button>
        {items.length > 0 && (
          <p className="mt-2 text-center text-xs text-slate-500">
            {totalCards} cards ready
          </p>
        )}
      </div>
    </div>
  )
}
