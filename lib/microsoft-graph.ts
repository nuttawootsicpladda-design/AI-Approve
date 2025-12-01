import { Client } from '@microsoft/microsoft-graph-client'
import { ClientSecretCredential } from '@azure/identity'
import { EmailRequest } from './types'

let graphClient: Client | null = null

function getGraphClient(): Client {
  if (graphClient) {
    return graphClient
  }

  const credential = new ClientSecretCredential(
    process.env.MICROSOFT_TENANT_ID!,
    process.env.MICROSOFT_CLIENT_ID!,
    process.env.MICROSOFT_CLIENT_SECRET!
  )

  graphClient = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken('https://graph.microsoft.com/.default')
        return token.token
      },
    },
  })

  return graphClient
}

export async function sendEmail(request: EmailRequest): Promise<void> {
  const client = getGraphClient()

  const message: any = {
    subject: request.subject,
    body: {
      contentType: 'HTML',
      content: request.htmlBody,
    },
    toRecipients: [
      {
        emailAddress: {
          address: request.to,
        },
      },
    ],
  }

  // Add CC recipients if provided
  if (request.cc) {
    const ccEmails = request.cc.split(',').map(email => email.trim()).filter(email => email)
    if (ccEmails.length > 0) {
      message.ccRecipients = ccEmails.map(email => ({
        emailAddress: {
          address: email,
        },
      }))
    }
  }

  // Add attachments if provided
  if (request.attachments && request.attachments.length > 0) {
    message.attachments = request.attachments.map(att => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: att.name,
      contentType: 'application/octet-stream',
      contentBytes: att.content,
    }))
  }

  try {
    // Send email using sendMail endpoint
    await client
      .api(`/users/${process.env.EMAIL_SENDER}/sendMail`)
      .post({
        message,
        saveToSentItems: true,
      })
  } catch (error: any) {
    console.error('Error sending email:', error)
    throw new Error(`Failed to send email: ${error.message}`)
  }
}

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = getGraphClient()
    await client.api('/me').get()
    return true
  } catch (error) {
    console.error('Microsoft Graph connection test failed:', error)
    return false
  }
}

// SharePoint types
export interface SharePointFile {
  id: string
  name: string
  size: number
  webUrl: string
  lastModifiedDateTime: string
  file?: {
    mimeType: string
  }
}

export interface SharePointFolder {
  id: string
  name: string
  webUrl: string
  childCount?: number
}

// Parse SharePoint URL to extract site URL
// Handles various URL formats:
// - Site URL: https://company.sharepoint.com/sites/MySite
// - Sharing link: https://company.sharepoint.com/:f:/r/sites/MySite/Shared%20Documents/folder
// - Document URL: https://company.sharepoint.com/sites/MySite/Shared%20Documents/file.pdf
export function parseSharePointUrl(inputUrl: string): { siteUrl: string; folderPath?: string } {
  const url = new URL(inputUrl)
  const hostname = url.hostname
  const pathname = decodeURIComponent(url.pathname)

  // Check if it's a sharing link (contains :f:, :x:, :w:, :p:, etc.)
  const sharingLinkMatch = pathname.match(/^\/:([a-z]):\/(r|s)\/(.+)$/)
  if (sharingLinkMatch) {
    const remainingPath = sharingLinkMatch[3]
    // Extract site path (e.g., sites/MySite)
    const siteMatch = remainingPath.match(/^(sites\/[^/]+)/)
    if (siteMatch) {
      const sitePath = siteMatch[1]
      // Extract folder path after "Shared Documents" or similar
      const docMatch = remainingPath.match(/^sites\/[^/]+\/([^/]+)\/(.+)$/)
      const folderPath = docMatch ? docMatch[2] : undefined

      return {
        siteUrl: `https://${hostname}/${sitePath}`,
        folderPath,
      }
    }
  }

  // Check for regular site URL with document path
  const siteMatch = pathname.match(/^\/(sites\/[^/]+)/)
  if (siteMatch) {
    const sitePath = siteMatch[1]
    // Check if there's a document library path
    const docMatch = pathname.match(/^\/sites\/[^/]+\/([^/]+)\/(.+)$/)
    const folderPath = docMatch ? docMatch[2] : undefined

    return {
      siteUrl: `https://${hostname}/${sitePath}`,
      folderPath,
    }
  }

  // If no site path found, return as-is (might be root site)
  return { siteUrl: inputUrl }
}

