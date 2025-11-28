import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const folderName = request.nextUrl.searchParams.get('folder')
    
    if (!folderName) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      )
    }

    // Sanitize folder name to prevent directory traversal
    const sanitizedFolder = path.basename(folderName)
    const folderPath = path.join(process.cwd(), 'public', 'sections', sanitizedFolder)

    // Check if folder exists
    if (!fs.existsSync(folderPath)) {
      return NextResponse.json({
        success: true,
        images: []
      })
    }

    // Read all image files from the folder
    const files = fs.readdirSync(folderPath)
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    const images = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase()
        return imageExtensions.includes(ext)
      })
      .sort((a, b) => {
        // Sort numerically if files are numbered
        const numA = parseInt(a.match(/\d+/)?.[0] || '0')
        const numB = parseInt(b.match(/\d+/)?.[0] || '0')
        return numA - numB
      })
      .map(file => `/sections/${sanitizedFolder}/${file}`)

    return NextResponse.json({
      success: true,
      images
    })

  } catch (error: any) {
    console.error('Error listing section images:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list images' },
      { status: 500 }
    )
  }
}




