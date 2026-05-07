/**
 * Proxidex Trophy Case Definitions
 *
 * Metal Pokemon cards as collectible trophies that users unlock through:
 * 1. Tier purchases (Founding Trainer, Champion, Gym Leader)
 * 2. App achievements (deck building, exporting, searching, etc.)
 */

import { TROPHY_MEDIA } from "./trophy-media"

export type TrophyRarity = "common" | "uncommon" | "rare" | "holo" | "legendary"
export type TrophyCategory = "tier" | "achievement"

export interface TrophyDefinition {
  id: string
  name: string
  description: string
  category: TrophyCategory
  rarity: TrophyRarity
  image: string
  condition: string
  // For tier trophies: which subscription tier unlocks it
  tier?: string
  // For achievement trophies: how many actions needed
  target?: number
  // Optional video URLs (thumbnail = 360p, detail = 720p)
  video?: {
    thumbnail: string
    detail: string
  }
}

// ============================================================================
// TIER TROPHIES (Unlocked by purchasing a subscription)
// ============================================================================

export const TIER_TROPHIES: TrophyDefinition[] = [
  {
    id: "founding_alpha",
    name: "Founding Trainer Alpha",
    description:
      "One of the first 100 believers. A gold commemorative trophy for early supporters.",
    category: "tier",
    rarity: "legendary",
    image: TROPHY_MEDIA.Pikachu1.image,
    condition: "Purchase Founding Trainer Alpha tier",
    tier: "founding_alpha",
    video: TROPHY_MEDIA.Pikachu1.video,
  },
  {
    id: "founding_beta",
    name: "Founding Trainer Beta",
    description:
      "One of the first 250 supporters. A silver commemorative trophy.",
    category: "tier",
    rarity: "legendary",
    image: TROPHY_MEDIA.Lugia.image,
    condition: "Purchase Founding Trainer Beta tier",
    tier: "founding_beta",
    video: TROPHY_MEDIA.Lugia.video,
  },
  {
    id: "founding_gamma",
    name: "Founding Trainer Gamma",
    description:
      "One of the first 500 supporters. A bronze commemorative trophy.",
    category: "tier",
    rarity: "legendary",
    image: TROPHY_MEDIA.Charizard.image,
    condition: "Purchase Founding Trainer Gamma tier",
    tier: "founding_gamma",
    video: TROPHY_MEDIA.Charizard.video,
  },
  {
    id: "champion",
    name: "Champion",
    description:
      "Lifetime access to Proxidex. A purple-gold trophy for true Champions.",
    category: "tier",
    rarity: "holo",
    image: TROPHY_MEDIA.Rayquaza.image,
    condition: "Purchase Champion (Lifetime) tier",
    tier: "lifetime",
    video: TROPHY_MEDIA.Rayquaza.video,
  },
  {
    id: "gym_leader",
    name: "Gym Leader",
    description:
      "Annual Season Pass holder. A blue-silver trophy for dedicated Gym Leaders.",
    category: "tier",
    rarity: "holo",
    image: TROPHY_MEDIA.Tyranitar.image,
    condition: "Purchase Gym Leader (Annual) tier",
    tier: "annual",
    video: TROPHY_MEDIA.Tyranitar.video,
  },
]

// ============================================================================
// ACHIEVEMENT TROPHIES (Unlocked through app usage)
// ============================================================================

