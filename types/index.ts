// App-specific types only - we don't re-export TCGdex types
// Import them directly from '@tcgdex/sdk' where needed

// Our own Card type for the app
export interface Card {
  id: string
  name: string
  localId: string
  image: string | undefined
  illustrator?: string
  category: "Pokemon" | "Trainer" | "Energy"
  rarity?: string
  set: Set
  variants?: {
    firstEdition?: boolean
    holo?: boolean
    normal?: boolean
    reverse?: boolean
    wPromo?: boolean
  }
  // Pokemon specific
  hp?: number
  types?: string[]
  evolveFrom?: string
  stage?: string
  attacks?: Attack[]
  weaknesses?: Weakness[]
  resistances?: Resistance[]
  retreat?: number
  dexId?: number[]
  description?: string
  // Trainer/Energy specific
  effect?: string
  trainerType?: string
  energyType?: string
}

// Set type
export interface Set {
  id: string
  name: string
  logo?: string
  symbol?: string
  cardCount: {
    official: number
    total: number
  }
  releaseDate?: string
}

export interface Attack {
  name: string
  cost?: string[]
  damage?: string
  effect?: string
}

export interface Weakness {
  type: string
  value: string
}

export interface Resistance {
  type: string
  value: string
}

// App-specific types
export interface ProxyItem {
  id: string
  cardId: string
  name: string
  image: string | undefined // Processed image (no transparent corners)
  originalImage?: string | undefined // Original TCGdex URL (for reference)
  setName: string
  setId: string
  localId: string
  quantity: number
  variant: "normal" | "holo" | "reverse"
}

export type BleedMethod = "replicate" | "mirror" | "edge"

export interface PrintSettings {
  pageSize: "letter" | "a4"
  cardsPerRow: number
  rowsPerPage: number
  cardWidth: number // in mm
  cardHeight: number // in mm
  bleed: number // in mm - extends image past cut line
  gap: number // in mm
  showCutLines: boolean
  // Cut line color (default: emerald green #10b981)
  cutLineColor?: { r: number; g: number; b: number }
  // Cut line stroke width (default: 1.5)
  cutLineWidth?: number
  // How far lines extend past card edges in mm (default: 8)
  cutLineLength?: number
  // Whether lines appear in front of or behind cards (default: 'behind')
  cutLinePosition?: "front" | "behind"
  imageQuality: "low" | "high"
  offsetX: number // in mm, negative = left, positive = right
  offsetY: number // in mm, negative = up, positive = down
  bleedMethod: BleedMethod // Method to extend canvas for bleed area
  // Color for replicate method (if not provided, auto-detected from border)
  bleedColor?: { r: number; g: number; b: number }
}

export const OFFSET_LIMITS = {
  min: -200,
  max: 200,
  step: 0.5,
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  pageSize: "letter",
  cardsPerRow: 3,
  rowsPerPage: 3,
  cardWidth: 63,
  cardHeight: 88,
  bleed: 0,
  gap: 2,
  showCutLines: true,
  cutLineColor: { r: 16, g: 185, b: 129 }, // Emerald-500 (#10b981)
  cutLineWidth: 1.5,
  cutLineLength: 8,
  cutLinePosition: "behind",
  imageQuality: "high",
  offsetX: 0,
  offsetY: 0,
  bleedMethod: "replicate",
}

// Page dimensions in mm
export const PAGE_DIMENSIONS = {
  letter: { width: 216, height: 279 },
  a4: { width: 210, height: 297 },
}
