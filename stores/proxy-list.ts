import { create } from "zustand"
import { persist } from "zustand/middleware"
import { getProcessedCardImage } from "@/lib/tcgdex"
import type { ProxyItem, PrintSettings, Deck } from "@/types"

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
  // Multi-deck structure
  decks: Deck[]
  activeDeckId: string | null

  // Deck management methods
  createDeck: (name: string) => string
  switchDeck: (deckId: string) => void
  renameDeck: (deckId: string, name: string) => void
  deleteDeck: (deckId: string) => void
  getActiveDeck: () => Deck | null
  getDeckById: (deckId: string) => Deck | undefined

  // Proxy list methods (operate on active deck)
  getItems: () => ProxyItem[]
  setItems: (items: ProxyItem[]) => void
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
  getItemCount: () => number
  hasItems: () => boolean
  getTotalCardCount: () => number

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

// Storage version for migrations
const STORAGE_VERSION = 2

export const useProxyList = create<ProxyListState>()(
  persist(
    (set, get) => ({
      // Initial state
      decks: [],
      activeDeckId: null,
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

      // Deck management
      createDeck: (name: string) => {
        const now = Date.now()
        const newDeck: Deck = {
          id: `deck-${now}`,
          name,
          items: [],
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          decks: [...state.decks, newDeck],
          activeDeckId: newDeck.id,
        }))

        return newDeck.id
      },

      switchDeck: (deckId: string) => {
        const deck = get().decks.find((d) => d.id === deckId)
        if (!deck) return

        set({
          activeDeckId: deckId,
          selectedIds: new Set(),
          isBulkMode: false,
          lastSelectedId: null,
        })

        // Lazy processing: Check if any items in the target deck need reprocessing
        const itemsNeedingReprocess = deck.items.filter(
          (item) =>
            item.originalImage &&
            (item.image === item.originalImage || !item.image)
        )

        if (itemsNeedingReprocess.length > 0) {
          console.log(
            "[switchDeck] Scheduling re-processing for",
            itemsNeedingReprocess.length,
            "items in deck:",
            deck.name
          )
          // Use setTimeout to ensure this runs after the state update
          setTimeout(() => {
            const store = useProxyList.getState()
            reprocessImagesAfterRehydration(
              itemsNeedingReprocess,
              store.updateItemCard
            )
          }, 100)
        }
      },

      renameDeck: (deckId: string, name: string) => {
        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === deckId ? { ...deck, name, updatedAt: Date.now() } : deck
          ),
        }))
      },

      deleteDeck: (deckId: string) => {
        set((state) => {
          const newDecks = state.decks.filter((d) => d.id !== deckId)
          const newActiveDeckId =
            state.activeDeckId === deckId
              ? newDecks.length > 0
                ? newDecks[0].id
                : null
              : state.activeDeckId

          return {
            decks: newDecks,
            activeDeckId: newActiveDeckId,
            selectedIds: new Set(),
            isBulkMode: false,
            lastSelectedId: null,
          }
        })
      },

      getActiveDeck: () => {
        const { decks, activeDeckId } = get()
        if (!activeDeckId) return null
        return decks.find((d) => d.id === activeDeckId) || null
      },

      getDeckById: (deckId: string) => {
        return get().decks.find((d) => d.id === deckId)
      },

      getItems: () => {
        const { decks, activeDeckId } = get()
        if (!activeDeckId) return []
        const activeDeck = decks.find((d) => d.id === activeDeckId)
        return activeDeck?.items ?? []
      },

      setItems: (items: ProxyItem[]) => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === activeDeck.id
              ? { ...deck, items, updatedAt: Date.now() }
              : deck
          ),
        }))
      },

      // Actions - operate on active deck
      addItem: (card, quantity = 1) => {
        let targetDeckId = get().activeDeckId

        // Auto-create default deck if none exists
        if (!targetDeckId || !get().decks.find((d) => d.id === targetDeckId)) {
          const now = Date.now()
          const defaultDeck: Deck = {
            id: `deck-${now}`,
            name: "Default Deck",
            items: [],
            createdAt: now,
            updatedAt: now,
          }
          set((state) => ({
            decks: [...state.decks, defaultDeck],
            activeDeckId: defaultDeck.id,
          }))
          targetDeckId = defaultDeck.id
        }

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

        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === targetDeckId
              ? {
                  ...deck,
                  items: [...deck.items, ...newItems],
                  updatedAt: Date.now(),
                }
              : deck
          ),
        }))

        const targetDeck = get().decks.find((d) => d.id === targetDeckId)
        console.log(
          "[DEBUG addItem] Items count after add:",
          (targetDeck?.items.length ?? 0) + newItems.length
        )
      },

      removeItem: (id) => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === activeDeck.id
              ? {
                  ...deck,
                  items: deck.items.filter((item) => item.id !== id),
                  updatedAt: Date.now(),
                }
              : deck
          ),
          selectedIds: new Set(
            [...state.selectedIds].filter((sid) => sid !== id)
          ),
        }))
      },

      removeItems: (ids) => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === activeDeck.id
              ? {
                  ...deck,
                  items: deck.items.filter((item) => !ids.includes(item.id)),
                  updatedAt: Date.now(),
                }
              : deck
          ),
          selectedIds: new Set(
            [...state.selectedIds].filter((sid) => !ids.includes(sid))
          ),
        }))
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) return
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === activeDeck.id
              ? {
                  ...deck,
                  items: deck.items.map((item) =>
                    item.id === id ? { ...item, quantity } : item
                  ),
                  updatedAt: Date.now(),
                }
              : deck
          ),
        }))
      },

      updateVariant: (id, variant) => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === activeDeck.id
              ? {
                  ...deck,
                  items: deck.items.map((item) =>
                    item.id === id ? { ...item, variant } : item
                  ),
                  updatedAt: Date.now(),
                }
              : deck
          ),
        }))
      },

      reorderItems: (startIndex, endIndex) => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set((state) => ({
          decks: state.decks.map((deck) => {
            if (deck.id !== activeDeck.id) return deck
            const items = [...deck.items]
            const [removed] = items.splice(startIndex, 1)
            items.splice(endIndex, 0, removed)
            return { ...deck, items, updatedAt: Date.now() }
          }),
        }))
      },

      reorderItemsById: (activeId: string, overId: string) => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set((state) => ({
          decks: state.decks.map((deck) => {
            if (deck.id !== activeDeck.id) return deck
            const items = [...deck.items]
            const activeIndex = items.findIndex((item) => item.id === activeId)
            const overIndex = items.findIndex((item) => item.id === overId)

            if (
              activeIndex === -1 ||
              overIndex === -1 ||
              activeIndex === overIndex
            )
              return deck

            const [removed] = items.splice(activeIndex, 1)
            items.splice(overIndex, 0, removed)
            return { ...deck, items, updatedAt: Date.now() }
          }),
        }))
      },

      updateItemCard: (id, cardData) => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === activeDeck.id
              ? {
                  ...deck,
                  items: deck.items.map((item) =>
                    item.id === id ? { ...item, ...cardData } : item
                  ),
                  updatedAt: Date.now(),
                }
              : deck
          ),
        }))
      },

      clearList: () => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === activeDeck.id
              ? {
                  ...deck,
                  items: [],
                  updatedAt: Date.now(),
                }
              : deck
          ),
          selectedIds: new Set(),
          isBulkMode: false,
          lastSelectedId: null,
        }))
      },

      getTotalCards: () => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return 0
        return activeDeck.items.reduce((sum, item) => sum + item.quantity, 0)
      },

      getItemCount: () => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return 0
        return activeDeck.items.length
      },

      hasItems: () => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return false
        return activeDeck.items.length > 0
      },

      getTotalCardCount: () => {
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return 0
        return activeDeck.items.reduce((sum, item) => sum + item.quantity, 0)
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
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        const items = activeDeck.items
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
        const activeDeck = get().getActiveDeck()
        if (!activeDeck) return

        set(() => ({
          selectedIds: new Set(activeDeck.items.map((item) => item.id)),
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
      version: STORAGE_VERSION,
      migrate: (persistedState, version) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = persistedState as any

        // Migration from v1 to v2: Convert flat items array to decks structure
        if (version < 2 && state.items && Array.isArray(state.items)) {
          console.log(
            "[migrate] Migrating from v1 to v2: Converting items array to decks structure"
          )
          const now = Date.now()
          const migratedDeck: Deck = {
            id: `deck-${now}`,
            name: "Default Deck",
            items: state.items,
            createdAt: now,
            updatedAt: now,
          }
          state.decks = [migratedDeck]
          state.activeDeckId = migratedDeck.id
          delete state.items
        }

        // Ensure decks array exists
        if (!state.decks || !Array.isArray(state.decks)) {
          state.decks = []
        }

        // Ensure at least one deck exists
        if (state.decks.length === 0) {
          const now = Date.now()
          const defaultDeck: Deck = {
            id: `deck-${now}`,
            name: "Default Deck",
            items: [],
            createdAt: now,
            updatedAt: now,
          }
          state.decks = [defaultDeck]
          state.activeDeckId = defaultDeck.id
        }

        // Ensure activeDeckId is valid
        if (
          !state.activeDeckId ||
          !state.decks.find((d: Deck) => d.id === state.activeDeckId)
        ) {
          state.activeDeckId = state.decks[0]?.id || null
        }

        return state
      },
      partialize: (state) => {
        // DEBUG: Log what we're about to persist
        const activeDeck = state.getActiveDeck()
        const itemsToLog = activeDeck?.items ?? []
        const itemsWithMissingOriginalImage = itemsToLog.filter(
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
          itemsToLog.length,
          "items in active deck"
        )

        return {
          decks: state.decks.map((deck) => ({
            ...deck,
            items: deck.items.map((item) => ({
              ...item,
              image: undefined,
            })),
          })),
          activeDeckId: state.activeDeckId,
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
      onRehydrateStorage: () => {
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

          // Migration: Check for old format (items array at root level)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const anyState = rehydratedState as any
          if (anyState.items && Array.isArray(anyState.items)) {
            console.log(
              "[DEBUG onRehydrate] Migrating from old format (v1) to new format (v2)"
            )
            const now = Date.now()
            const migratedDeck: Deck = {
              id: `deck-${now}`,
              name: "Default Deck",
              items: anyState.items,
              createdAt: now,
              updatedAt: now,
            }
            rehydratedState.decks = [migratedDeck]
            rehydratedState.activeDeckId = migratedDeck.id
            // Remove old items property
            delete anyState.items
          }

          // Ensure at least one deck exists
          if (!rehydratedState.decks || rehydratedState.decks.length === 0) {
            const now = Date.now()
            const defaultDeck: Deck = {
              id: `deck-${now}`,
              name: "Default Deck",
              items: [],
              createdAt: now,
              updatedAt: now,
            }
            rehydratedState.decks = [defaultDeck]
            rehydratedState.activeDeckId = defaultDeck.id
          }

          // Ensure activeDeckId is valid
          if (
            !rehydratedState.activeDeckId ||
            !rehydratedState.decks.find(
              (d: Deck) => d.id === rehydratedState.activeDeckId
            )
          ) {
            rehydratedState.activeDeckId = rehydratedState.decks[0]?.id || null
          }

          const activeDeck = rehydratedState.decks.find(
            (d: Deck) => d.id === rehydratedState.activeDeckId
          )
          const itemsToProcess = activeDeck?.items ?? []

          console.log(
            "[DEBUG onRehydrate] Rehydrating",
            itemsToProcess.length,
            "items in active deck"
          )

          // Track which items need re-processing (have originalImage)
          // Only collect items from the active deck since updateItemCard only operates on active deck
          const itemsNeedingReprocess: ProxyItem[] = []

          // Restore images from originalImage and track items needing re-processing
          rehydratedState.decks = rehydratedState.decks.map((deck: Deck) => ({
            ...deck,
            items: deck.items.map((item: ProxyItem) => {
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

              // Only track items from active deck for reprocessing
              // since updateItemCard only operates on the active deck
              if (
                item.originalImage &&
                deck.id === rehydratedState.activeDeckId
              ) {
                itemsNeedingReprocess.push({ ...item, image: restoredImage })
              }

              return {
                ...item,
                image: restoredImage,
              }
            }),
          }))

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
