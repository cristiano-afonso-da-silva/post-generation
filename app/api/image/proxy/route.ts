import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_HOSTS = new Set(['image.pollinations.ai'])

// Use revalidate for caching - images are cached for 1 hour (3600 seconds)
// This reduces Fast Origin Transfer by serving cached images instead of re-fetching
export const revalidate = 3600

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get('url')
  
  console.log('🔄 Image proxy request received')
  console.log('   URL param:', urlParam)

  if (!urlParam) {
    console.error('❌ Missing url parameter')
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  let remoteUrl: URL
  try {
    remoteUrl = new URL(urlParam)
    console.log('✅ Parsed URL:', remoteUrl.toString())
    console.log('   Host:', remoteUrl.hostname)
  } catch (error) {
    console.error('❌ Invalid URL parameter:', error)
    return NextResponse.json({ error: 'Invalid URL parameter' }, { status: 400 })
  }

  if (!ALLOWED_HOSTS.has(remoteUrl.hostname)) {
    console.error('❌ Host not allowed:', remoteUrl.hostname)
    console.error('   Allowed hosts:', Array.from(ALLOWED_HOSTS))
    return NextResponse.json({ error: 'Host not allowed' }, { status: 400 })
  }

  try {
    console.log('📡 Fetching remote image:', remoteUrl.toString())
    // Use 'force-cache' to leverage Next.js caching and reduce Fast Origin Transfer
    // Images are cached for the revalidate period (1 hour)
    const response = await fetch(remoteUrl.toString(), {
      cache: 'force-cache',
      next: { revalidate: 3600 }
    })
    
    console.log('📡 Remote response status:', response.status)
    console.log('   Content-Type:', response.headers.get('content-type'))

    if (!response.ok || !response.body) {
      console.error('❌ Failed to fetch remote image, status:', response.status)
      return NextResponse.json({ error: 'Failed to fetch remote image' }, { status: response.status })
    }

    const headers = new Headers(response.headers)
    headers.set('Access-Control-Allow-Origin', '*')
    // Cache for 1 hour on client and CDN to reduce repeated requests
    headers.set('Cache-Control', 'public, s-maxage=3600, max-age=3600, stale-while-revalidate=86400')
    headers.delete('set-cookie')
    
    console.log('✅ Proxying image successfully (cached)')

    return new Response(response.body, {
      status: response.status,
      headers,
    })
  } catch (error: any) {
    console.error('❌ Image proxy error:', error)
    console.error('   Error message:', error?.message)
    console.error('   Error stack:', error?.stack)
    return NextResponse.json(
      { error: error?.message || 'Failed to proxy image' },
      { status: 500 }
    )
  }
}
