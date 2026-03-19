import { create } from "zustand"
import { persist } from "zustand/middleware"
import { getProcessedCardImage } from "@/lib/tcgdex"
import type { ProxyItem, PrintSettings } from "@/types"

/**
 * Re-process images for all items that have an originalImage but no processed image.
 * This runs after rehydration to restore sharp corners.
 */
async function reprocessImagesAfterRehydration(
  items: ProxyItem[],
  updateItemCard: (id: string, cardData: Partial<ProxyItem>) => void
) {
  // Find items that need re-processing (have originalImage but image equals originalImage)
  const itemsToProcess = items.filter(
    (item) =>
      item.originalImage && (item.image === item.originalImage || !item.image)
  )

  if (itemsToProcess.length === 0) return

  console.log(
    "[reprocessImages] Starting re-processing for",
    itemsToProcess.length,
    "items"
  )

  // Process items sequentially to avoid overwhelming the API
  for (const item of itemsToProcess) {
    if (!item.originalImage) continue

    console.log("[reprocessImages] Processing:", item.name)
    // Use getProcessedCardImage which properly transforms TCGdex URLs
    const processedImage = await getProcessedCardImage(
      item.originalImage,
      "high"
    )

    if (processedImage) {
      updateItemCard(item.id, { image: processedImage })
      console.log("[reprocessImages] Updated:", item.name)
    } else {
      console.warn("[reprocessImages] Failed to process:", item.name)
      // Keep the originalImage as fallback - no change needed
    }
  }

  console.log("[reprocessImages] Re-processing complete")
}

interface ProxyListState {
  // Proxy list
  items: ProxyItem[]
  addItem: (
    card: {
      cardId: string
      name: string
      image: string | undefined
      originalImage?: string | undefined
      setName: string
      setId: string
      localId: string
      variant?: "normal" | "holo" | "reverse"
    },
    quantity?: number
  ) => void
  removeItem: (id: string) => void
  removeItems: (ids: string[]) => void
  updateQuantity: (id: string, quantity: number) => void
  updateVariant: (id: string, variant: "normal" | "holo" | "reverse") => void
  reorderItems: (startIndex: number, endIndex: number) => void
  reorderItemsById: (activeId: string, overId: string) => void
  updateItemCard: (id: string, cardData: Partial<ProxyItem>) => void
  clearList: () => void
  getTotalCards: () => number

  // Selection state for bulk operations
  selectedIds: Set<string>
  isBulkMode: boolean
  lastSelectedId: string | null
  toggleBulkMode: () => void
  selectItem: (id: string) => void
  deselectItem: (id: string) => void
  toggleSelection: (id: string) => void
  selectRange: (startId: string, endId: string) => void
  selectAll: () => void
  deselectAll: () => void
  clearSelection: () => void
  getSelectedCount: () => number

  // Print settings
  settings: PrintSettings
  updateSettings: (settings: Partial<PrintSettings>) => void
  resetSettings: () => void

  // PDF Generation state
  isGenerating: boolean
  setIsGenerating: (isGenerating: boolean) => void
  generationProgress: {
    stage: string
    current: number
    total: number
    message: string
  } | null
  setGenerationProgress: (
    progress: {
      stage: string
      current: number
      total: number
      message: string
    } | null
  ) => void
}