// Get SharePoint site ID by site URL
export async function getSharePointSiteId(siteUrl: string): Promise<string> {
  const client = getGraphClient()

  // Parse and normalize the URL
  const { siteUrl: normalizedUrl } = parseSharePointUrl(siteUrl)
  const url = new URL(normalizedUrl)
  const hostname = url.hostname
  let sitePath = url.pathname

  // Remove trailing slash
  if (sitePath.endsWith('/')) {
    sitePath = sitePath.slice(0, -1)
  }

  // Ensure path starts with /
  if (!sitePath.startsWith('/')) {
    sitePath = '/' + sitePath
  }

  try {
    const site = await client
      .api(`/sites/${hostname}:${sitePath}`)
      .get()
    return site.id
  } catch (error: any) {
    console.error('Error getting SharePoint site:', error)
    throw new Error(`Failed to get SharePoint site: ${error.message}`)
  }
}

// Get drive ID (document library) from site
export async function getSharePointDriveId(siteId: string, driveName?: string): Promise<string> {
  const client = getGraphClient()

  try {
    if (driveName) {
      // Get specific drive by name
      const drives = await client
        .api(`/sites/${siteId}/drives`)
        .get()

      const drive = drives.value.find((d: any) => d.name === driveName)
      if (!drive) {
        throw new Error(`Drive "${driveName}" not found`)
      }
      return drive.id
    } else {
      // Get default document library
      const drive = await client
        .api(`/sites/${siteId}/drive`)
        .get()
      return drive.id
    }
  } catch (error: any) {
    console.error('Error getting SharePoint drive:', error)
    throw new Error(`Failed to get SharePoint drive: ${error.message}`)
  }
}

// List files in a SharePoint folder
export async function listSharePointFiles(
  driveId: string,
  folderPath?: string
): Promise<{ files: SharePointFile[]; folders: SharePointFolder[] }> {
  const client = getGraphClient()

  try {
    let endpoint = `/drives/${driveId}/root/children`
    if (folderPath) {
      // Encode the folder path for URL
      const encodedPath = folderPath.split('/').map(encodeURIComponent).join('/')
      endpoint = `/drives/${driveId}/root:/${encodedPath}:/children`
    }

    const result = await client
      .api(endpoint)
      .select('id,name,size,webUrl,lastModifiedDateTime,file,folder')
      .orderby('name')
      .get()

    const files: SharePointFile[] = []
    const folders: SharePointFolder[] = []

    for (const item of result.value) {
      if (item.file) {
        files.push({
          id: item.id,
          name: item.name,
          size: item.size,
          webUrl: item.webUrl,
          lastModifiedDateTime: item.lastModifiedDateTime,
          file: item.file,
        })
      } else if (item.folder) {
        folders.push({
          id: item.id,
          name: item.name,
          webUrl: item.webUrl,
          childCount: item.folder.childCount,
        })
      }
    }

    return { files, folders }
  } catch (error: any) {
    console.error('Error listing SharePoint files:', error)
    throw new Error(`Failed to list SharePoint files: ${error.message}`)
  }
}