export const ACHIEVEMENT_TROPHIES: TrophyDefinition[] = [
  {
    id: "first_visit",
    name: "Jewel Hoarder",
    description:
      "Sableye spotted your curiosity. You discovered the Trophy Case and claimed your first jewel.",
    category: "achievement",
    rarity: "uncommon",
    image: TROPHY_MEDIA.Sableye.image,
    condition: "Open the Trophy Case for the first time",
    target: 1,
    video: TROPHY_MEDIA.Sableye.video,
  },
  {
    id: "first_deck",
    name: "First Steps",
    description: "Create your very first deck in Proxidex.",
    category: "achievement",
    rarity: "common",
    image: TROPHY_MEDIA.Bulbasaur.image,
    condition: "Create 1 deck",
    target: 1,
    video: TROPHY_MEDIA.Bulbasaur.video,
  },
  {
    id: "deck_collector",
    name: "Deck Collector",
    description: "Save 5 different decks to your collection.",
    category: "achievement",
    rarity: "uncommon",
    image: TROPHY_MEDIA.Venusaur.image,
    condition: "Save 5 decks",
    target: 5,
  },
  {
    id: "first_export",
    name: "Print Master",
    description: "Export your first print-ready HTML file.",
    category: "achievement",
    rarity: "common",
    image: TROPHY_MEDIA.Blastoise.image,
    condition: "Export 1 print file",
    target: 1,
    video: TROPHY_MEDIA.Blastoise.video,
  },
  {
    id: "export_veteran",
    name: "Export Veteran",
    description: "Export 10 print files. You know your way around the printer.",
    category: "achievement",
    rarity: "rare",
    image: TROPHY_MEDIA.Groudon.image,
    condition: "Export 10 print files",
    target: 10,
    video: TROPHY_MEDIA.Groudon.video,
  },
  {
    id: "limitless_import",
    name: "Meta Chaser",
    description: "Import a deck directly from Limitless TCG.",
    category: "achievement",
    rarity: "uncommon",
    image: TROPHY_MEDIA.Espeon.image,
    condition: "Import 1 Limitless TCG deck",
    target: 1,
    video: TROPHY_MEDIA.Espeon.video,
  },
  {
    id: "meta_chaser",
    name: "Meta Analyst",
    description: "Import 3 different meta decks from Limitless TCG.",
    category: "achievement",
    rarity: "rare",
    image: TROPHY_MEDIA.Metagross.image,
    condition: "Import 3 meta decks",
    target: 3,
  },
  {
    id: "search_pro",
    name: "Search Pro",
    description: "Search for cards 50 times. You know what you're looking for.",
    category: "achievement",
    rarity: "uncommon",
    image: TROPHY_MEDIA.Kyogre.image,
    condition: "Search 50 times",
    target: 50,
    video: TROPHY_MEDIA.Kyogre.video,
  },
  {
    id: "print_master",
    name: "Settings Tinkerer",
    description: "Use all available print settings at least once.",
    category: "achievement",
    rarity: "rare",
    image: TROPHY_MEDIA.Mewtwo.image,
    condition: "Try all print settings",
    target: 1,
    video: TROPHY_MEDIA.Mewtwo.video,
  },
  {
    id: "master_collector",
    name: "Master Collector",
    description:
      "Unlock every other trophy in the collection. The ultimate achievement.",
    category: "achievement",
    rarity: "legendary",
    image: TROPHY_MEDIA.Arceus2.image,
    condition: "Unlock all other trophies",
    target: 1,
  },
]

// ============================================================================
// Combined
// ============================================================================

export const ALL_TROPHIES: TrophyDefinition[] = [
  ...TIER_TROPHIES,
  ...ACHIEVEMENT_TROPHIES,
]

export const TROPHY_MAP = new Map(ALL_TROPHIES.map((t) => [t.id, t]))

export function getTrophyById(id: string): TrophyDefinition | undefined {
  return TROPHY_MAP.get(id)
}

export function getTierTrophyForSubscription(
  tier: string
): TrophyDefinition | undefined {
  return TIER_TROPHIES.find((t) => t.tier === tier)
}

export function getAllTrophyIds(): string[] {
  return ALL_TROPHIES.map((t) => t.id)
}

export function getAchievementTrophyIds(): string[] {
  return ACHIEVEMENT_TROPHIES.map((t) => t.id)
}

export function getTierTrophyIds(): string[] {
  return TIER_TROPHIES.map((t) => t.id)
}

// Rarity visual config (colors, particles, etc.)
export const RARITY_CONFIG: Record<
  TrophyRarity,
  {
    label: string
    color: string
    glowColor: string
    borderColor: string
    particleCount: number
  }
> = {
  common: {
    label: "Common",
    color: "#94a3b8",
    glowColor: "rgba(148, 163, 184, 0.3)",
    borderColor: "border-slate-500/30",
    particleCount: 0,
  },
  uncommon: {
    label: "Uncommon",
    color: "#22c55e",
    glowColor: "rgba(34, 197, 94, 0.3)",
    borderColor: "border-green-500/30",
    particleCount: 2,
  },
  rare: {
    label: "Rare",
    color: "#3b82f6",
    glowColor: "rgba(59, 130, 246, 0.4)",
    borderColor: "border-blue-500/30",
    particleCount: 4,
  },
  holo: {
    label: "Holo Rare",
    color: "#a855f7",
    glowColor: "rgba(168, 85, 247, 0.5)",
    borderColor: "border-purple-500/40",
    particleCount: 6,
  },
  legendary: {
    label: "Legendary",
    color: "#f59e0b",
    glowColor: "rgba(245, 158, 11, 0.6)",
    borderColor: "border-amber-500/50",
    particleCount: 8,
  },
}