export const useProxyList = create<ProxyListState>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      selectedIds: new Set(),
      isBulkMode: false,
      lastSelectedId: null,
      isGenerating: false,
      generationProgress: null,
      settings: {
        pageSize: "letter",
        cardsPerRow: 3,
        rowsPerPage: 3,
        cardWidth: 63,
        cardHeight: 88,
        bleed: 0,
        gap: 2,
        showCutLines: true,
        imageQuality: "high",
        offsetX: 0,
        offsetY: 0,
        bleedMethod: "replicate",
      },

      // Actions
      addItem: (card, quantity = 1) => {
        const items = get().items

        // DEBUG: Log what's being added
        console.log("[DEBUG addItem] Adding card:", {
          name: card.name,
          cardId: card.cardId,
          hasImage: !!card.image,
          imagePreview: card.image?.slice(0, 50),
          hasOriginalImage: !!card.originalImage,
          originalImagePreview: card.originalImage?.slice(0, 50),
          quantity,
        })

        const newItems: ProxyItem[] = []
        const baseId = `${card.cardId}-${Date.now()}`

        for (let i = 0; i < quantity; i++) {
          newItems.push({
            id: `${baseId}-${i}`,
            cardId: card.cardId,
            name: card.name,
            image: card.image,
            originalImage: card.originalImage,
            setName: card.setName,
            setId: card.setId,
            localId: card.localId,
            quantity: 1,
            variant: card.variant || "normal",
          })
        }

        set({ items: [...items, ...newItems] })
        console.log(
          "[DEBUG addItem] Items count after add:",
          items.length + newItems.length
        )
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          selectedIds: new Set(
            [...state.selectedIds].filter((sid) => sid !== id)
          ),
        }))
      },

      removeItems: (ids) => {
        set((state) => ({
          items: state.items.filter((item) => !ids.includes(item.id)),
          selectedIds: new Set(
            [...state.selectedIds].filter((sid) => !ids.includes(sid))
          ),
        }))
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) return

        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        }))
      },

      updateVariant: (id, variant) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, variant } : item
          ),
        }))
      },

      reorderItems: (startIndex, endIndex) => {
        const items = [...get().items]
        const [removed] = items.splice(startIndex, 1)
        items.splice(endIndex, 0, removed)
        set({ items })
      },

      reorderItemsById: (activeId: string, overId: string) => {
        const items = [...get().items]
        const activeIndex = items.findIndex((item) => item.id === activeId)
        const overIndex = items.findIndex((item) => item.id === overId)

        if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex)
          return

        const [removed] = items.splice(activeIndex, 1)
        items.splice(overIndex, 0, removed)
        set({ items })
      },

      updateItemCard: (id, cardData) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...cardData } : item
          ),
        }))
      },

      clearList: () => {
        set({
          items: [],
          selectedIds: new Set(),
          isBulkMode: false,
          lastSelectedId: null,
        })
      },

      getTotalCards: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },

      // Selection actions
      toggleBulkMode: () => {
        set((state) => ({
          isBulkMode: !state.isBulkMode,
          selectedIds: !state.isBulkMode ? state.selectedIds : new Set(),
          lastSelectedId: null,
        }))
      },

      selectItem: (id) => {
        set((state) => ({
          selectedIds: new Set([...state.selectedIds, id]),
          lastSelectedId: id,
        }))
      },

      deselectItem: (id) => {
        set((state) => {
          const newSelected = new Set(state.selectedIds)
          newSelected.delete(id)
          return { selectedIds: newSelected }
        })
      },

      toggleSelection: (id) => {
        set((state) => {
          const newSelected = new Set(state.selectedIds)
          if (newSelected.has(id)) {
            newSelected.delete(id)
          } else {
            newSelected.add(id)
          }
          return {
            selectedIds: newSelected,
            lastSelectedId: id,
          }
        })
      },

      selectRange: (startId, endId) => {
        const items = get().items
        const startIndex = items.findIndex((item) => item.id === startId)
        const endIndex = items.findIndex((item) => item.id === endId)

        if (startIndex === -1 || endIndex === -1) return

        const minIndex = Math.min(startIndex, endIndex)
        const maxIndex = Math.max(startIndex, endIndex)

        const newSelected = new Set(get().selectedIds)
        for (let i = minIndex; i <= maxIndex; i++) {
          newSelected.add(items[i].id)
        }

        set({
          selectedIds: newSelected,
          lastSelectedId: endId,
        })
      },

      selectAll: () => {
        set((state) => ({
          selectedIds: new Set(state.items.map((item) => item.id)),
        }))
      },

      deselectAll: () => {
        set({ selectedIds: new Set(), lastSelectedId: null })
      },

      clearSelection: () => {
        set({ selectedIds: new Set(), isBulkMode: false, lastSelectedId: null })
      },

      getSelectedCount: () => {
        return get().selectedIds.size
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }))
      },

      resetSettings: () => {
        set({
          settings: {
            pageSize: "letter",
            cardsPerRow: 3,
            rowsPerPage: 3,
            cardWidth: 63,
            cardHeight: 88,
            bleed: 0,
            gap: 2,
            showCutLines: true,
            imageQuality: "high",
            offsetX: 0,
            offsetY: 0,
            bleedMethod: "replicate",
          },
        })
      },

      setIsGenerating: (isGenerating) => {
        set({ isGenerating })
      },

      setGenerationProgress: (progress) => {
        set({ generationProgress: progress })
      },
    }),
    {
      name: "proxymon-proxy-list",
      partialize: (state) => {
        // DEBUG: Log what we're about to persist
        const itemsWithMissingOriginalImage = state.items.filter(
          (item) => !item.originalImage
        )
        if (itemsWithMissingOriginalImage.length > 0) {
          console.warn(
            "[DEBUG partialize] Items missing originalImage:",
            itemsWithMissingOriginalImage.map((i) => ({
              id: i.id,
              name: i.name,
              image: i.image?.slice(0, 50),
            }))
          )
        }
        console.log(
          "[DEBUG partialize] Persisting",
          state.items.length,
          "items"
        )
        console.log(
          "[DEBUG partialize] Sample item:",
          state.items[0]
            ? {
                id: state.items[0].id,
                name: state.items[0].name,
                hasOriginalImage: !!state.items[0].originalImage,
                originalImagePreview: state.items[0].originalImage?.slice(
                  0,
                  50
                ),
                hasImage: !!state.items[0].image,
                imagePreview: state.items[0].image?.slice(0, 50),
              }
            : "no items"
        )

        return {
          items: state.items.map((item) => ({
            ...item,
            image: undefined,
          })),
          settings: state.settings,
          // Don't persist selection state
          selectedIds: new Set(),
          isBulkMode: false,
          lastSelectedId: null,
          // Don't persist generation state
          isGenerating: false,
          generationProgress: null,
        }
      },
      onRehydrateStorage: (state) => {
        // Return the rehydration callback that will receive the state
        return (rehydratedState, error) => {
          if (error) {
            console.error("[DEBUG onRehydrate] Rehydration error:", error)
            return
          }

          if (!rehydratedState) {
            console.log("[DEBUG onRehydrate] No state to rehydrate")
            return
          }

          console.log(
            "[DEBUG onRehydrate] Rehydrating",
            rehydratedState.items?.length ?? 0,
            "items"
          )
          console.log(
            "[DEBUG onRehydrate] Sample item before:",
            rehydratedState.items?.[0]
              ? {
                  id: rehydratedState.items[0].id,
                  name: rehydratedState.items[0].name,
                  hasOriginalImage: !!rehydratedState.items[0].originalImage,
                  originalImagePreview:
                    rehydratedState.items[0].originalImage?.slice(0, 50),
                  hasImage: !!rehydratedState.items[0].image,
                }
              : "no items"
          )

          // Track which items need re-processing (have originalImage)
          const itemsNeedingReprocess: ProxyItem[] = []

          // Restore images from originalImage and track items needing re-processing
          rehydratedState.items =
            rehydratedState.items?.map((item: ProxyItem) => {
              const restoredImage = item.originalImage || item.image
              if (!restoredImage) {
                console.warn(
                  "[DEBUG onRehydrate] Item has no image to restore:",
                  item.id,
                  item.name
                )
              }
              if (!item.originalImage) {
                console.warn(
                  "[DEBUG onRehydrate] Item missing originalImage:",
                  item.id,
                  item.name
                )
              }

              // If item has originalImage, it needs re-processing to restore sharp corners
              if (item.originalImage) {
                itemsNeedingReprocess.push({ ...item, image: restoredImage })
              }

              return {
                ...item,
                image: restoredImage,
              }
            }) ?? []

          console.log(
            "[DEBUG onRehydrate] Sample item after:",
            rehydratedState.items?.[0]
              ? {
                  id: rehydratedState.items[0].id,
                  name: rehydratedState.items[0].name,
                  hasImage: !!rehydratedState.items[0].image,
                  imagePreview: rehydratedState.items[0].image?.slice(0, 50),
                }
              : "no items"
          )

          // Reset selection state
          rehydratedState.selectedIds = new Set()
          rehydratedState.isBulkMode = false
          rehydratedState.lastSelectedId = null
          // Reset generation state
          rehydratedState.isGenerating = false
          rehydratedState.generationProgress = null

          // Trigger async re-processing to restore sharp corners
          // This runs after rehydration and updates items as processing completes
          if (itemsNeedingReprocess.length > 0) {
            console.log(
              "[DEBUG onRehydrate] Scheduling async re-processing for",
              itemsNeedingReprocess.length,
              "items"
            )
            // Use setTimeout to ensure this runs after the current synchronous rehydration
            // and after the store is fully initialized
            setTimeout(() => {
              console.log(
                "[DEBUG onRehydrate] Starting re-processing now, useProxyList exists:",
                typeof useProxyList !== "undefined"
              )
              // Now useProxyList is guaranteed to be initialized
              const store = useProxyList.getState()
              reprocessImagesAfterRehydration(
                itemsNeedingReprocess,
                store.updateItemCard
              )
            }, 100)
          }
        }
      },
    }
  )
)
