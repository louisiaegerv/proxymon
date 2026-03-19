import TCGdex, { Query } from "@tcgdex/sdk"

// Initialize TCGdex client with English language
export const tcgdex = new TCGdex("en")

// Helper function to get full image URL from TCGdex base URL
// TCGdex returns base URL like: https://assets.tcgdex.net/en/swsh/swsh3/136
// We need to append /high.png or /low.webp
//
// Also handles data URLs and absolute URLs (returns them as-is)
export function getFullImageUrl(
  baseUrl: string | undefined,
  quality: "low" | "high" = "high",
  extension: "png" | "webp" = "png"
): string | undefined {
  if (!baseUrl) return undefined

  // If it's already a data URL or absolute URL with extension, return as-is
  if (baseUrl.startsWith("data:")) {
    return baseUrl
  }

  // If it already ends with an image extension, it's likely a full URL
  if (baseUrl.match(/\.(png|webp|jpg|jpeg)(\?.*)?$/i)) {
    return baseUrl
  }

  // Otherwise, append quality and extension (TCGdex format)
  return `${baseUrl}/${quality}.${extension}`
}

// Helper function to search cards with filters
export async function searchCards(
  query: string,
  options?: {
    setId?: string
    type?: string
    rarity?: string
  }
) {
  try {
    let cards = []

    // Build query to filter server-side
    const queryBuilder = Query.create()

    // If set is specified, filter by set using contains for better matching
    if (options?.setId && options.setId !== "all") {
      queryBuilder.contains("set.id", options.setId)
    }

    // Filter by name using 'contains' for partial matching
    if (query) {
      queryBuilder.contains("name", query)
    }

    console.log(`[TCGdex API] Searching cards with query: "${query}"`)
    cards = await tcgdex.card.list(queryBuilder)

    // Sort to prioritize exact matches first, then starts with, then contains
    if (query && cards) {
      const lowerQuery = query.toLowerCase()
      cards = cards.sort((a, b) => {
        // Handle cases where name might not be present
        const aName = (a.name || "").toLowerCase()
        const bName = (b.name || "").toLowerCase()
        const aExact = aName === lowerQuery
        const bExact = bName === lowerQuery
        const aStartsWith = aName.startsWith(lowerQuery)
        const bStartsWith = bName.startsWith(lowerQuery)

        // Exact matches come first
        if (aExact && !bExact) return -1
        if (bExact && !aExact) return 1

        // Then starts with
        if (aStartsWith && !bStartsWith) return -1
        if (bStartsWith && !aStartsWith) return 1

        // Otherwise maintain original order (stable sort)
        return 0
      })
    }

    return cards || []
  } catch (error) {
    console.error("Error searching cards:", error)
    return []
  }
}

// Fetch all sets
export async function getSets() {
  try {
    console.log("[TCGdex API] Fetching all sets")
    const sets = await tcgdex.set.list()
    // Sort by name since SetResume doesn't have releaseDate
    return sets.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error("Error fetching sets:", error)
    return []
  }
}

// Fetch single card details by direct ID lookup
export async function getCard(cardId: string) {
  try {
    console.log(`[TCGdex API] Fetching card: ${cardId}`)
    const card = await tcgdex.card.get(cardId)
    return card
  } catch (error) {
    console.error("Error fetching card:", error)
    return null
  }
}

/**
 * Find a card using a priority-based fallback strategy for better matching.
 * This is useful for deck imports where we have name + set info but not the exact ID.
 *
 * Priority order:
 * 1. Search by name + setCode + localId (e.g., "Pikachu" + "swsh11" + "123")
 * 2. Search by name + setCode (e.g., "Pikachu" + "swsh11")
 * 3. Search by name only
 * 4. Return null if not found
 *
 * @param name - Card name to search for
 * @param setCode - Set code (e.g., "swsh11")
 * @param localId - Local card ID within the set (e.g., "123")
 * @returns The found card or null if not found
 */
export async function findCard(
  name: string,
  setCode?: string,
  localId?: string
) {
  try {
    console.log(
      `[TCGdex API] Finding card: "${name}" (set: ${setCode}, localId: ${localId})`
    )

    // Priority 1: Search by name + setCode + localId
    if (name && setCode && localId) {
      // First try with original localId using localId field + set.id
      const queryBuilder = Query.create()
        .contains("name", name)
        .contains("localId", localId)
        .contains("set.id", setCode)

      console.log(
        `[TCGdex API] Priority 1: Searching by name + set.id + localId`
      )
      const cards = await tcgdex.card.list(queryBuilder)

      if (cards && cards.length > 0) {
        console.log(
          `[TCGdex API] Found card with Priority 1: ${cards[0].name} (${cards[0].id})`
        )
        return cards[0]
      }

      // If no results and localId is numeric, try with padded version (3 digits)
      // Example: "95" → "095"
      if (/^\d+$/.test(localId)) {
        const paddedLocalId = localId.padStart(3, "0")
        const paddedQueryBuilder = Query.create()
          .contains("name", name)
          .contains("localId", paddedLocalId)
          .contains("set.id", setCode)

        console.log(
          `[TCGdex API] Priority 1b: Trying with padded localId: ${paddedLocalId}`
        )
        const paddedCards = await tcgdex.card.list(paddedQueryBuilder)

        if (paddedCards && paddedCards.length > 0) {
          console.log(
            `[TCGdex API] Found card with Priority 1b: ${paddedCards[0].name} (${paddedCards[0].id})`
          )
          return paddedCards[0]
        }
      }
    }

    // Priority 2: Search by name + setCode
    if (name && setCode) {
      const queryBuilder = Query.create()
        .contains("name", name)
        .contains("set.id", setCode)

      console.log(`[TCGdex API] Priority 2: Searching by name + set.id`)
      const cards = await tcgdex.card.list(queryBuilder)

      if (cards && cards.length > 0) {
        console.log(
          `[TCGdex API] Found card with Priority 2: ${cards[0].name} (${cards[0].id})`
        )
        return cards[0]
      }
    }

    // Priority 3: Search by name only
    if (name) {
      const queryBuilder = Query.create().contains("name", name)

      console.log(`[TCGdex API] Priority 3: Searching by name only`)
      const cards = await tcgdex.card.list(queryBuilder)

      if (cards && cards.length > 0) {
        console.log(
          `[TCGdex API] Found card with Priority 3: ${cards[0].name} (${cards[0].id})`
        )
        return cards[0]
      }
    }

    // Priority 4: Not found
    console.log(`[TCGdex API] Card not found: "${name}"`)
    return null
  } catch (error) {
    console.error(`[TCGdex API] Error finding card "${name}":`, error)
    return null
  }
}

/**
 * Fetch and process card image - stretches transparent corners
 * This is the primary function for getting card images for the proxy list
 *
 * Calls the /api/process-corners endpoint to handle the image processing server-side.
 *
 * @param baseUrl - Base image URL from TCGdex
 * @param quality - Image quality ('low' or 'high')
 * @returns Base64 data URL of processed image, or undefined if failed
 */
export async function getProcessedCardImage(
  baseUrl: string | undefined,
  quality: "low" | "high" = "high"
): Promise<string | undefined> {
  if (!baseUrl) return undefined

  // Construct full image URL
  const imageUrl = getFullImageUrl(baseUrl, quality, "png")
  if (!imageUrl) return undefined

  try {
    // Call API to process corners
    const response = await fetch("/api/process-corners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to process image")
    }

    const data = await response.json()
    return data.image
  } catch (error) {
    console.error("Error processing card image:", error)
    // Fallback to original URL if processing fails
    return imageUrl
  }
}
