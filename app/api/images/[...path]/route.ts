/**
 * Image Serving API Route
 * 
 * - Development: Serves card images from local filesystem
 * - Production: Redirects to presigned R2 URLs (private bucket)
 * 
 * Route: /api/images/{folder}/{filename}.webp
 * Example: /api/images/151_MEW/Abra_MEW_063_md.webp
 */

import { readFile } from 'fs/promises'
import { NextRequest } from 'next/server'
import path from 'path'
import { getSignedImageUrl } from '@/lib/r2'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params
  const imageSource = process.env.IMAGE_SOURCE || 'local'
  
  // Production: Redirect to signed R2 URL
  if (imageSource === 'r2') {
    try {
      // Build the object key from path segments
      const objectKey = pathSegments.join('/')
      
      // Generate signed URL (1 hour expiration)
      const signedUrl = await getSignedImageUrl(objectKey, 3600)
      
      // Redirect to the signed URL
      return Response.redirect(signedUrl, 302)
      
    } catch (error) {
      console.error('Failed to generate signed URL:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate image URL',
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
  
  // Development: Serve from local filesystem
  const basePath = process.env.LOCAL_IMAGES_PATH
  
  if (!basePath) {
    return new Response(
      JSON.stringify({ error: 'LOCAL_IMAGES_PATH not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
  
  // Build file path
  const filePath = path.join(basePath, ...pathSegments)
  
  // Security check: ensure path is within base directory
  const resolvedPath = path.resolve(filePath)
  const resolvedBase = path.resolve(basePath)
  
  if (!resolvedPath.startsWith(resolvedBase)) {
    return new Response(
      JSON.stringify({ error: 'Invalid path' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }
  
  // Validate file extension
  if (!resolvedPath.endsWith('.webp')) {
    return new Response(
      JSON.stringify({ error: 'Only WebP images are supported' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
  
  try {
    const fileBuffer = await readFile(resolvedPath)
    
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vary': 'Accept-Encoding'
      }
    })
  } catch (error) {
    console.error(`Image not found: ${filePath}`, error)
    
    return new Response(
      JSON.stringify({ error: 'Image not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