// Download file content from SharePoint
export async function downloadSharePointFile(
  driveId: string,
  fileId: string
): Promise<{ content: Buffer; contentType: string }> {
  const client = getGraphClient()

  try {
    // Get file metadata first
    const fileInfo = await client
      .api(`/drives/${driveId}/items/${fileId}`)
      .select('name,file')
      .get()

    // Download file content - returns ReadableStream
    const response = await client
      .api(`/drives/${driveId}/items/${fileId}/content`)
      .getStream()

    // Convert ReadableStream to Buffer
    const chunks: Uint8Array[] = []
    const reader = response.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    // Combine all chunks into a single Buffer
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    const buffer = Buffer.alloc(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      buffer.set(chunk, offset)
      offset += chunk.length
    }

    return {
      content: buffer,
      contentType: fileInfo.file?.mimeType || 'application/octet-stream',
    }
  } catch (error: any) {
    console.error('Error downloading SharePoint file:', error)
    throw new Error(`Failed to download SharePoint file: ${error.message}`)
  }
}

// Get file as base64 for attachment
export async function getSharePointFileAsBase64(
  driveId: string,
  fileId: string
): Promise<string> {
  const { content } = await downloadSharePointFile(driveId, fileId)

  // content is already a Buffer
  return content.toString('base64')
}

// Get or create folder in SharePoint
export async function getOrCreateFolder(
  driveId: string,
  folderPath: string
): Promise<string> {
  const client = getGraphClient()

  try {
    // Try to get existing folder
    const encodedPath = folderPath.split('/').map(encodeURIComponent).join('/')
    const folder = await client
      .api(`/drives/${driveId}/root:/${encodedPath}`)
      .get()
    return folder.id
  } catch (error: any) {
    // If folder doesn't exist, create it
    if (error.statusCode === 404) {
      const pathParts = folderPath.split('/')
      let currentPath = ''

      for (const part of pathParts) {
        const parentPath = currentPath || 'root'
        currentPath = currentPath ? `${currentPath}/${part}` : part

        try {
          const encodedPath = currentPath.split('/').map(encodeURIComponent).join('/')
          await client.api(`/drives/${driveId}/root:/${encodedPath}`).get()
        } catch {
          // Create folder
          const parentEndpoint = parentPath === 'root'
            ? `/drives/${driveId}/root/children`
            : `/drives/${driveId}/root:/${parentPath.split('/').map(encodeURIComponent).join('/')}:/children`

          await client.api(parentEndpoint).post({
            name: part,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'fail',
          })
        }
      }

      // Get the created folder ID
      const encodedPath = folderPath.split('/').map(encodeURIComponent).join('/')
      const folder = await client
        .api(`/drives/${driveId}/root:/${encodedPath}`)
        .get()
      return folder.id
    }
    throw error
  }
}

// Move file to another folder in SharePoint
export async function moveSharePointFile(
  driveId: string,
  fileId: string,
  destinationFolderPath: string
): Promise<{ success: boolean; newUrl?: string }> {
  const client = getGraphClient()

  try {
    // Get or create destination folder
    const destinationFolderId = await getOrCreateFolder(driveId, destinationFolderPath)

    // Move file to destination folder
    const result = await client
      .api(`/drives/${driveId}/items/${fileId}`)
      .patch({
        parentReference: {
          id: destinationFolderId,
        },
      })

    return {
      success: true,
      newUrl: result.webUrl,
    }
  } catch (error: any) {
    console.error('Error moving SharePoint file:', error)
    throw new Error(`Failed to move file: ${error.message}`)
  }
}

// Move multiple files to another folder
export async function moveMultipleSharePointFiles(
  files: { driveId: string; fileId: string }[],
  destinationFolderPath: string
): Promise<{ success: boolean; movedFiles: string[]; errors: string[] }> {
  const movedFiles: string[] = []
  const errors: string[] = []

  for (const file of files) {
    try {
      await moveSharePointFile(file.driveId, file.fileId, destinationFolderPath)
      movedFiles.push(file.fileId)
    } catch (error: any) {
      errors.push(`File ${file.fileId}: ${error.message}`)
    }
  }

  return {
    success: errors.length === 0,
    movedFiles,
    errors,
  }
}
