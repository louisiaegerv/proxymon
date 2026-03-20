"use client"

import { useState, useCallback } from "react"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { resolveDeckCards, type DeckListItem } from "@/lib/deck-parser"
import { useProxyList } from "@/stores/proxy-list"
import { getProcessedCardImage } from "@/lib/tcgdex"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { AddCardsModal } from "./add-cards-modal"
import { CardList } from "./card-list"
import { DeckSelector } from "./deck-selector"
import type { ProxyItem } from "@/types"

interface DeckSidebarProps {
  variant?: "desktop" | "mobile"
}

export function DeckSidebar({ variant = "desktop" }: DeckSidebarProps) {
  const isMobile = variant === "mobile"

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState("")
  const [showClearDialog, setShowClearDialog] = useState(false)

  const addItem = useProxyList((state) => state.addItem)
  const clearList = useProxyList((state) => state.clearList)
  const items = useProxyList((state) => state.getActiveDeck()?.items ?? [])
  const totalCards = useProxyList((state) => state.getTotalCards)()
  const reorderItems = useProxyList((state) => state.reorderItems)
  const removeItems = useProxyList((state) => state.removeItems)

  const handleAddCards = async (deckItems: DeckListItem[]) => {
    if (deckItems.length === 0) return

    setIsProcessing(true)
    setProcessingStatus("Processing cards...")
    setIsAddModalOpen(false)

    try {
      // Resolve cards against TCGdex
      const results = await resolveDeckCards(deckItems)

      let addedCount = 0
      const errors: string[] = []

      // Process each card
      for (const result of results) {
        if (result.card) {
          setProcessingStatus(`Adding ${result.card.name}...`)

          // Process image to stretch corners
          const processedImage = await getProcessedCardImage(
            result.card.image,
            "high"
          )

          // Add the card with the specified quantity
          addItem(
            {
              cardId: result.card.id,
              name: result.card.name,
              image: processedImage,
              originalImage: result.card.image,
              setName: result.card.set?.name || "Unknown",
              setId: result.card.set?.id || "",
              localId: result.card.localId,
            },
            result.item.quantity
          )

          addedCount += result.item.quantity
        } else {
          errors.push(`${result.item.cardName}: ${result.error || "Not found"}`)
        }
      }

      setProcessingStatus(`Added ${addedCount} cards`)

      // Clear status after 3 seconds
      setTimeout(() => setProcessingStatus(""), 3000)
    } catch (err) {
      setProcessingStatus("Error processing cards")
      setTimeout(() => setProcessingStatus(""), 3000)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClearClick = () => {
    if (items.length === 0) return
    setShowClearDialog(true)
  }

  const handleClearConfirm = () => {
    clearList()
    setShowClearDialog(false)
  }

  const handleReorder = useCallback((newItems: ProxyItem[]) => {
    // Update the store with the new order using setItems
    useProxyList.getState().setItems(newItems)
  }, [])

  const handleRemove = useCallback(
    (indices: number[]) => {
      // Get the IDs of items to remove
      const idsToRemove = indices
        .map((index) => items[index]?.id)
        .filter(Boolean)
      if (idsToRemove.length > 0) {
        removeItems(idsToRemove)
      }
    },
    [items, removeItems]
  )

  return (
    <div className={cn("flex h-full flex-col", isMobile && "bg-slate-950")}>
      {/* Header */}
      <div
        className={cn(
          "shrink-0 border-b border-slate-800",
          isMobile
            ? "px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]"
            : "p-4"
        )}
      >
        {/* Deck Selector - Primary deck identification */}
        <DeckSelector className={cn("mb-3", isMobile && "text-sm")} />

        {/* Card count and clear action */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {items.length > 0
              ? `${totalCards} cards (${items.length} unique)`
              : "No cards yet"}
          </p>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearClick}
              className="h-7 px-2 text-xs text-red-400 hover:bg-red-950/30 hover:text-red-300"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Card List Area */}
      <div className="flex-1 overflow-hidden">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 rounded-full bg-slate-800/50 p-4">
              <Plus className="h-8 w-8 text-slate-600" />
            </div>
            <h3 className="mb-2 text-sm font-medium text-slate-300">
              Your deck is empty
            </h3>
            <p className="mb-6 text-xs text-slate-500">
              Add cards to create your proxy deck. You can import from meta
              decks, paste a list, or search for individual cards.
            </p>
          </div>
        ) : (
          <div className="h-full overflow-auto p-4">
            <CardList
              items={items}
              onReorder={handleReorder}
              onRemove={handleRemove}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className={cn(
          "shrink-0 border-t border-slate-800",
          isMobile
            ? "p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
            : "p-4"
        )}
      >
        {/* Processing Status */}
        {processingStatus && (
          <div
            className={cn(
              "mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
              isProcessing
                ? "bg-blue-900/30 text-blue-400"
                : "bg-green-900/30 text-green-400"
            )}
          >
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
            {processingStatus}
          </div>
        )}

        <Button
          onClick={() => setIsAddModalOpen(true)}
          disabled={isProcessing}
          className={cn(
            "w-full bg-blue-600 text-white hover:bg-blue-500",
            isMobile && "h-12 text-base"
          )}
        >
          <Plus className={cn("mr-2", isMobile ? "h-5 w-5" : "h-4 w-4")} />
          Add Cards
        </Button>
      </div>

      {/* Add Cards Modal */}
      <AddCardsModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddCards={handleAddCards}
      />

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>Clear Deck</DialogTitle>
            <DialogDescription className="text-slate-400">
              This will remove all {totalCards} cards from your deck. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowClearDialog(false)}
              className="text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearConfirm}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
