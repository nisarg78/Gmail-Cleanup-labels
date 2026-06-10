import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import fs from 'fs'
import path from 'path'
import type { ScanResult } from '@/lib/gmail/types'

const DB_PATH = path.join(process.cwd(), 'data', 'scans.db')

let db: SqlJsDatabase | null = null
let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null

/**
 * Initialize the database connection and load existing data from file
 */
async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db

  // Initialize sql.js with the wasm file location
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file: string) =>
        path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
    })
  }

  // Load existing database from file or create new one
  if (fs.existsSync(DB_PATH)) {
    const data = fs.readFileSync(DB_PATH)
    db = new SQL.Database(data)
  } else {
    db = new SQL.Database()
    initSchema()
  }

  return db
}

/**
 * Initialize the database schema
 */
function initSchema(): void {
  if (!db) return

  db.run(`
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL UNIQUE,
      timestamp INTEGER NOT NULL,
      data TEXT NOT NULL
    )
  `)
}

/**
 * Save the database to disk
 */
function saveDb(): void {
  if (!db) return

  const data = db.export()
  const dir = path.dirname(DB_PATH)

  // Ensure data directory exists
  fs.mkdirSync(dir, { recursive: true })

  // Write database file
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}

/**
 * Save scan results for a user, replacing any existing cache
 */
export async function saveScan(userEmail: string, data: ScanResult): Promise<void> {
  const database = await getDb()

  // Delete existing scan for this user (due to UNIQUE constraint)
  database.run('DELETE FROM scans WHERE user_email = ?', [userEmail])

  // Insert new scan
  database.run(
    'INSERT INTO scans (user_email, timestamp, data) VALUES (?, ?, ?)',
    [userEmail, data.timestamp, JSON.stringify(data)]
  )

  // Persist to disk
  saveDb()
}

/**
 * Get cached scan for a user, returns null if not found or expired
 */
export async function getCachedScan(
  userEmail: string
): Promise<{ timestamp: number; data: ScanResult } | null> {
  const database = await getDb()

  const result = database.exec(
    'SELECT timestamp, data FROM scans WHERE user_email = ?',
    [userEmail]
  )

  if (!result || result.length === 0 || result[0].values.length === 0) {
    return null
  }

  const [timestamp, data] = result[0].values[0] as [number, string]

  return {
    timestamp,
    data: JSON.parse(data) as ScanResult,
  }
}

/**
 * Delete scan cache for a user
 */
export async function deleteScan(userEmail: string): Promise<void> {
  const database = await getDb()

  database.run('DELETE FROM scans WHERE user_email = ?', [userEmail])

  // Persist to disk
  saveDb()
}
