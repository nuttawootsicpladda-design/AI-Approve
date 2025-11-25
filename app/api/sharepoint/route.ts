import { NextRequest, NextResponse } from 'next/server'
import {
  getSharePointSiteId,
  getSharePointDriveId,
  listSharePointFiles,
  downloadSharePointFile,
  parseSharePointUrl,
} from '@/lib/microsoft-graph'
import { processFileBuffer, isImageFile } from '@/lib/file-processor'
import { extractTextFromImage, extractPOData } from '@/lib/openai'

// GET: List files from SharePoint
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')

  try {
    if (action === 'list-files') {
      const driveId = searchParams.get('driveId')
      const folderPath = searchParams.get('folderPath') || undefined

      if (!driveId) {
        return NextResponse.json(
          { success: false, error: 'driveId is required' },
          { status: 400 }
        )
      }

      const result = await listSharePointFiles(driveId, folderPath)
      return NextResponse.json({ success: true, data: result })
    }

    if (action === 'get-drive') {
      const siteUrl = searchParams.get('siteUrl')
      const driveName = searchParams.get('driveName') || undefined

      if (!siteUrl) {
        return NextResponse.json(
          { success: false, error: 'siteUrl is required' },
          { status: 400 }
        )
      }

      // Parse URL to extract site URL and initial folder path
      const { siteUrl: normalizedSiteUrl, folderPath: initialFolderPath } = parseSharePointUrl(siteUrl)

      const siteId = await getSharePointSiteId(normalizedSiteUrl)
      const driveId = await getSharePointDriveId(siteId, driveName)

      return NextResponse.json({
        success: true,
        data: {
          siteId,
          driveId,
          initialFolderPath, // Return the folder path extracted from URL
        },
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('SharePoint API error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST: Download and process file from SharePoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { driveId, fileId, fileName } = body

    if (!driveId || !fileId || !fileName) {
      return NextResponse.json(
        { success: false, error: 'driveId, fileId, and fileName are required' },
        { status: 400 }
      )
    }

    // Download file from SharePoint (returns Buffer directly)
    const { content: buffer, contentType } = await downloadSharePointFile(driveId, fileId)

    // Process the file
    const { text, base64 } = await processFileBuffer(buffer, fileName, contentType)

    let extractedText = text

    // If it's an image, use vision API to extract text
    if (base64 && isImageFile(fileName)) {
      extractedText = await extractTextFromImage(base64)
    }

    if (!extractedText) {
      return NextResponse.json(
        { success: false, error: 'No text found in document' },
        { status: 400 }
      )
    }

    // Extract structured PO data
    const poData = await extractPOData(extractedText)

    // Also return the base64 content for attachment
    const fileBase64 = buffer.toString('base64')

    return NextResponse.json({
      success: true,
      data: {
        ...poData,
        fileBase64,
        fileName,
        contentType,
      },
    })
  } catch (error: any) {
    console.error('SharePoint process error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
