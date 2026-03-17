<div align="center">

# 🎴 Proxymon



### Pokémon TCG Proxy Card Generator

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**Simplify proxy card printing for Pokémon TCG playtesting, deck building, and collecting**

</div>

<img width="1521" height="934" alt="image" src="https://github.com/user-attachments/assets/8cd74fc5-6904-4412-af1c-bc9ad8987730" />
---

## 📖 Project Overview

Proxymon is a powerful web application designed for easily generating print-ready proxy cards for the Pokémon Trading Card Game. Whether you're a competitive player, deck builder, or casual enthusiast, Proxymon provides everything you need to create professional-quality proxies without the cost of expensive cards.

The application integrates with the comprehensive TCGdex database, offering real-time card search, smart deck list importing, advanced image processing, and customizable PDF generation with proper bleed areas and cut lines.

---

## ✨ Key Features

### 🔍 Card Search & Selection

- **Real-time Search**: Instant results as you type with intelligent matching algorithms
- **Smart Matching**: Three-tier search strategy (exact match → starts with → contains)
- **Set Filtering**: Filter cards by specific Pokémon TCG sets
- **Automatic Image Processing**: Cards are automatically processed to eliminate transparent corners
- **Visual Card Display**: High-quality card images with set information and rarity indicators

### 📋 Deck List Import

- **Multi-Format Support**: Parse various deck list formats including:
  - `"4 Charmander OBF 26"` (with set and number)
  - `"4 Charmander"` (card name only)
  - Standard tournament formats
- **Auto-Resolution**: Automatically resolves cards from the TCGdex database
- **Smart Fallbacks**: Multiple resolution strategies when exact matches aren't found
- **Set Code Mapping**: Automatic conversion of Limitless TCG set codes to TCGdex format
- **Deduplication**: Intelligently combines duplicate entries
- **Error Handling**: Clear feedback for unresolvable cards
- **Batch Processing**: Import entire deck lists in seconds

### 🏆 Limitless TCG Integration

- **Meta Deck Browser**: Browse top 50 tournament decks from Limitless TCG
<img width="313" height="493" alt="image" src="https://github.com/user-attachments/assets/8e4ce9ab-112f-4a7a-8704-209f825999f0" />


- **Pokemon Sprites**: Visual Pokemon icons for easy deck identification
- **Import by URL**: Paste any Limitless TCG deck URL to load cards
<img width="301" height="585" alt="image" src="https://github.com/user-attachments/assets/ccfa9be8-ad2f-4ced-8f66-6362b5fab88b" />

- **Variant Support**: Import specific deck variants (e.g., `?variant=5`)
- **Source-to-Editor Workflow**: Review and edit imported decks before adding to proxy list
- **Load Confirmation**: Choose to replace existing cards or add to current list
- **Recent Imports**: Quick access to previously imported decks

### 👁️ Live Preview

- **Drag-and-Drop Reordering**: Intuitive card arrangement with smooth animations
<img width="551" height="360" alt="image" src="https://github.com/user-attachments/assets/1897bf2f-66eb-4cee-8e5d-f458a8b4f0a2" />

- **Individual Card Movement**: Move single cards independently (not grouped by type)
- **Zoom Controls**: Flexible zoom levels from 50% to 200%
- **Multi-Page Support**: Preview across multiple pages as needed
- **Cut Line Overlay**: Visual guide showing where cards will be cut (can be disabled)
- <img width="101" height="87" alt="image" src="https://github.com/user-attachments/assets/b5e1a837-835c-4d46-b2f3-0e974f821c2f" />
- **Bleed Visualization**: See exactly how bleed areas extend beyond trim size
<img width="1325" height="738" alt="image" src="https://github.com/user-attachments/assets/cabb35ba-829a-4206-b9f4-ddb49294af5d" />

- **Click-to-Change-Variant**: Click any card in preview to quickly change its variant
- **Real-time Updates**: All changes reflected instantly in the preview

### 🎨 Card Variant Selection

