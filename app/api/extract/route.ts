import { NextRequest, NextResponse } from 'next/server'
import { processFile, isImageFile } from '@/lib/file-processor'
import { extractTextFromImage, extractPOData } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Process the file
    const { text, base64 } = await processFile(file)

    let extractedText = text

    // If it's an image, use vision API to extract text
    if (base64 && isImageFile(file.name)) {
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

    return NextResponse.json({
      success: true,
      data: poData,
    })
  } catch (error: any) {
    console.error('Extract API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to extract data' },
      { status: 500 }
    )
  }
}
