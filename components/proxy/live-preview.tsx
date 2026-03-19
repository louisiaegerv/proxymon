"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { useProxyList } from "@/stores/proxy-list"
import { getFullImageUrl } from "@/lib/tcgdex"
import { PAGE_DIMENSIONS, BleedMethod } from "@/types"
import { generateProxyPDF, downloadPDF, clearImageCache } from "@/lib/pdf"
import { Button } from "@/components/ui/button"
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckSquare,
  X,
  Loader2,
} from "lucide-react"
import { CardVariantModal } from "./card-variant-modal"
import { BulkSelectionToolbar } from "./bulk-selection-toolbar"
import {
  DeleteConfirmDialog,
  shouldSkipDeleteConfirm,
} from "./delete-confirm-dialog"
import { cn } from "@/lib/utils"
import { CardWithBleed } from "@/components/card-with-bleed"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"

// mm to pixels for preview (at 96 DPI, 1mm ≈ 3.78px)
const MM_TO_PX = 3.78

// Zoom levels
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2]

interface DisplayCard {
  id: string
  itemId: string
  name: string
  image?: string
  index: number
  itemIndex: number
  row: number
  col: number
  imageX: number
  imageY: number
  imageWidth: number
  imageHeight: number
}

interface LivePreviewProps {
  hideHeader?: boolean
  containerWidth?: number // When provided, scales to fit this width
}