<img width="789" height="539" alt="image" src="https://github.com/user-attachments/assets/8aa938d6-ff03-4fba-a92f-213f89f2c8cf" />

- **Complete Variant Browser**: View all card variants across different sets
- **Load-More Pagination**: Efficiently browse through hundreds of variants
- **In-Variant Search**: Filter within variants to find specific versions
- **Visual Selection**: Clear indicators showing currently selected variants
- **Set Information**: Display set name, card number, and rarity for each variant
- **Quick Selection**: Click any variant to instantly update your proxy

### 👁️ Live Preview

- **Drag-and-Drop Reordering**: Intuitive card arrangement with smooth animations
- **Zoom Controls**: Flexible zoom levels from 50% to 200%
- **Multi-Page Support**: Preview across multiple pages as needed
- **Cut Line Overlay**: Visual guide showing where cards will be cut
- **Bleed Visualization**: See exactly how bleed areas extend beyond trim size
- **Click-to-Change-Variant**: Click any card in preview to quickly change its variant
- **Real-time Updates**: All changes reflected instantly in the preview

### 🖨️ Print Sheet Generation

- **High-Resolution Output**: 300 DPI PDFs for professional printing
- **Multiple Page Sizes**: Support for Letter (8.5" × 11") and A4 (210mm × 297mm)
- **Configurable Grids**: Customize layout with 1-4 cards per row and 1-5 rows per page
- **Automatic Bleed Generation**: Three methods for creating bleed areas:
  - **Replicate**: Extends solid color from card edges
  - **Mirror**: Mirrors edge pixels outward
  - **Edge**: Stretches 1px border with auto border detection
- **Dashed Cut Lines**: Professional cut guides for accurate trimming
- **Optimized Layouts**: Smart arrangement to maximize paper usage

### ⚙️ Print Settings

- **Page Configuration**: Choose between Letter and A4 paper sizes
- **Grid Layout**: Customizable rows and columns (1-4 cards/row, 1-5 rows/page)
- **Gap Control**: Adjustable spacing between cards (0-10mm)
- **Bleed Settings**: Configurable bleed amount (0-5mm) with three generation methods
- **Cut Line Customization**: Toggle cut lines on/off with style options
- **Position Offsets**: Fine-tune card positioning with X/Y offset controls
- **Image Quality**: Adjustable quality settings for optimal balance between file size and print quality

### 💾 Profile Management

- **Save Custom Settings**: Create and save multiple print setting profiles
- **Quick Loading**: Instantly switch between saved profiles
- **Persistent Storage**: Settings automatically saved to local storage
- **Reset Options**: Reset to factory defaults or revert to last saved profile
- **Profile Naming**: Custom names for easy identification
- **Profile Management**: Delete or rename profiles as needed

### 🖼️ Image Processing

- **Corner Stretching Algorithm**: Advanced algorithm that preserves card aesthetics while eliminating transparent rounded corners
- **Automatic Border Detection**: Smart detection of card borders for optimal bleed generation
- **Bleed Generation**: Extends card images beyond trim size with three sophisticated methods
- **High-Quality Processing**: Uses Sharp library for professional-grade image manipulation
- **Server-Side Processing**: Efficient API routes handle image processing without browser lag
- **Caching System**: Optimized performance with intelligent image caching

---

## 🎯 Target Audience

Proxymon is designed for:

- **Competitive Players**: Test new deck strategies and combos before investing in expensive cards
- **Deck Builders**: Visualize card layouts and test different configurations
- **Content Creators**: Create educational materials, tutorials, and showcase videos
- **Casual Players**: Try new strategies and have fun with friends without breaking the bank
- **Tournament Players**: Practice with proxies to familiarize yourself with card interactions
- **Collectors**: Create binder pages or display collections without risking valuable cards

---

## 💡 Benefits

