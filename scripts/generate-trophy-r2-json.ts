/**
 * Generate hardcoded JSON mapping trophy card names to API-signed URLs
 *
 * Images route through /api/images/ and videos through /api/videos/
 * Both generate presigned R2 redirects on the fly.
 *
 * Usage:
 *   npx tsx scripts/generate-trophy-r2-json.ts
 */

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'

// Load env vars from .env files
const envLocalPath = path.join(process.cwd(), '.env.local')
const envDevPath = path.join(process.cwd(), '.env.development.local')

function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
      }
    }
  }
}

loadEnvFile(envLocalPath)
loadEnvFile(envDevPath)

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucketName = process.env.R2_BUCKET_NAME

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('Error: R2 credentials not configured.')
  process.exit(1)
}

if (!bucketName) {
  console.error('Error: R2_BUCKET_NAME not configured')
  process.exit(1)
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
})

const PREFIX = 'trophy-cards/'

interface TrophyMedia {
  image: string
  video?: {
    thumbnail: string
    detail: string
  }
}

async function listAllObjects(): Promise<string[]> {
  const keys: string[] = []
  let continuationToken: string | undefined

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: PREFIX,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    })

    const response = await s3Client.send(command)

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key && obj.Key !== PREFIX && !obj.Key.endsWith('/')) {
          keys.push(obj.Key)
        }
      }
    }

    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  return keys
}

function getBaseName(key: string): string | null {
  const fileName = path.basename(key, path.extname(key))
  // Remove resolution suffix for videos (e.g., "_360p_svtav1" or "_720p_svtav1")
  const match = fileName.match(/^(.+?)(?:_360p_svtav1|_720p_svtav1)?$/)
  return match ? match[1] : fileName
}

function toImageApiPath(key: string): string {
  return `/api/images/${key}`
}

function toVideoApiPath(key: string): string {
  return `/api/videos/${key}`
}

async function main() {
  console.log(`Bucket: ${bucketName}`)
  console.log(`Prefix: ${PREFIX}`)
  console.log('Listing objects...\n')

  const keys = await listAllObjects()

  // Group by base name (case-insensitive, but preserve image casing for output)
  const byName = new Map<string, { displayName: string; images: string[]; videos360: string[]; videos720: string[] }>()

  for (const key of keys) {
    const baseName = getBaseName(key)
    if (!baseName) continue

    const lowerName = baseName.toLowerCase()
    const existing = byName.get(lowerName)
    const displayName = existing?.displayName ?? baseName

    const entry = existing ?? { displayName, images: [], videos360: [], videos720: [] }

    if (key.includes('/images/')) {
      entry.images.push(key)
      // Prefer image casing for display name
      entry.displayName = baseName
    } else if (key.includes('/videos/')) {
      if (key.includes('_360p_')) {
        entry.videos360.push(key)
      } else if (key.includes('_720p_')) {
        entry.videos720.push(key)
      }
    }

    byName.set(lowerName, entry)
  }

  // Build the JSON output
  const output: Record<string, TrophyMedia> = {}

  for (const [, entry] of byName) {
    if (entry.images.length === 0) continue

    const imageKey = entry.images[0]
    const result: TrophyMedia = {
      image: toImageApiPath(imageKey),
    }

    if (entry.videos360.length > 0 && entry.videos720.length > 0) {
      result.video = {
        thumbnail: toVideoApiPath(entry.videos360[0]),
        detail: toVideoApiPath(entry.videos720[0]),
      }
    }

    output[entry.displayName] = result
  }

  // Sort by key name
  const sortedOutput = Object.fromEntries(
    Object.entries(output).sort(([a], [b]) => a.localeCompare(b))
  )

  const outputPath = path.join(process.cwd(), 'lib', 'trophy-media.json')
  fs.writeFileSync(outputPath, JSON.stringify(sortedOutput, null, 2))

  console.log(`Generated ${Object.keys(sortedOutput).length} trophy media entries`)
  console.log(`Written to: ${outputPath}`)
  console.log('')

  // Print summary
  const withVideo = Object.entries(sortedOutput).filter(([, v]) => v.video)
  const withoutVideo = Object.entries(sortedOutput).filter(([, v]) => !v.video)

  console.log(`With video: ${withVideo.length}`)
  for (const [name] of withVideo) {
    console.log(`  - ${name}`)
  }

  console.log(`\nWithout video: ${withoutVideo.length}`)
  for (const [name] of withoutVideo) {
    console.log(`  - ${name}`)
  }
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
