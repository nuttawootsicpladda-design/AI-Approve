import pdf from 'pdf-parse'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

export async function processFile(file: File): Promise<{ text: string; base64?: string }> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const fileName = file.name.toLowerCase()

  try {
    // PDF files
    if (fileName.endsWith('.pdf')) {
      const data = await pdf(buffer)
      return { text: data.text }
    }

    // Word documents
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      const result = await mammoth.extractRawText({ buffer })
      return { text: result.value }
    }

    // Excel files
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      let text = ''
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName]
        text += XLSX.utils.sheet_to_csv(worksheet) + '\n\n'
      })
      
      return { text }
    }

    // Image files - return base64 for vision API
    if (
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.gif') ||
      fileName.endsWith('.webp')
    ) {
      const base64 = buffer.toString('base64')
      return { text: '', base64 }
    }

    // Plain text files
    if (fileName.endsWith('.txt') || fileName.endsWith('.csv')) {
      return { text: buffer.toString('utf-8') }
    }

    throw new Error(`Unsupported file type: ${fileName}`)
  } catch (error: any) {
    console.error('Error processing file:', error)
    throw new Error(`Failed to process file: ${error.message}`)
  }
}

export function isImageFile(fileName: string): boolean {
  const ext = fileName.toLowerCase()
  return (
    ext.endsWith('.jpg') ||
    ext.endsWith('.jpeg') ||
    ext.endsWith('.png') ||
    ext.endsWith('.gif') ||
    ext.endsWith('.webp')
  )
}

export function getSupportedFormats(): string[] {
  return [
    '.pdf',
    '.docx',
    '.doc',
    '.xlsx',
    '.xls',
    '.txt',
    '.csv',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
  ]
}

// Process file from Buffer (for SharePoint integration)
export async function processFileBuffer(
  buffer: Buffer,
  fileName: string,
  contentType?: string
): Promise<{ text: string; base64?: string }> {
  const fileNameLower = fileName.toLowerCase()

  try {
    // PDF files
    if (fileNameLower.endsWith('.pdf') || contentType === 'application/pdf') {
      const data = await pdf(buffer)
      return { text: data.text }
    }

    // Word documents
    if (
      fileNameLower.endsWith('.docx') ||
      fileNameLower.endsWith('.doc') ||
      contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer })
      return { text: result.value }
    }

    // Excel files
    if (
      fileNameLower.endsWith('.xlsx') ||
      fileNameLower.endsWith('.xls') ||
      contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      let text = ''

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName]
        text += XLSX.utils.sheet_to_csv(worksheet) + '\n\n'
      })

      return { text }
    }

    // Image files - return base64 for vision API
    if (isImageFile(fileName) || contentType?.startsWith('image/')) {
      const base64 = buffer.toString('base64')
      return { text: '', base64 }
    }

    // Plain text files
    if (
      fileNameLower.endsWith('.txt') ||
      fileNameLower.endsWith('.csv') ||
      contentType === 'text/plain' ||
      contentType === 'text/csv'
    ) {
      return { text: buffer.toString('utf-8') }
    }

    throw new Error(`Unsupported file type: ${fileName}`)
  } catch (error: any) {
    console.error('Error processing file buffer:', error)
    throw new Error(`Failed to process file: ${error.message}`)
  }
}