- **Professional Quality**: Generate print-ready PDFs with proper bleed areas and cut lines
- **Cost Effective**: Playtest decks without purchasing expensive cards
- **Easy to Use**: Intuitive interface with drag-and-drop functionality
- **Flexible Import**: Support for multiple deck list formats
- **Customizable**: Extensive print settings for different paper sizes and layouts
- **Free to Use**: Leverages open-source TCGdex database at no cost
- **Fast Performance**: Real-time preview with optimized image processing
- **Smart Processing**: Automatic corner elimination eliminates transparent card edges
- **Cross-Platform**: Web-based application works on any modern browser
- **Privacy Focused**: All processing happens locally or on your own server

---

## 🛠️ Technology Stack

### Frontend Framework

- **Next.js 16.1.6**: React framework with server-side rendering and API routes
- **React 19.2.4**: Latest React with improved performance and features
- **TypeScript 5.9.3**: Type-safe development with excellent IDE support

### UI Components & Styling

- **shadcn/ui**: Beautiful, accessible component library built on Radix UI
- **Radix UI Primitives**: Unstyled, accessible UI components
- **Tailwind CSS 4.1.18**: Utility-first CSS framework for rapid development
- **Lucide React**: Beautiful, consistent icons for React applications

### State Management

- **Zustand 5.0.11**: Lightweight state management with persistence middleware
- **React Hooks**: Built-in hooks for component state and effects

### Drag & Drop

- **@dnd-kit/core**: Modern drag and drop library for React
- **@dnd-kit/sortable**: Sortable lists with smooth animations
- **@dnd-kit/utilities**: Utility functions for enhanced drag and drop

### Data & APIs

- **@tcgdex/sdk 2.7.1**: Official SDK for accessing the Pokémon TCG database
- **Next.js API Routes**: Server-side API endpoints for image processing

### Image Processing

- **Sharp 0.34.5**: High-performance Node.js image processing library
- **Custom Algorithms**: Corner stretching and bleed generation algorithms

### PDF Generation

- **pdf-lib 1.17.1**: Create and modify PDF documents in JavaScript
- **jspdf 4.2.0**: Client-side PDF generation for additional flexibility

### Development Tools

- **ESLint 9.39.2**: Code linting and style enforcement
- **Prettier 3.8.1**: Code formatting with Tailwind CSS plugin
- **TypeScript Compiler**: Type checking and compilation

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 18.x or higher
- **pnpm**: Package manager (recommended) or npm/yarn
- **Git**: For cloning the repository

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/proxymon.git
cd proxymon
```

2. **Install dependencies**

Using pnpm (recommended):

```bash
pnpm install
```

Using npm:

```bash
npm install
```

Using yarn:

```bash
yarn install
```

3. **Run the development server**

```bash
pnpm dev
```

Or with npm:

```bash
npm run dev
```

4. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

### Building for Production

```bash
pnpm build
```

Start the production server:

```bash
pnpm start
```

### Type Checking

```bash
pnpm typecheck
```

### Linting

```bash
pnpm lint
```

### Formatting

```bash
pnpm format
```

---

## 📖 Usage Guide

### 1. Adding Cards to Your Proxy List

#### Manual Search

1. Use the search bar to find cards by name
2. Filter by set if needed
3. Click on a card to add it to your proxy list
4. The card will appear in the live preview

#### Import Deck List

1. Switch to the "Deck List" tab
2. Paste your deck list in supported format
3. Click "Add to Proxy List" to process
4. Review and resolve any unresolvable cards

#### Import from Limitless TCG (Meta Decks)

1. Switch to the "Meta Decks" tab
2. Browse the top 50 tournament decks
3. Use Pokemon sprites to visually identify decks
4. Search or sort to find specific decks
5. Click "Load" on any deck to import it
6. Choose to replace existing cards or add to current list

#### Import by URL

1. Switch to the "Import URL" tab
2. Paste a Limitless TCG deck URL (e.g., `https://limitlesstcg.com/decks/284/cards`)
3. Variant URLs are supported (e.g., `?variant=5`)
4. Click "Load into Editor" to fetch the deck
5. Review in the Deck List tab before adding

### 2. Selecting Card Variants

1. Click on any card in your proxy list
2. A modal will appear showing all available variants
3. Browse variants using the search and pagination
4. Click on a variant to select it
5. The card will update with the new variant

