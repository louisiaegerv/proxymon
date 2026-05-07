/**
 * List all files in the R2 bucket under the trophy-cards/ prefix
 *
 * Usage:
 *   npx tsx scripts/list-r2-trophy-cards.ts
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
  console.error('Need: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY')
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
        if (obj.Key) {
          keys.push(obj.Key)
        }
      }
    }

    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  return keys
}

async function main() {
  console.log(`Bucket: ${bucketName}`)
  console.log(`Prefix: ${PREFIX}`)
  console.log('Listing objects...\n')

  const keys = await listAllObjects()

  if (keys.length === 0) {
    console.log('No objects found.')
    return
  }

  // Group by folder (first segment after prefix)
  const folders = new Map<string, string[]>()
  for (const key of keys) {
    const relativePath = key.slice(PREFIX.length)
    const firstSlash = relativePath.indexOf('/')
    const folder = firstSlash >= 0 ? relativePath.slice(0, firstSlash) : '(root)'
    const existing = folders.get(folder) ?? []
    existing.push(key)
    folders.set(folder, existing)
  }

  console.log(`Total objects: ${keys.length}`)
  console.log(`Top-level folders: ${folders.size}`)
  console.log('')

  for (const [folder, folderKeys] of folders) {
    console.log(`--- ${folder} (${folderKeys.length} files) ---`)
    for (const key of folderKeys) {
      console.log(key)
    }
    console.log('')
  }

  // Also output a flat JSON list at the end
  console.log('--- JSON output ---')
  console.log(JSON.stringify(keys, null, 2))
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
