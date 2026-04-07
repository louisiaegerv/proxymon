/**
 * R2 (S3-compatible) signed URL utilities
 * 
 * Generates presigned URLs for private R2 bucket access.
 * URLs expire after a set time (default: 1 hour)
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// R2 S3-compatible client
let s3Client: S3Client | null = null

/**
 * Get or create S3 client for R2
 */
function getS3Client(): S3Client {
  if (s3Client) return s3Client
  
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 credentials not configured. ' +
      'Need: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY'
    )
  }
  
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: true,  // Required for R2
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
  
  return s3Client
}

/**
 * Generate a presigned URL for an R2 object
 * 
 * @param key - Object key (path in bucket), e.g., "151_MEW/Abra_MEW_063_md.webp"
 * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns Presigned URL string
 */
export async function getSignedImageUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const bucketName = process.env.R2_BUCKET_NAME
  if (!bucketName) {
    throw new Error('R2_BUCKET_NAME not configured')
  }
  
  const client = getS3Client()
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  })
  
  return getSignedUrl(client, command, { expiresIn })
}

/**
 * Generate signed URL from card info
 * 
 * @param folder - Folder name (e.g., "151_MEW")
 * @param fileName - File name (e.g., "Abra_MEW_063_md.webp")
 * @param expiresIn - URL expiration time in seconds
 * @returns Full presigned URL
 */
export async function getCardSignedUrl(
  folder: string,
  fileName: string,
  expiresIn: number = 3600
): Promise<string> {
  const key = `${folder}/${fileName}`
  return getSignedImageUrl(key, expiresIn)
}

/**
 * Build the object key from card info
 */
export function buildObjectKey(
  cardName: string,
  setCode: string,
  localId: string,
  folder: string,
  size: 'sm' | 'md' | 'lg' | 'xl' = 'md',
  variant: 'normal' | 'holo' | 'reverse' = 'normal'
): string {
  // Sanitize card name for filename
  const safeName = cardName.replace(/[^\p{L}\p{N}-]/gu, '_')
  const variantSuffix = variant === 'normal' ? '' : `_${variant}`
  const fileName = `${safeName}_${setCode}_${localId}${variantSuffix}_${size}.webp`
  return `${folder}/${fileName}`
}
