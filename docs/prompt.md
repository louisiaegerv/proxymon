1. Console Error

State loaded from storage couldn't be migrated since no migrate function was provided
stores/proxy-list.ts (135:35) @ module evaluation

133 | const STORAGE_VERSION = 2
134 |

> 135 | export const useProxyList = create<ProxyListState>()(

      |                                   ^

136 | persist(
137 | (set, get) => ({
138 | // Initial state
Call Stack
33

Show 30 ignore-listed frame(s)
module evaluation
stores/proxy-list.ts (135:35)
module evaluation
components/deck/deck-sidebar.tsx (6:1)
module evaluation
app/page.tsx (4:1)

2. Type Error
   Cannot destructure property 'decks' of 'get(...)' as it is undefined.
   stores/proxy-list.ts (142:17) @ get items

140 | activeDeckId: null,
141 | get items() {

> 142 | const { decks, activeDeckId } = get()

      |                 ^

143 | if (!activeDeckId) return []
144 | const activeDeck = decks.find((d) => d.id === activeDeckId)
145 | return activeDeck?.items ?? []
Call Stack
32

Show 28 ignore-listed frame(s)
get items
stores/proxy-list.ts (142:17)
module evaluation
stores/proxy-list.ts (135:35)
module evaluation
components/deck/deck-sidebar.tsx (6:1)
module evaluation
app/page.tsx (4:1)

3. Console Error
   The result of getSnapshot should be cached to avoid an infinite loop
   components/deck/deck-sidebar.tsx (36:29) @ DeckSidebar

34 | const addItem = useProxyList((state) => state.addItem)
35 | const clearList = useProxyList((state) => state.clearList)

> 36 | const items = useProxyList((state) => state.items)

     |                             ^

37 | const totalCards = useProxyList((state) => state.getTotalCards)()
38 | const reorderItems = useProxyList((state) => state.reorderItems)
39 | const removeItems = useProxyList((state) => state.removeItems)
Call Stack
22

Show 20 ignore-listed frame(s)
DeckSidebar
components/deck/deck-sidebar.tsx (36:29)
Home
app/page.tsx (84:11)

4. Console Error
   Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
   components/deck/deck-sidebar.tsx (226:7) @ DeckSidebar

224 |
225 | {/_ Add Cards Modal _/}

> 226 | <AddCardsModal

      |       ^

227 | isOpen={isAddModalOpen}
228 | onClose={() => setIsAddModalOpen(false)}
229 | onAddCards={handleAddCards}
Call Stack
53

Show 51 ignore-listed frame(s)
DeckSidebar
components/deck/deck-sidebar.tsx (226:7)
Home
app/page.tsx (84:11)

5. Runtime Error
   Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.
   components/deck/deck-sidebar.tsx (230:7) @ DeckSidebar

228 |
229 | {/_ Add Cards Modal _/}

> 230 | <AddCardsModal

      |       ^

231 | isOpen={isAddModalOpen}
232 | onClose={() => setIsAddModalOpen(false)}
233 | onAddCards={handleAddCards}
Call Stack
53

Show 51 ignore-listed frame(s)
DeckSidebar
components/deck/deck-sidebar.tsx (230:7)
Home
app/page.tsx (84:11)