export function LivePreview({
  hideHeader = false,
  containerWidth,
}: LivePreviewProps) {
  const {
    items,
    getTotalCards,
    settings,
    reorderItems,
    selectedIds,
    isBulkMode,
    toggleBulkMode,
    toggleSelection,
    selectRange,
    selectAll,
    deselectAll,
    clearSelection,
    removeItems,
    isGenerating,
    generationProgress,
    setIsGenerating,
    setGenerationProgress,
  } = useProxyList()
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [zoomIndex, setZoomIndex] = useState(2)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [localLastSelectedId, setLocalLastSelectedId] = useState<string | null>(
    null
  )

  const totalCards = getTotalCards()
  const selectedCount = selectedIds.size
  const zoom = ZOOM_LEVELS[zoomIndex]

  // Use mouse sensor with activation constraint to prevent accidental drags
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  })
  const sensors = useSensors(mouseSensor, touchSensor)

  // Calculate preview dimensions
  const preview = useMemo(() => {
    const cardWidthMm = settings.cardWidth
    const cardHeightMm = settings.cardHeight
    const bleedMm = settings.bleed
    const imageWidthMm = cardWidthMm + bleedMm * 2
    const imageHeightMm = cardHeightMm + bleedMm * 2
    const spacingX = imageWidthMm + settings.gap
    const spacingY = imageHeightMm + settings.gap

    const pageDims = PAGE_DIMENSIONS[settings.pageSize]

    const gridWidthMm =
      settings.cardsPerRow * imageWidthMm +
      (settings.cardsPerRow - 1) * settings.gap
    const gridHeightMm =
      settings.rowsPerPage * imageHeightMm +
      (settings.rowsPerPage - 1) * settings.gap

    const marginXMm = (pageDims.width - gridWidthMm) / 2 + settings.offsetX
    const marginYMm = (pageDims.height - gridHeightMm) / 2 + settings.offsetY

    // Calculate base scale (0.8 for desktop)
    let baseScale = 0.8

    // If containerWidth is provided, calculate scale to fit
    if (containerWidth && containerWidth > 0) {
      const pageWidthPx = pageDims.width * MM_TO_PX
      // Scale to fit with some padding (16px on each side)
      const fitScale = (containerWidth - 32) / pageWidthPx
      baseScale = Math.min(0.8, Math.max(0.3, fitScale))
    }

    const finalScale = baseScale * zoom

    return {
      width: pageDims.width * finalScale * MM_TO_PX,
      height: pageDims.height * finalScale * MM_TO_PX,
      marginX: marginXMm * finalScale * MM_TO_PX,
      marginY: marginYMm * finalScale * MM_TO_PX,
      cardWidth: cardWidthMm * finalScale * MM_TO_PX,
      cardHeight: cardHeightMm * finalScale * MM_TO_PX,
      imageWidth: imageWidthMm * finalScale * MM_TO_PX,
      imageHeight: imageHeightMm * finalScale * MM_TO_PX,
      bleed: bleedMm * finalScale * MM_TO_PX,
      spacingX: spacingX * finalScale * MM_TO_PX,
      spacingY: spacingY * finalScale * MM_TO_PX,
      scale: finalScale,
      cardsPerPage: settings.cardsPerRow * settings.rowsPerPage,
      gridCols: settings.cardsPerRow,
      gridRows: settings.rowsPerPage,
    }
  }, [settings, zoom])

  // Build display cards with position info
  const displayCards = useMemo(() => {
    const cards: DisplayCard[] = []
    items.forEach((item, itemIndex) => {
      const cardIndex = itemIndex
      const pageIndex = Math.floor(cardIndex / preview.cardsPerPage)
      const pageCardIndex = cardIndex % preview.cardsPerPage
      const row = Math.floor(pageCardIndex / settings.cardsPerRow)
      const col = pageCardIndex % settings.cardsPerRow

      cards.push({
        id: item.id,
        itemId: item.id,
        name: item.name,
        image: item.image,
        index: cardIndex,
        itemIndex,
        row,
        col,
        imageX: preview.marginX + col * preview.spacingX,
        imageY: preview.marginY + row * preview.spacingY,
        imageWidth: preview.imageWidth,
        imageHeight: preview.imageHeight,
      })
    })
    return cards
  }, [items, preview, settings.cardsPerRow])

  const activeCard = useMemo(() => {
    return displayCards.find((c) => c.id === activeId)
  }, [activeId, displayCards])

  const handleDeleteSelected = useCallback(() => {
    if (selectedCount === 0) return

    if (shouldSkipDeleteConfirm()) {
      removeItems(Array.from(selectedIds))
    } else {
      setShowDeleteConfirm(true)
    }
  }, [selectedCount, selectedIds, removeItems])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape - exit bulk mode and clear selection
      if (e.key === "Escape") {
        if (isBulkMode) {
          clearSelection()
        }
      }
      // Delete - delete selected cards (only when in bulk mode and cards are selected)
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedCount > 0 &&
        isBulkMode
      ) {
        e.preventDefault()
        handleDeleteSelected()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    isBulkMode,
    selectedCount,
    selectedIds,
    clearSelection,
    handleDeleteSelected,
  ])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    setOverId(null)
  }

  const handleDragMove = (event: DragMoveEvent) => {
    if (event.over) {
      setOverId(event.over.id as string)
    } else {
      setOverId(null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverId(null)

    if (!over) return

    const activeCard = displayCards.find((c) => c.id === active.id)
    const overCard = displayCards.find((c) => c.id === over.id)

    if (!activeCard || !overCard) return
    if (activeCard.id === overCard.id) return

    reorderItems(activeCard.itemIndex, overCard.itemIndex)
  }

  const handleCardClick = (card: DisplayCard, event: React.MouseEvent) => {
    // If in bulk mode or shift is held, handle selection
    if (isBulkMode || event.shiftKey) {
      event.preventDefault()
      event.stopPropagation()

      if (event.shiftKey && localLastSelectedId) {
        // Range selection
        selectRange(localLastSelectedId, card.id)
      } else {
        // Toggle selection
        toggleSelection(card.id)
      }
      setLocalLastSelectedId(card.id)
    } else {
      // Normal click - open variant modal
      setSelectedCardId(card.id)
      setSelectedItemId(card.itemId)
    }
  }

  const handleCheckboxChange = (cardId: string) => {
    toggleSelection(cardId)
    setLocalLastSelectedId(cardId)
  }

  const handleZoomIn = () =>
    setZoomIndex((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1))
  const handleZoomOut = () => setZoomIndex((i) => Math.max(i - 1, 0))
  const handleResetZoom = () => setZoomIndex(1)

  const handleCloseModal = () => {
    setSelectedCardId(null)
    setSelectedItemId(null)
  }

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

  const handleConfirmDelete = () => {
    removeItems(Array.from(selectedIds))
    setShowDeleteConfirm(false)
  }

  const handleExitBulkMode = () => {
    clearSelection()
    setLocalLastSelectedId(null)
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-500">
        <div className="space-y-4 text-center">
          <div className="text-6xl opacity-20">🎴</div>
          <div>
            <p className="text-lg font-medium text-slate-400">
              No cards added yet
            </p>
            <p className="mt-1 text-sm">
              Paste a deck list on the left to get started
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header - hidden on mobile when hideHeader is true */}
      {!hideHeader && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Print Preview
            </h2>
            <p className="text-sm text-slate-500">
              {totalCards} cards ·{" "}
              {selectedCount > 0 ? `${selectedCount} selected · ` : ""}
              {Math.ceil(displayCards.length / preview.cardsPerPage)} page
              {Math.ceil(displayCards.length / preview.cardsPerPage) !== 1
                ? "s"
                : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Bulk mode toggle */}
            <Button
              variant={isBulkMode ? "secondary" : "ghost"}
              size="sm"
              onClick={toggleBulkMode}
              className={cn(
                "h-8 gap-2 px-3",
                isBulkMode && "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              {isBulkMode ? (
                <>
                  <X className="h-4 w-4" />
                  Exit Selection
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Select
                </>
              )}
            </Button>

            <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomOut}
                disabled={zoomIndex === 0}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center text-xs">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomIn}
                disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleResetZoom}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Pages */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 space-y-8 px-4 pb-8">
          {Array.from({
            length: Math.ceil(displayCards.length / preview.cardsPerPage),
          }).map((_, pageIndex) => {
            const pageCards = displayCards.slice(
              pageIndex * preview.cardsPerPage,
              (pageIndex + 1) * preview.cardsPerPage
            )
            const totalPages = Math.ceil(
              displayCards.length / preview.cardsPerPage
            )

            return (
              <div key={pageIndex} className="flex flex-col items-center">
                <div className="mb-2 text-3xl text-slate-500 md:text-xs">
                  Page {pageIndex + 1} of {totalPages}
                </div>

                <div
                  className="card-grid preview-paper relative bg-white shadow-2xl"
                  style={{
                    width: preview.width,
                    height: preview.height,
                    minWidth: preview.width,
                    minHeight: preview.height,
                  }}
                >
                  {/* Cards */}
                  {pageCards.map((card) => {
                    const isActive = card.id === activeId
                    const isOver = card.id === overId
                    const isSelected = selectedIds.has(card.id)
                    const imageUrl = getFullImageUrl(card.image, "low", "webp")

                    return (
                      <DraggableCard
                        key={card.id}
                        card={card}
                        isActive={isActive}
                        isOver={isOver}
                        isSelected={isSelected}
                        activeId={activeId}
                        isBulkMode={isBulkMode}
                        onClick={(e) => handleCardClick(card, e)}
                        onSelectChange={() => handleCheckboxChange(card.id)}
                      >
                        {imageUrl ? (
                          <CardWithBleed
                            imageUrl={imageUrl}
                            name={card.name}
                            bleedMm={settings.bleed}
                            method={settings.bleedMethod as BleedMethod}
                            showTrimLines={false}
                            bleedColor={settings.bleedColor}
                            dpi={96}
                            fillParent
                            cardWidth={settings.cardWidth}
                            cardHeight={settings.cardHeight}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xs">
                            {card.name}
                          </div>
                        )}
                      </DraggableCard>
                    )
                  })}

                  {/* Cut lines */}
                  {settings.showCutLines && (
                    <svg
                      className={cn(
                        "pointer-events-none absolute inset-0",
                        settings.cutLinePosition === "front" ? "z-50" : "z-0"
                      )}
                      width={preview.width}
                      height={preview.height}
                    >
                      {Array.from({
                        length: preview.gridRows * preview.gridCols,
                      }).map((_, i) => {
                        const row = Math.floor(i / preview.gridCols)
                        const col = i % preview.gridCols

                        const cardX =
                          preview.marginX +
                          col * preview.spacingX +
                          preview.bleed
                        const cardY =
                          preview.marginY +
                          row * preview.spacingY +
                          preview.bleed

                        const cutColor = settings.cutLineColor
                          ? `rgb(${settings.cutLineColor.r}, ${settings.cutLineColor.g}, ${settings.cutLineColor.b})`
                          : "#10b981"

                        const lineLength = settings.cutLineLength ?? 8
                        const lineWidth = settings.cutLineWidth ?? 1.5

                        return (
                          <g key={`card-cuts-${row}-${col}`}>
                            <line
                              className="top-line"
                              x1={cardX - preview.bleed - lineLength}
                              y1={cardY}
                              x2={
                                cardX +
                                preview.cardWidth +
                                preview.bleed +
                                lineLength
                              }
                              y2={cardY}
                              stroke={cutColor}
                              strokeWidth={lineWidth}
                              strokeDasharray="4 2"
                            />
                            <line
                              className="bottom-line"
                              x1={cardX - preview.bleed - lineLength}
                              y1={cardY + preview.cardHeight}
                              x2={
                                cardX +
                                preview.cardWidth +
                                preview.bleed +
                                lineLength
                              }
                              y2={cardY + preview.cardHeight}
                              stroke={cutColor}
                              strokeWidth={lineWidth}
                              strokeDasharray="4 2"
                            />
                            <line
                              className="left-line"
                              x1={cardX}
                              y1={cardY - preview.bleed - lineLength}
                              x2={cardX}
                              y2={
                                cardY +
                                preview.cardHeight +
                                preview.bleed +
                                lineLength
                              }
                              stroke={cutColor}
                              strokeWidth={lineWidth}
                              strokeDasharray="4 2"
                            />
                            <line
                              className="right-line"
                              x1={cardX + preview.cardWidth}
                              y1={cardY - preview.bleed - lineLength}
                              x2={cardX + preview.cardWidth}
                              y2={
                                cardY +
                                preview.cardHeight +
                                preview.bleed +
                                lineLength
                              }
                              stroke={cutColor}
                              strokeWidth={lineWidth}
                              strokeDasharray="4 2"
                            />
                          </g>
                        )
                      })}
                    </svg>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Drag Overlay - shows the card following the cursor */}
        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div
              className="cursor-grabbing shadow-2xl"
              style={{
                width: activeCard.imageWidth,
                height: activeCard.imageHeight,
                position: "fixed",
                pointerEvents: "none",
              }}
            >
              {activeCard.image ? (
                <CardWithBleed
                  imageUrl={getFullImageUrl(activeCard.image, "low", "webp")!}
                  name={activeCard.name}
                  bleedMm={settings.bleed}
                  method={settings.bleedMethod as BleedMethod}
                  showTrimLines={false}
                  bleedColor={settings.bleedColor}
                  dpi={96}
                  fillParent
                  cardWidth={settings.cardWidth}
                  cardHeight={settings.cardHeight}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xs">
                  {activeCard.name}
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* PDF Generation Progress Overlay */}
      {isGenerating && generationProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="w-80 rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-center">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-blue-400">
                    {Math.round(
                      (generationProgress.current / generationProgress.total) *
                        100
                    )}
                    %
                  </span>
                </div>
              </div>
            </div>
            <h3 className="mb-2 text-center text-lg font-semibold text-slate-100">
              Generating PDF
            </h3>
            <p className="mb-4 text-center text-sm text-slate-400">
              {generationProgress.message}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
                style={{
                  width: `${
                    (generationProgress.current / generationProgress.total) *
                    100
                  }%`,
                }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">
              {generationProgress.stage === "bleed-generation" &&
                `Step 1 of 3: Processing images...`}
              {generationProgress.stage === "pdf-assembly" &&
                `Step 2 of 3: Building pages...`}
              {generationProgress.stage === "pdf-save" &&
                `Step 3 of 3: Finalizing...`}
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 text-center text-xs text-slate-500">
        {settings.bleed > 0 && (
          <div className="text-emerald-400">
            Green line = cut line · Card artwork extends {settings.bleed}mm past
            cut
          </div>
        )}
        {isBulkMode && (
          <div className="mt-1 text-blue-400">
            Click cards to select · Shift+click for range selection · Press
            Delete to remove selected
          </div>
        )}
      </div>

      {/* Bulk Selection Toolbar */}
      <BulkSelectionToolbar
        selectedCount={selectedCount}
        totalCount={items.length}
        onDelete={handleDeleteSelected}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        onExitBulkMode={handleExitBulkMode}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        cardCount={selectedCount}
      />

      {/* Card Variant Modal */}
      <CardVariantModal
        isOpen={!!selectedCardId}
        onClose={handleCloseModal}
        cardId={selectedCardId}
        itemId={selectedItemId}
      />
    </div>
  )
}

// Draggable and droppable card component
interface DraggableCardProps {
  card: DisplayCard
  isActive: boolean
  isOver: boolean
  isSelected: boolean
  activeId: string | null
  isBulkMode: boolean
  children: React.ReactNode
  onClick?: (event: React.MouseEvent) => void
  onSelectChange?: () => void
}

function DraggableCard({
  card,
  isActive,
  isOver,
  isSelected,
  activeId,
  isBulkMode,
  children,
  onClick,
  onSelectChange,
}: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
    id: card.id,
    data: { card },
    disabled: isBulkMode, // Disable dragging in bulk mode
  })

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: card.id,
    data: { card },
    disabled: isBulkMode, // Disable dropping in bulk mode
  })

  const handleClick = (e: React.MouseEvent) => {
    // Prevent drag from interfering with click
    if (!isDragging && onClick) {
      onClick(e)
    }
  }

  const style = {
    opacity: isDragging ? 0.3 : isActive ? 0.5 : 1,
    zIndex: isDragging ? 50 : isOver ? 40 : isBulkMode ? 30 : undefined,
    cursor: isBulkMode ? "pointer" : isDragging ? "grabbing" : "grab",
    touchAction: "none",
  }

  return (
    <div
      ref={setDroppableRef}
      className={cn(
        "absolute z-10 transition-all duration-200",
        isOver &&
          !isBulkMode &&
          "z-40 scale-105 ring-2 ring-green-400 ring-offset-2",
        isSelected && "z-30 ring-2 ring-blue-500 ring-offset-2"
      )}
      style={{
        left: card.imageX,
        top: card.imageY,
        width: card.imageWidth,
        height: card.imageHeight,
      }}
    >
      <div
        ref={setDraggableRef}
        {...attributes}
        {...(isBulkMode ? {} : listeners)}
        onClick={handleClick}
        className={cn(
          "h-full w-full transition-all",
          !isBulkMode && "hover:brightness-110",
          isDragging && "ring-2 ring-blue-400"
        )}
        style={style}
      >
        {children}
      </div>

      {/* Selection checkbox overlay */}
      {isBulkMode && (
        <div
          className="absolute top-2 left-2 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelectChange}
            className={cn(
              "h-5 w-5 border-2 shadow-lg",
              isSelected
                ? "border-blue-600 bg-blue-600 data-[state=checked]:bg-blue-600"
                : "border-slate-400 bg-white/90 hover:bg-white"
            )}
          />
        </div>
      )}

      {/* Selected indicator (subtle when not in bulk mode) */}
      {isSelected && !isBulkMode && (
        <div className="absolute top-2 left-2 z-40">
          <div className="flex h-4 w-4 items-center justify-center rounded-sm bg-blue-600 shadow-lg">
            <svg
              className="h-3 w-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
