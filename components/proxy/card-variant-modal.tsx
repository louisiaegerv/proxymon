"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Loader2, ChevronDown } from "lucide-react"
import { tcgdex, getFullImageUrl, getProcessedCardImage } from "@/lib/tcgdex"
import { useProxyList } from "@/stores/proxy-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Query } from "@tcgdex/sdk"
import type { CardResume } from "@tcgdex/sdk"

// Extended card type that includes fields returned by Query
// The TCGdex Query API returns full Card objects, not just CardResume
interface QueriedCard {
  id: string
  localId: string
  name: string
  image?: string
  set?: {
    id: string
    name: string
  }
}

interface CardVariantModalProps {
  isOpen: boolean
  onClose: () => void
  cardId: string | null
  itemId: string | null
}

interface VariantCard {
  id: string
  name: string
  localId: string
  image?: string
  setName: string
  setId: string
}

const INITIAL_LOAD_COUNT = 12
const LOAD_MORE_COUNT = 12

export function CardVariantModal({
  isOpen,
  onClose,
  cardId,
  itemId,
}: CardVariantModalProps) {
  const [variants, setVariants] = useState<VariantCard[]>([])
  const [allMatchingCards, setAllMatchingCards] = useState<QueriedCard[]>([])
  const [cardsWithImagesCount, setCardsWithImagesCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentCardDetails, setCurrentCardDetails] =
    useState<VariantCard | null>(null)
  const processedIndexRef = useRef(0)

  const updateItemCard = useProxyList((state) => state.updateItemCard)
  const items = useProxyList((state) => state.getActiveDeck()?.items ?? [])

  const currentItem = items.find((item) => item.id === itemId)

  // Helper function to load cards from a starting index until we have enough with images
  const loadCardsWithImages = useCallback(
    async (
      matchingCards: QueriedCard[],
      startIndex: number,
      targetCount: number
    ): Promise<{ variants: VariantCard[]; nextIndex: number }> => {
      const newVariants: VariantCard[] = []
      let currentIndex = startIndex

      // Filter to only cards with images, starting from startIndex
      while (
        newVariants.length < targetCount &&
        currentIndex < matchingCards.length
      ) {
        const card = matchingCards[currentIndex]

        if (card.image) {
          // If set data is missing from query result, fetch the full card
          // The Card object includes set info (SetResume) with name and id
          let setName = card.set?.name
          let setId = card.set?.id

          if (!setName || !setId) {
            try {
              console.log(`[Variant Modal] Fetching set data for: ${card.id}`)
              const fullCard = await tcgdex.card.get(card.id)
              if (fullCard) {
                // fullCard.set contains SetResume with name and id
                // (we could use fullCard.getSet() for full Set details, but set is sufficient)
                setName = fullCard.set?.name || "Unknown"
                setId = fullCard.set?.id || ""
              }
            } catch {
              // Fallback: parse from image URL if possible
              // URL format: https://assets.tcgdex.net/en/{series}/{set}/{localId}
              const urlParts = card.image?.split("/")
              if (urlParts && urlParts.length >= 6) {
                setId = urlParts[urlParts.length - 2] || ""
              }
              setName = setId?.toUpperCase() || "Unknown"
            }
          }

          newVariants.push({
            id: card.id,
            name: card.name || "Unknown",
            localId: card.localId,
            image: card.image,
            setName: setName || "Unknown",
            setId: setId || "",
          })
        }

        currentIndex++
      }

      return { variants: newVariants, nextIndex: currentIndex }
    },
    []
  )

  // Load more variants
  const loadMore = useCallback(async () => {
    if (isLoadingMore || allMatchingCards.length === 0) return

    setIsLoadingMore(true)

    const { variants: newVariants, nextIndex } = await loadCardsWithImages(
      allMatchingCards,
      processedIndexRef.current,
      LOAD_MORE_COUNT
    )

    processedIndexRef.current = nextIndex
    setVariants((prev) => [...prev, ...newVariants])
    setIsLoadingMore(false)
  }, [allMatchingCards, isLoadingMore, loadCardsWithImages])

  useEffect(() => {
    if (!isOpen || !currentItem) return

    async function loadVariants() {
      setIsLoading(true)
      processedIndexRef.current = 0
      try {
        // Search for cards with the same name using server-side query
        // The Query API returns full Card objects with set data included
        const queryBuilder = Query.create().like("name", currentItem!.name)
        let matchingCards = (await tcgdex.card.list(queryBuilder)) || []

        console.log(
          `[Variant Modal] Found ${matchingCards.length} matching cards for: ${currentItem!.name}`
        )

        // Sort to prioritize exact matches first, then starts with, then contains
        const searchName = currentItem!.name.toLowerCase()
        matchingCards = matchingCards.sort((a, b) => {
          const aName = (a.name || "").toLowerCase()
          const bName = (b.name || "").toLowerCase()
          const aExact = aName === searchName
          const bExact = bName === searchName
          const aStartsWith = aName.startsWith(searchName)
          const bStartsWith = bName.startsWith(searchName)

          // Exact matches come first
          if (aExact && !bExact) return -1
          if (bExact && !aExact) return 1

          // Then starts with
          if (aStartsWith && !bStartsWith) return -1
          if (bStartsWith && !aStartsWith) return 1

          // Otherwise maintain original order (stable sort)
          return 0
        })

        setAllMatchingCards(matchingCards as QueriedCard[])

        // Load initial batch of cards with images
        const { variants: initialVariants, nextIndex } =
          await loadCardsWithImages(
            matchingCards as QueriedCard[],
            0,
            INITIAL_LOAD_COUNT
          )

        processedIndexRef.current = nextIndex
        setVariants(initialVariants)

        // Find current card details from loaded variants
        const currentVariant = initialVariants.find(
          (v) => v.id === currentItem?.cardId
        )
        if (currentVariant) {
          setCurrentCardDetails(currentVariant)
        }

        // Count total cards with images (simpler now since we have Card objects)
        const cardsWithImages = matchingCards.filter(
          (card) => card.image
        ).length
        setCardsWithImagesCount(cardsWithImages)
      } catch (error) {
        console.error("Error loading variants:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadVariants()
    setSearchQuery("")
    setCardsWithImagesCount(0)
  }, [isOpen, currentItem, loadCardsWithImages])

  const handleSelectVariant = async (variant: VariantCard) => {
    if (!itemId) return

    setIsProcessing(true)

    try {
      // Process image to stretch corners (mandatory preprocessing)
      const processedImage = await getProcessedCardImage(variant.image, "high")

      updateItemCard(itemId, {
        cardId: variant.id,
        name: variant.name,
        image: processedImage,
        originalImage: variant.image,
        setName: variant.setName,
        setId: variant.setId,
        localId: variant.localId,
      })
      onClose()
    } catch (error) {
      console.error("Error processing variant image:", error)
      // Fallback: update without processing
      updateItemCard(itemId, {
        cardId: variant.id,
        name: variant.name,
        image: variant.image,
        originalImage: variant.image,
        setName: variant.setName,
        setId: variant.setId,
        localId: variant.localId,
      })
      onClose()
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredVariants = searchQuery
    ? variants.filter(
        (v) =>
          v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.setName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : variants

  // Calculate remaining cards to load
  const remainingToLoad = cardsWithImagesCount - variants.length

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && onClose()}>
      <DialogContent className="max-h-[80vh] max-w-3xl border-slate-800 bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            Change Card Variant
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Search within variants */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Search variants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-slate-700 bg-slate-800 pl-10 text-slate-100"
            />
          </div>

          {/* Current selection */}
          {currentItem && (
            <div className="flex items-center gap-3 rounded-lg border border-blue-800 bg-blue-900/20 p-3">
              <div className="h-16 w-11 flex-shrink-0 overflow-hidden rounded bg-slate-800">
                {currentItem.image && (
                  <img
                    src={getFullImageUrl(currentItem.image, "low", "webp")}
                    alt={currentItem.name}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div>
                <p className="font-medium text-slate-200">{currentItem.name}</p>
                <p className="text-sm text-slate-500">
                  {currentCardDetails
                    ? `${currentCardDetails.setName} (${currentCardDetails.setId}) · #${currentCardDetails.localId}`
                    : `${currentItem.setName} (${currentItem.setId}) · #${currentItem.localId}`}
                </p>
              </div>
              <div className="ml-auto text-xs text-blue-400">Current</div>
            </div>
          )}

          {/* Variants grid */}
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center text-slate-500">
                Loading variants...
              </div>
            ) : filteredVariants.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-slate-500">
                No variants found
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {filteredVariants.map((variant) => {
                    const imageUrl = getFullImageUrl(
                      variant.image,
                      "low",
                      "webp"
                    )
                    const isCurrent = variant.id === currentItem?.cardId

                    return (
                      <button
                        key={variant.id}
                        onClick={() => handleSelectVariant(variant)}
                        className={`group relative overflow-hidden rounded-lg transition-all ${
                          isCurrent
                            ? "ring-2 ring-blue-500"
                            : "hover:ring-2 hover:ring-slate-600"
                        }`}
                      >
                        <div className="aspect-[63/88] bg-slate-800">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={variant.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-600">
                              No Image
                            </div>
                          )}
                        </div>
                        {isCurrent && (
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                            <div className="rounded bg-blue-500 px-2 py-1 text-xs text-white">
                              Current
                            </div>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Load More Button */}
                {!searchQuery && remainingToLoad > 0 && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-2 h-4 w-4" />
                          Load More (
                          {Math.min(LOAD_MORE_COUNT, remainingToLoad)} more)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="text-center text-xs text-slate-500">
            {searchQuery
              ? `Showing ${filteredVariants.length} of ${variants.length} loaded variants`
              : cardsWithImagesCount > 0
                ? `Showing ${variants.length} of ${cardsWithImagesCount} variants with images`
                : `Showing ${variants.length} variants`}
          </div>
        </div>

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-950/80">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="text-sm text-slate-300">
                Processing image...
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
