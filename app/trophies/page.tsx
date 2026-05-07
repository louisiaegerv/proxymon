import type { Metadata } from "next"
import { TrophiesPageClient } from "./trophies-page-client"

export const metadata: Metadata = {
  title: "Trophy Case | Proxidex",
  description:
    "Collect trophies by using Proxidex. Unlock rare Pokémon card trophies through deck building, exporting, and achievements.",
  openGraph: {
    title: "Trophy Case | Proxidex",
    description:
      "Collect trophies by using Proxidex. Unlock rare Pokémon card trophies through deck building, exporting, and achievements.",
    type: "website",
    url: "https://app.proxidex.com/trophies",
    images: [
      {
        url: "https://app.proxidex.com/api/images/trophy-cards/images/Sableye.webp",
        width: 630,
        height: 880,
        alt: "Proxidex Trophy Case",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trophy Case | Proxidex",
    description:
      "Collect trophies by using Proxidex. Unlock rare Pokémon card trophies through deck building, exporting, and achievements.",
    images: ["https://app.proxidex.com/api/images/trophy-cards/images/Sableye.webp"],
  },
}

export default function TrophiesPage() {
  return <TrophiesPageClient />
}