### 3. Organizing Your Cards

- **Drag and Drop**: Click and drag cards to reorder them
- **Remove Cards**: Click the delete button on any card
- **Clear All**: Use the clear button to remove all cards

### 4. Configuring Print Settings

1. Open the Print Settings panel
2. Choose your page size (Letter or A4)
3. Set grid layout (rows and columns)
4. Adjust gap and bleed settings
5. Configure cut line preferences
6. Fine-tune position offsets if needed

### 5. Saving Profiles

1. Configure your desired print settings
2. Click "Save Profile"
3. Enter a name for your profile
4. Your settings are now saved and can be loaded anytime

### 6. Generating PDF

1. Review your card layout in the live preview
2. Use zoom controls to inspect details
3. Click "Generate PDF" when ready
4. The PDF will download automatically
5. Print using your preferred printer

### 7. Printing Tips

- Use cardstock or thick paper for better durability
- Ensure your printer is set to actual size (no scaling)
- Cut along dashed lines for accurate sizing
- Consider using a paper cutter for straight edges
- Test print one page first to verify settings

---

## ⚙️ Configuration Options

### Print Settings

| Setting           | Options                 | Description                    |
| ----------------- | ----------------------- | ------------------------------ |
| **Page Size**     | Letter, A4              | Paper size for printing        |
| **Cards per Row** | 1-4                     | Number of cards horizontally   |
| **Rows per Page** | 1-5                     | Number of cards vertically     |
| **Gap**           | 0-10mm                  | Spacing between cards          |
| **Bleed**         | 0-5mm                   | Extra area beyond trim size    |
| **Bleed Method**  | Replicate, Mirror, Edge | How bleed is generated         |
| **Cut Lines**     | On/Off                  | Show cutting guides            |
| **X Offset**      | -50 to 50mm             | Horizontal position adjustment |
| **Y Offset**      | -50 to 50mm             | Vertical position adjustment   |
| **Image Quality** | 0.1-1.0                 | Quality vs file size tradeoff  |

### Bleed Methods Explained

- **Replicate**: Extends the solid color from card edges outward
  - Best for cards with solid borders
  - Fastest processing
  - Cleanest results for most cards

- **Mirror**: Mirrors edge pixels to create a seamless extension
  - Best for cards with gradient borders
  - More complex processing
  - Natural-looking extensions

- **Edge**: Stretches a 1px border with automatic border detection
  - Best for cards with intricate borders
  - Most sophisticated algorithm
  - Highest quality for complex designs

### Zoom Levels

- **50%**: Overview of entire layout
- **75%**: Good for checking overall arrangement
- **100%**: Actual size (recommended)
- **150%**: Detailed inspection
- **200%**: Fine detail checking

---

## 🏗️ Project Structure

```
proxymon/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── generate-bleed/       # Bleed generation endpoint
│   │   ├── limitless/            # Limitless TCG proxy endpoint
│   │   └── process-corners/      # Corner processing endpoint
│   ├── bleed-comparison/         # Bleed comparison tool
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── components/                   # React components
│   ├── card-with-bleed.tsx       # Card with bleed display
│   ├── print-sheet.tsx           # Print sheet component
│   ├── deck/                     # Deck-related components
│   │   ├── deck-input-tabs.tsx   # Tabbed input container
│   │   ├── deck-list-input.tsx   # Deck list text input
│   │   ├── deck-url-import.tsx   # URL import component
│   │   ├── load-confirm-dialog.tsx # Load confirmation dialog
│   │   └── meta-deck-selector.tsx # Meta decks browser
│   ├── proxy/                    # Proxy-related components
│   ├── search/                   # Search-related components
│   └── ui/                       # shadcn/ui components
├── hooks/                        # Custom React hooks
├── lib/                          # Utility libraries
│   ├── deck-parser.ts            # Deck list parsing with fallbacks
│   ├── image-processing.ts       # Image processing utilities
│   ├── limitless.ts              # Limitless TCG integration
│   ├── pdf.ts                    # PDF generation
│   ├── set-code-mappings.json    # Set code mappings (Limitless→TCGdex)
│   ├── tcgdex.ts                 # TCGdex integration
│   └── utils.ts                  # General utilities
├── stores/                       # Zustand state stores
│   ├── profiles.ts               # Profile management
│   └── proxy-list.ts             # Proxy list state
├── types/                        # TypeScript type definitions
└── public/                       # Static assets
```

