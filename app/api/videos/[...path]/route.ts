/**
 * Video Serving API Route
 *
 * Redirects to presigned R2 URLs for private bucket video access.
 *
 * Route: /api/videos/{path-to-file}
 * Example: /api/videos/trophy-cards/videos/Sableye_360p_svtav1.webm
 */

import { NextRequest } from 'next/server'
import { getSignedImageUrl } from '@/lib/r2'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params

  try {
    const objectKey = pathSegments.join('/')

    // Generate signed URL (1 hour expiration)
    const signedUrl = await getSignedImageUrl(objectKey, 3600)

    // Redirect to the signed URL
    return Response.redirect(signedUrl, 302)
  } catch (error) {
    console.error('Failed to generate signed video URL:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to generate video URL',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
