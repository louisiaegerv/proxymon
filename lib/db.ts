/**
 * Database utilities for card lookups
 * 
 * Hybrid mode:
 * - Production (Vercel): Uses Turso edge database
 * - Local development: Uses local SQLite file via sql.js
 * 
 * This module can only be imported in:
 * - Server Components
 * - API Routes (Route Handlers)
 * - Server Actions
 */

import { createClient, Client as TursoClient } from '@libsql/client/web'
import initSqlJs, { type SqlJsStatic, type Database as SqlJsDatabase } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { SET_MAPPINGS } from './set-mappings'

// Turso client (production)
let tursoClient: TursoClient | null = null

// Local SQLite (development)
let SQL: SqlJsStatic | null = null
let localDb: SqlJsDatabase | null = null

/**
 * Check if running in production (Turso mode)
 */
function isTursoMode(): boolean {
  return !!process.env.TURSO_DATABASE_URL && !!process.env.TURSO_AUTH_TOKEN
}

/**
 * Get Turso client (production)
 */
function getTursoClient(): TursoClient {
  if (tursoClient) return tursoClient
  
  if (!process.env.TURSO_DATABASE_URL) {
    throw new Error('TURSO_DATABASE_URL is not set')
  }
  if (!process.env.TURSO_AUTH_TOKEN) {
    throw new Error('TURSO_AUTH_TOKEN is not set')
  }
  
  tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  
  return tursoClient
}

/**
 * Initialize and get local SQLite database (development)
 */
async function getLocalDbAsync(): Promise<SqlJsDatabase> {
  if (localDb) return localDb
  
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file) => {
        const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file)
        if (fs.existsSync(wasmPath)) {
          return wasmPath
        }
        return `https://sql.js.org/dist/${file}`
      }
    })
  }
  
  const dbPath = path.join(process.cwd(), 'cards.db')
  
  if (!fs.existsSync(dbPath)) {
    throw new Error('Database not found. Run: npx tsx scripts/init-db.ts')
  }
  
  const filebuffer = fs.readFileSync(dbPath)
  localDb = new SQL.Database(filebuffer)
  
  return localDb
}

// Initialize on module load (for local dev API routes)
let dbInitialized = false
let dbInitPromise: Promise<void> | null = null

async function ensureLocalDb(): Promise<SqlJsDatabase> {
  if (dbInitialized && localDb) return localDb
  
  if (!dbInitPromise) {
    dbInitPromise = getLocalDbAsync().then(d => {
      localDb = d
      dbInitialized = true
    })
  }
  
  await dbInitPromise
  return localDb!
}

// ============================================================================
// Database Operations (Hybrid)
// ============================================================================

/**
 * Execute a query and return rows
 */
async function executeQuery<T>(
  sql: string,
  args: (string | number)[]
): Promise<T[]> {
  if (isTursoMode()) {
    // Turso mode (production)
    const db = getTursoClient()
    const result = await db.execute({ sql, args })
    return result.rows as T[]
  } else {
    // Local SQLite mode (development)
    const db = await ensureLocalDb()
    const result = db.exec(sql, args)
    
    if (!result.length) return []
    
    const columns = result[0].columns
    return result[0].values.map(row => {
      const obj: Record<string, unknown> = {}
      columns.forEach((col, i) => {
        obj[col] = row[i]
      })
      return obj as T
    })
  }
}

/**
 * Execute a query and return first row or undefined
 */