---

## 🔧 Technical Highlights

### Smart Corner-Stretching Algorithm

The application features a sophisticated corner-stretching algorithm that:

- Preserves the visual aesthetics of Pokémon cards
- Eliminates transparent rounded corners
- Maintains card borders and important details
- Works with various card designs and art styles
- Processes images efficiently on the server

### Bleed Generation Methods

Three advanced methods for generating bleed areas:

1. **Replicate**: Extends solid colors from card edges
2. **Mirror**: Creates seamless extensions by mirroring edge pixels
3. **Edge**: Stretches 1px border with automatic border detection

### Smart Card Resolution

When importing deck lists, the system uses multiple fallback strategies to find cards:

1. **Direct Lookup**: Try exact set + card number match
2. **Name Validation**: Verify card name matches to prevent wrong cards (e.g., avoiding Venusaur EX when looking for Darkness Energy)
3. **Search by Name + Set**: Query TCGdex with card name and set
4. **Search by Name Only**: Broad search across all sets
5. **Synthetic Placeholder**: Create placeholder for energy cards or unknown cards

### Performance Optimizations

- **Debounced Search**: Reduces unnecessary API calls during typing
- **Image Caching**: Stores processed images for faster subsequent loads
- **Lazy Loading**: Loads card images on-demand
- **Persistent State**: Saves application state to local storage
- **Server-Side Processing**: Offloads heavy image processing to the server

### Clean Architecture

- **API Routes**: Dedicated endpoints for image processing
- **State Management**: Centralized state with Zustand
- **Component Separation**: Clear separation of concerns
- **Type Safety**: Full TypeScript coverage
- **Reusable Components**: Modular, composable UI components

---

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute to Proxymon, please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Guidelines

- Follow the existing code style and conventions
- Write clear, descriptive commit messages
- Add tests for new features (if applicable)
- Update documentation as needed
- Ensure all tests pass before submitting

### Reporting Issues

If you find a bug or have a feature request:

1. Check existing issues to avoid duplicates
2. Create a new issue with a clear title
3. Provide detailed information about the problem
4. Include steps to reproduce (for bugs)
5. Suggest possible solutions (for features)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Third-Party Licenses

This project uses open-source libraries with their own licenses:

- TCGdex data is available under their respective terms
- All dependencies are properly credited in package.json

---

## 🙏 Acknowledgments

- **TCGdex**: For providing the comprehensive Pokémon TCG database
- **shadcn/ui**: For the beautiful and accessible UI components
- **Radix UI**: For the excellent primitive components
- **The Pokémon Company**: For creating the Pokémon Trading Card Game
- **The Community**: For feedback, suggestions, and support

---

## 📞 Support

If you need help or have questions:

- Open an issue on GitHub
- Check the documentation
- Review existing discussions

---

## 🗺️ Roadmap

Future enhancements planned for Proxymon:

- [x] **Limitless TCG Integration** - Browse and import meta decks
- [x] **URL Import with Variants** - Import any Limitless deck by URL
- [x] **Pokemon Sprites** - Visual deck identification in meta list
- [x] **Smart Card Resolution** - Multiple fallback strategies for card lookup
- [x] **Individual Card Movement** - Drag single cards independently
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Export to other formats (PNG, JPG)
- [ ] Card back customization
- [ ] Batch variant selection
- [ ] Print queue management
- [ ] Cloud storage integration
- [ ] Mobile app version
- [ ] Advanced deck analysis tools
- [ ] Community deck sharing
- [ ] Deck price estimation
- [ ] Tournament result tracking

---

<div align="center">

**Made with ❤️ for the Pokémon TCG community**

[⬆ Back to Top](#-proxymon)

</div>
