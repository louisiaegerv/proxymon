import { findCard } from "./tcgdex"
import type { CardResume } from "@tcgdex/sdk"
import setCodeMappings from "./set-code-mappings.json"

// Set code mapping from Limitless to TCGDex
const LIMITLESS_TO_TCGDEX: Record<string, string> = setCodeMappings

// Extended card type that includes fields returned by Query
interface QueriedCard extends CardResume {
  name: string
  set?: {
    id: string
    name: string
  }
}

export interface DeckListItem {
  quantity: number
  cardName: string
  setCode?: string
  cardNumber?: string
}

export interface ParsedDeckResult {
  item: DeckListItem
  card: QueriedCard | null
  error?: string
}

/**
 * Parse a deck list from common formats:
 * - "4 Charmander OBF 26"
 * - "4 Charmander"
 * - "4x Charmander OBF 26"
 * - "4x Charmander"
 * - "Charmander OBF 26" (assumes quantity 1)
 * - "Charmander" (assumes quantity 1)
 *
 * Also handles special characters and variants like:
 * - "3 Charmeleon ex"
 * - "2 Charizard ex OBF 223"
 * - "1 Darkness Energy sm1 D" (energy cards with letter suffixes)
 */
export function parseDeckList(deckText: string): DeckListItem[] {
  const lines = deckText.trim().split("\n")
  const items: DeckListItem[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Skip category headers (Pokemon, Trainer, Energy, etc.)
    if (
      /^(pok[ée]mon|trainer|energy|item|supporter|stadium|tool|pokémon tool)$/i.test(
        trimmed
      )
    ) {
      continue
    }

    // Try to match: "4 Charmander OBF 26" or "4x Charmander OBF 26"
    // Pattern: quantity [x] name [set number]
    const match = trimmed.match(/^(\d+)(?:x)?\s+(.+)$/i)

    let quantity: number
    let rest: string

    if (match) {
      // Has explicit quantity
      quantity = parseInt(match[1], 10)
      rest = match[2].trim()
    } else {
      // No quantity - assume 1
      quantity = 1
      rest = trimmed
    }

    // Check if there's a set code and card number at the end
    // Pattern: "... OBF 26" or "... OBF026" or "... 026"
    const setNumberMatch = rest.match(
      /^(.*?)\s+([A-Za-z0-9.]+)\s*(\d{1,3}|[A-Z])$/i
    )
    const numberOnlyMatch = rest.match(/^(.*?)\s+(\d{1,3})$/)

    if (setNumberMatch) {
      const rawSetCode = setNumberMatch[2].toUpperCase()
      // Map Limitless set code to TCGDex set code if available
      const mappedSetCode = LIMITLESS_TO_TCGDEX[rawSetCode] || rawSetCode
      items.push({
        quantity,
        cardName: setNumberMatch[1].trim(),
        setCode: mappedSetCode.toLowerCase(),
        cardNumber: setNumberMatch[3],
      })
    } else if (numberOnlyMatch) {
      items.push({
        quantity,
        cardName: numberOnlyMatch[1].trim(),
        cardNumber: numberOnlyMatch[2],
      })
    } else {
      items.push({
        quantity,
        cardName: rest,
      })
    }
  }

  return items
}

/**
 * Search for cards and auto-select the first result for each deck item.
 * Automatically deduplicates cards to avoid redundant API requests.
 *
 * Uses multiple fallback strategies:
 * 1. Try direct card get by set+number
 * 2. Try searching by name + set
 * 3. Try searching by name only
 * 4. Return error if all fallbacks fail
 */
export async function resolveDeckCards(
  items: DeckListItem[]
): Promise<ParsedDeckResult[]> {
  const uniqueKeyMap = new Map<
    string,
    DeckListItem & { totalQuantity: number; originalIndices: number[] }
  >()

  items.forEach((item, index) => {
    const key = `${item.cardName.toLowerCase()}|${item.setCode?.toLowerCase() || ""}|${item.cardNumber || ""}`

    if (uniqueKeyMap.has(key)) {
      const existing = uniqueKeyMap.get(key)!
      existing.totalQuantity += item.quantity
      existing.originalIndices.push(index)
    } else {
      uniqueKeyMap.set(key, {
        ...item,
        totalQuantity: item.quantity,
        originalIndices: [index],
      })
    }
  })

  const uniqueItems = Array.from(uniqueKeyMap.values())
  const results: ParsedDeckResult[] = []
  const resultsByIndex = new Map<number, ParsedDeckResult>()

  console.log(`[Deck Parser] Resolving ${uniqueItems.length} unique card(s)`)

  for (const item of uniqueItems) {
    let selectedCard: QueriedCard | null = null
    let error: string | undefined

    try {
      console.log(
        `[Deck Parser] Searching for: ${item.cardName} (set: ${item.setCode}, number: ${item.cardNumber})`
      )

      // Use findCard with priority-based fallback strategy
      const foundCard = await findCard(
        item.cardName,
        item.setCode,
        item.cardNumber
      )

      if (foundCard) {
        selectedCard = foundCard as QueriedCard
        console.log(
          `[Deck Parser] Found: ${selectedCard.name} (${selectedCard.set?.id} ${selectedCard.localId})`
        )
      } else {
        console.log(`[Deck Parser] Card not found: ${item.cardName}`)
        error = `Card not found: ${item.cardName}${item.setCode ? ` (${item.setCode})` : ""}`
      }
    } catch (err) {
      console.error(`[Deck Parser] Error searching for ${item.cardName}:`, err)
      error = "Search failed"
    }

    const result: ParsedDeckResult = {
      item: {
        ...item,
        quantity: item.totalQuantity,
      },
      card: selectedCard,
      error,
    }

    for (const originalIndex of item.originalIndices) {
      resultsByIndex.set(originalIndex, result)
    }
  }

  const processedKeys = new Set<string>()

  for (let i = 0; i < items.length; i++) {
    const result = resultsByIndex.get(i)
    if (result) {
      const key = `${result.item.cardName.toLowerCase()}|${result.item.setCode?.toLowerCase() || ""}|${result.item.cardNumber || ""}`

      if (!processedKeys.has(key)) {
        results.push(result)
        processedKeys.add(key)
      }
    }
  }

  return results
}

/**
 * Format a deck list from parsed items back to text
 */
export function formatDeckList(items: DeckListItem[]): string {
  return items
    .map((item) => {
      let line = `${item.quantity} ${item.cardName}`
      if (item.setCode) {
        line += ` ${item.setCode}`
        if (item.cardNumber) {
          line += ` ${item.cardNumber}`
        }
      }
      return line
    })
    .join("\n")
}

/**
 * Parse structured deck data (from meta/URL imports) using the same logic as manual entry.
 * This ensures consistent set code mapping across all import methods.
 */
export function parseStructuredDeck(
  cards: Array<{
    quantity: number
    name: string
    setCode?: string
    cardNumber?: string
  }>
): DeckListItem[] {
  // Convert to text format and call parseDeckList to ensure consistent set code mapping
  const deckText = cards
    .map((c) => {
      let line = `${c.quantity} ${c.name}`
      if (c.setCode) {
        line += ` ${c.setCode}`
        if (c.cardNumber) {
          line += ` ${c.cardNumber}`
        }
      }
      return line
    })
    .join("\n")
  return parseDeckList(deckText)
}