async function executeQueryOne<T>(
  sql: string,
  args: (string | number)[]
): Promise<T | undefined> {
  const rows = await executeQuery<T>(sql, args)
  return rows[0]
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Parse search query with comma delimiter support
 */
export function parseSearchQuery(query: string): {
  cardName?: string
  setCode?: string
  setName?: string
} {
  const trimmed = query.trim()
  
  // Handle comma delimiter: "Pikachu,Jungle" or "Charizard, OBF"
  if (trimmed.includes(',')) {
    const [first, second] = trimmed.split(',').map(p => p.trim())
    
    const result: { cardName: string; setCode?: string; setName?: string } = {
      cardName: first
    }
    
    // Second part is set code if uppercase 2-4 chars (BS, OBF, etc.)
    if (second && /^[A-Z0-9]{2,4}$/.test(second)) {
      // Verify it's a known set code
      if (SET_MAPPINGS[second]) {
        result.setCode = second
      } else {
        // Unknown code, treat as set name
        result.setName = second
      }
    } else if (second) {
      result.setName = second
    }
    
    return result
  }
  
  // No comma - single term
  // Check if set code (uppercase, 2-4 chars)
  if (/^[A-Z0-9]{2,4}$/.test(trimmed) && SET_MAPPINGS[trimmed]) {
    return { setCode: trimmed }
  }
  
  // Check if matches known set name exactly
  const knownSet = Object.entries(SET_MAPPINGS).find(
    ([, m]) => m.name.toLowerCase() === trimmed.toLowerCase()
  )
  if (knownSet) {
    return { setName: knownSet[1].name }
  }
  
  // Default: treat as card name
  return { cardName: trimmed }
}

/**
 * Universal search with comma delimiter support
 */
export async function searchCards(query: string, limit = 50): Promise<CardResult[]> {
  const parsed = parseSearchQuery(query)
  
  let sql: string
  let args: (string | number)[]
  
  // Card name + set specified
  if (parsed.cardName && (parsed.setCode || parsed.setName)) {
    if (parsed.setCode) {
      sql = `
        SELECT * FROM cards 
        WHERE LOWER(name) LIKE ?
          AND set_code = ?
        ORDER BY CAST(local_id AS INTEGER)
        LIMIT ?
      `
      args = [
        `%${parsed.cardName.toLowerCase()}%`,
        parsed.setCode,
        limit
      ]
    } else {
      sql = `
        SELECT * FROM cards 
        WHERE LOWER(name) LIKE ?
          AND LOWER(set_name) LIKE ?
        ORDER BY CAST(local_id AS INTEGER)
        LIMIT ?
      `
      args = [
        `%${parsed.cardName.toLowerCase()}%`,
        `%${parsed.setName?.toLowerCase() || ''}%`,
        limit
      ]
    }
  }
  // Just set code
  else if (parsed.setCode) {
    sql = `
      SELECT * FROM cards 
      WHERE set_code = ?
      ORDER BY CAST(local_id AS INTEGER)
      LIMIT ?
    `
    args = [parsed.setCode, limit]
  }
  // Just set name
  else if (parsed.setName) {
    sql = `
      SELECT * FROM cards 
      WHERE LOWER(set_name) LIKE ?
      ORDER BY CAST(local_id AS INTEGER)
      LIMIT ?
    `
    args = [`%${parsed.setName.toLowerCase()}%`, limit]
  }
  // General search across all fields
  else {
    const term = parsed.cardName?.toLowerCase() || ''
    sql = `
      SELECT * FROM cards 
      WHERE LOWER(name) LIKE ? 
         OR LOWER(set_name) LIKE ?
         OR LOWER(set_code) LIKE ?
      ORDER BY 
        CASE 
          WHEN LOWER(name) = ? THEN 0
          WHEN LOWER(name) LIKE ? THEN 1
          ELSE 2
        END,
        name
      LIMIT ?
    `
    args = [
      `%${term}%`,
      `%${term}%`,
      `%${term}%`,
      term,
      `${term}%`,
      limit
    ]
  }
  
  const rows = await executeQuery<CardRow>(sql, args)
  return rows.map(rowToCardResult)
}

/**
 * Get all cards in a specific set
 */
export async function getCardsBySet(setCode: string): Promise<CardResult[]> {
  const sql = `
    SELECT * FROM cards 
    WHERE set_code = ?
    ORDER BY CAST(local_id AS INTEGER)
  `
  const rows = await executeQuery<CardRow>(sql, [setCode])
  return rows.map(rowToCardResult)
}

/**
 * Find a specific card by set code and local ID
 */
export async function findCard(
  setCode: string,
  localId: string
): Promise<CardResult | undefined> {
  const sql = 'SELECT * FROM cards WHERE set_code = ? AND local_id = ?'
  const row = await executeQueryOne<CardRow>(sql, [setCode, localId])
  return row ? rowToCardResult(row) : undefined
}

/**
 * Find a card by its unique ID
 */
export async function findCardById(id: string): Promise<CardResult | undefined> {
  const sql = 'SELECT * FROM cards WHERE id = ?'
  const row = await executeQueryOne<CardRow>(sql, [id])
  return row ? rowToCardResult(row) : undefined
}

/**
 * Normalize card name for search (handles apostrophes, etc.)
 */
function normalizeCardName(name: string): string {
  return name.toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

/**
 * Find a card for deck imports with flexible matching
 */
export async function findCardForDeck(
  name: string,
  setCode?: string,
  localId?: string
): Promise<CardResult | null> {
  const dbMode = isTursoMode() ? 'Turso' : 'Local'
  console.log(`[${dbMode} DB] Finding card: "${name}" (set: ${setCode}, localId: ${localId})`)
  
  // Priority 1: Search by name + setCode + localId
  if (name && setCode && localId) {
    const normalizedName = name.toLowerCase()
    const normalizedNameNoApostrophe = normalizeCardName(name)
    const normalizedSetCode = setCode.toUpperCase()
    
    // Try exact match first
    let sql = `SELECT * FROM cards 
               WHERE LOWER(name) = ? 
                 AND set_code = ? 
                 AND local_id = ?`
    let row = await executeQueryOne<CardRow>(sql, [normalizedName, normalizedSetCode, localId])
    
    // Try with apostrophe removed
    if (!row) {
      sql = `SELECT * FROM cards 
             WHERE REPLACE(LOWER(name), '''', '') = ? 
               AND set_code = ? 
               AND local_id = ?`
      row = await executeQueryOne<CardRow>(sql, [normalizedNameNoApostrophe, normalizedSetCode, localId])
    }
    
    // Try partial name match
    if (!row) {
      sql = `SELECT * FROM cards 
             WHERE LOWER(name) LIKE ? 
               AND set_code = ? 
               AND local_id = ?`
      row = await executeQueryOne<CardRow>(sql, [`%${normalizedName}%`, normalizedSetCode, localId])
    }
    
    // Try with padded localId
    if (!row && /^\d+$/.test(localId)) {
      const paddedLocalId = localId.padStart(3, '0')
      sql = `SELECT * FROM cards 
             WHERE (LOWER(name) LIKE ? OR REPLACE(LOWER(name), '''', '') = ?)
               AND set_code = ? 
               AND local_id = ?`
      row = await executeQueryOne<CardRow>(sql, [`%${normalizedName}%`, normalizedNameNoApostrophe, normalizedSetCode, paddedLocalId])
    }
    
    if (row) {
      console.log(`[${dbMode} DB] Found with Priority 1: ${row.name} (${row.set_code} ${row.local_id})`)
      return rowToCardResult(row)
    }
  }
  
  // Priority 2: Search by name + setCode
  if (name && setCode) {
    const normalizedName = name.toLowerCase()
    const normalizedNameNoApostrophe = normalizeCardName(name)
    const normalizedSetCode = setCode.toUpperCase()
    
    const sql = `SELECT * FROM cards 
                 WHERE (LOWER(name) LIKE ? OR REPLACE(LOWER(name), '''', '') = ?)
                   AND set_code = ?
                 ORDER BY CASE 
                   WHEN LOWER(name) = ? THEN 0 
                   WHEN REPLACE(LOWER(name), '''', '') = ? THEN 1
                   ELSE 2 
                 END
                 LIMIT 1`
    const row = await executeQueryOne<CardRow>(sql, [
      `%${normalizedName}%`, 
      normalizedNameNoApostrophe, 
      normalizedSetCode, 
      normalizedName, 
      normalizedNameNoApostrophe
    ])
    
    if (row) {
      console.log(`[${dbMode} DB] Found with Priority 2: ${row.name} (${row.set_code} ${row.local_id})`)
      return rowToCardResult(row)
    }
  }
  
  // Priority 3: Search by name only
  if (name) {
    const normalizedName = name.toLowerCase()
    const normalizedNameNoApostrophe = normalizeCardName(name)
    
    const sql = `SELECT * FROM cards 
                 WHERE LOWER(name) LIKE ? OR REPLACE(LOWER(name), '''', '') LIKE ?
                 ORDER BY 
                   CASE WHEN LOWER(name) = ? THEN 0 
                        WHEN REPLACE(LOWER(name), '''', '') = ? THEN 1
                        WHEN LOWER(name) LIKE ? THEN 2 
                        ELSE 3 
                   END,
                   name
                 LIMIT 1`
    const row = await executeQueryOne<CardRow>(sql, [
      `%${normalizedName}%`, 
      `%${normalizedNameNoApostrophe}%`, 
      normalizedName, 
      normalizedNameNoApostrophe, 
      `${normalizedName}%`
    ])
    
    if (row) {
      console.log(`[${dbMode} DB] Found with Priority 3: ${row.name} (${row.set_code} ${row.local_id})`)
      return rowToCardResult(row)
    }
  }
  
  console.log(`[${dbMode} DB] Card not found: "${name}"`)
  return null
}

/**
 * Get all available sets
 */
export async function getAllSets(): Promise<SetInfo[]> {
  const sql = `
    SELECT set_code, set_name, COUNT(*) as card_count
    FROM cards
    GROUP BY set_code
    ORDER BY set_name
  `
  const rows = await executeQuery<SetRow>(sql, [])
  return rows.map(row => ({
    code: String(row.set_code),
    name: String(row.set_name),
    cardCount: Number(row.card_count)
  }))
}

// ============================================================================
// Helpers
// ============================================================================

interface CardRow {
  id: string | unknown
  name: string | unknown
  set_code: string | unknown
  set_name: string | unknown
  local_id: string | unknown
  folder_name: string | unknown
  variants: string | unknown
  sizes: string | unknown
}

interface SetRow {
  set_code: string | unknown
  set_name: string | unknown
  card_count: number | unknown
}

function rowToCardResult(row: CardRow): CardResult {
  return {
    id: String(row.id),
    name: String(row.name),
    set_code: String(row.set_code),
    set_name: String(row.set_name),
    local_id: String(row.local_id),
    folder_name: String(row.folder_name),
    variants: String(row.variants),
    sizes: String(row.sizes),
  }
}

// ============================================================================
// Types
// ============================================================================

export interface CardResult {
  id: string
  name: string
  set_code: string
  set_name: string
  local_id: string
  folder_name: string
  variants: string
  sizes: string
}

export interface SetInfo {
  code: string
  name: string
  cardCount: number
}
