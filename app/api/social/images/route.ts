import { NextRequest, NextResponse } from 'next/server'

// Import the imageJobs map from the social route
// Since we can't directly import from route.ts, we'll need to share the store
// For now, we'll create a shared module or use a workaround
// Actually, in Next.js, each route is separate, so we need to share state differently
// Let's use a simple approach: re-export the types and create a shared store

// Shared image job store (in-memory)
// Note: In production, consider using Redis or a database for persistence
type ImageJobStatus = 'pending' | 'complete' | 'error'

interface ImageJob {
  status: ImageJobStatus
  images: Record<number, { imageUrl: string | null; originalImageUrl: string | null }>
  startedAt: number
  carousels: any[]
  underlineWordsWithoutImages: Record<number, any>
  useAIImages: boolean
  aiImageStyle: 'animated' | 'surreal'
}

// Global store - shared across route handlers in the same process
declare global {
  // eslint-disable-next-line no-var
  var imageJobsStore: Map<string, ImageJob> | undefined
}

// Use global store to persist across hot reloads in development
const imageJobs = globalThis.imageJobsStore || new Map<string, ImageJob>()
if (!globalThis.imageJobsStore) {
  globalThis.imageJobsStore = imageJobs
}

export function getImageJobs(): Map<string, ImageJob> {
  return imageJobs
}

export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get('jobId')
    
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Missing jobId parameter' },
        { status: 400 }
      )
    }
    
    const job = imageJobs.get(jobId)
    
    if (!job) {
      return NextResponse.json({
        success: false,
        status: 'not_found',
        error: 'Job not found'
      })
    }
    
    // Calculate progress
    const totalMiddleCarousels = job.carousels.filter((c: any) => c.kind === 'MIDDLE').length
    const loadedImages = Object.keys(job.images).length
    const progress = totalMiddleCarousels > 0 
      ? Math.round((loadedImages / totalMiddleCarousels) * 100)
      : 100
    
    return NextResponse.json({
      success: true,
      status: job.status,
      images: job.images,
      progress,
      totalMiddleCarousels,
      loadedImages
    })
  } catch (error: any) {
    console.error('Error in image polling endpoint:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

