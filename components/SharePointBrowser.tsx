'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Folder,
  FileText,
  ChevronRight,
  ChevronLeft,
  Loader2,
  RefreshCw,
  Home,
  CheckSquare,
  Square,
  MinusSquare,
  Link2,
  Plus,
  Minus,
} from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { cn } from '@/lib/utils'

export interface SharePointFile {
  id: string
  name: string
  size: number
  webUrl: string
  lastModifiedDateTime: string
  file?: {
    mimeType: string
  }
  // Track which drive this file belongs to (for multi-source)
  _driveId?: string
  _sourceIndex?: number
}

interface SharePointFolder {
  id: string
  name: string
  webUrl: string
  childCount?: number
}

interface SharePointBrowserProps {
  onFileSelect: (files: SharePointFile[], driveId: string) => void
  isProcessing?: boolean
  translations: {
    title: string
    siteUrl: string
    connect: string
    loading: string
    noFiles: string
    selectFile: string
    back: string
    refresh: string
  }
}

const SHAREPOINT_URLS_KEY = 'po-approval-sharepoint-urls'
const NUM_URL_SLOTS = 6

interface ConnectedSource {
  url: string
  driveId: string
  folderPath?: string
  files: SharePointFile[]
  folders: SharePointFolder[]
}

export function SharePointBrowser({
  onFileSelect,
  isProcessing = false,
  translations,
}: SharePointBrowserProps) {
  const [siteUrls, setSiteUrls] = useState<string[]>(Array(NUM_URL_SLOTS).fill(''))
  const [connectedSources, setConnectedSources] = useState<ConnectedSource[]>([])
  const [isConnected, setIsConnected] = useState(false)

  // Load saved SharePoint URLs from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SHAREPOINT_URLS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          const urls = Array(NUM_URL_SLOTS).fill('')
          parsed.forEach((url: string, i: number) => {
            if (i < NUM_URL_SLOTS) urls[i] = url || ''
          })
          setSiteUrls(urls)
        }
      }
    } catch {}
  }, [])

  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

  // Browsing state (for navigating within a single source)
  const [browsingSourceIndex, setBrowsingSourceIndex] = useState<number | null>(null)
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [browseFiles, setBrowseFiles] = useState<SharePointFile[]>([])
  const [browseFolders, setBrowseFolders] = useState<SharePointFolder[]>([])

  // All files from all connected sources (flat view)
  const allFiles = useMemo(() => {
    if (browsingSourceIndex !== null) return browseFiles
    return connectedSources.flatMap((src, idx) =>
      src.files.map(f => ({ ...f, _driveId: src.driveId, _sourceIndex: idx }))
    )
  }, [connectedSources, browsingSourceIndex, browseFiles])

  const allFolders = useMemo(() => {
    if (browsingSourceIndex !== null) return browseFolders
    return connectedSources.flatMap(src => src.folders)
  }, [connectedSources, browsingSourceIndex, browseFolders])

  // Get supported files only
  const supportedFiles = useMemo(() => {
    return allFiles.filter((file) => isSupportedFile(file.name))
  }, [allFiles])

  // Check if all supported files are selected
  const allSelected = useMemo(() => {
    return supportedFiles.length > 0 && supportedFiles.every((f) => selectedFiles.has(f.id))
  }, [supportedFiles, selectedFiles])

  // Check if some (but not all) files are selected
  const someSelected = useMemo(() => {
    return supportedFiles.some((f) => selectedFiles.has(f.id)) && !allSelected
  }, [supportedFiles, selectedFiles, allSelected])

  const nonEmptyUrls = useMemo(() => {
    return siteUrls.filter(u => u.trim() !== '')
  }, [siteUrls])

  // Connect to all SharePoint URLs
  const handleConnect = async () => {
    if (nonEmptyUrls.length === 0) {
      setError('กรุณากรอก SharePoint URL อย่างน้อย 1 ช่อง')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const sources: ConnectedSource[] = []
      const errors: string[] = []

      for (let i = 0; i < siteUrls.length; i++) {
        const url = siteUrls[i].trim()
        if (!url) continue

        try {
          // Get drive
          const response = await fetch(
            `/api/sharepoint?action=get-drive&siteUrl=${encodeURIComponent(url)}`
          )
          const result = await response.json()

          if (!result.success) {
            errors.push(`Path ${i + 1}: ${result.error}`)
            continue
          }

          const driveId = result.data.driveId
          const folderPath = result.data.initialFolderPath || undefined

          // Load files from this path
          let filesUrl = `/api/sharepoint?action=list-files&driveId=${encodeURIComponent(driveId)}`
          if (folderPath) {
            filesUrl += `&folderPath=${encodeURIComponent(folderPath)}`
          }

          const filesResponse = await fetch(filesUrl)
          const filesResult = await filesResponse.json()

          if (!filesResult.success) {
            errors.push(`Path ${i + 1}: ${filesResult.error}`)
            continue
          }

          sources.push({
            url,
            driveId,
            folderPath,
            files: (filesResult.data.files || []).map((f: SharePointFile) => ({
              ...f,
              _driveId: driveId,
              _sourceIndex: i,
            })),
            folders: filesResult.data.folders || [],
          })
        } catch (err: any) {
          errors.push(`Path ${i + 1}: ${err.message}`)
        }
      }

      if (sources.length === 0) {
        throw new Error(errors.join('\n'))
      }

      setConnectedSources(sources)
      setIsConnected(true)
      setBrowsingSourceIndex(null)

      // Save URLs to localStorage
      localStorage.setItem(SHAREPOINT_URLS_KEY, JSON.stringify(siteUrls))

      if (errors.length > 0) {
        setError(`เชื่อมต่อสำเร็จ ${sources.length}/${nonEmptyUrls.length} paths\n${errors.join('\n')}`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to SharePoint')
    } finally {
      setIsConnecting(false)
    }
  }

  // Load files for browsing within a single source
  const loadFiles = useCallback(async (driveId: string, path?: string, sourceIdx?: number) => {
    setIsLoading(true)
    setError(null)
    setSelectedFiles(new Set())

    try {
      let url = `/api/sharepoint?action=list-files&driveId=${encodeURIComponent(driveId)}`
      if (path) {
        url += `&folderPath=${encodeURIComponent(path)}`
      }

      const response = await fetch(url)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      const files = (result.data.files || []).map((f: SharePointFile) => ({
        ...f,
        _driveId: driveId,
        _sourceIndex: sourceIdx,
      }))
      setBrowseFiles(files)
      setBrowseFolders(result.data.folders || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load files')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Navigate to folder (within browsing mode)
  const handleFolderClick = async (folder: SharePointFolder) => {
    if (browsingSourceIndex !== null) {
      const src = connectedSources[browsingSourceIndex]
      const newPath = [...currentPath, folder.name]
      setCurrentPath(newPath)
      await loadFiles(src.driveId, newPath.join('/'), browsingSourceIndex)
    }
  }

  // Enter browsing mode for a specific source
  const handleBrowseSource = async (sourceIndex: number) => {
    const src = connectedSources[sourceIndex]
    setBrowsingSourceIndex(sourceIndex)
    const initialPath = src.folderPath ? src.folderPath.split('/').filter(Boolean) : []
    setCurrentPath(initialPath)
    setBrowseFiles(src.files)
    setBrowseFolders(src.folders)
  }

  // Go back in browsing mode
  const handleBack = async () => {
    if (browsingSourceIndex !== null) {
      const src = connectedSources[browsingSourceIndex]
      if (currentPath.length > 0) {
        const newPath = currentPath.slice(0, -1)
        setCurrentPath(newPath)
        await loadFiles(src.driveId, newPath.length > 0 ? newPath.join('/') : undefined, browsingSourceIndex)
      } else {
        // Exit browsing mode - go back to combined view
        setBrowsingSourceIndex(null)
        setCurrentPath([])
      }
    }
  }

  // Go back to combined view
  const handleGoHome = () => {
    setBrowsingSourceIndex(null)
    setCurrentPath([])
    setSelectedFiles(new Set())
  }

  // Refresh
  const handleRefresh = async () => {
    if (browsingSourceIndex !== null) {
      const src = connectedSources[browsingSourceIndex]
      await loadFiles(src.driveId, currentPath.length > 0 ? currentPath.join('/') : undefined, browsingSourceIndex)
    }
  }

  // Toggle file selection
  const handleFileToggle = (file: SharePointFile) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(file.id)) {
        newSet.delete(file.id)
      } else {
        newSet.add(file.id)
      }
      return newSet
    })
  }

  // Toggle select all
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(supportedFiles.map((f) => f.id)))
    }
  }

  // Confirm file selection - group by driveId
  const handleSelectFiles = () => {
    if (selectedFiles.size > 0) {
      const selected = allFiles.filter((f) => selectedFiles.has(f.id))

      // Use the driveId from the first file or first source
      const primaryDriveId = selected[0]?._driveId || connectedSources[0]?.driveId || ''
      onFileSelect(selected, primaryDriveId)
    }
  }

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Check if file is supported
  function isSupportedFile(fileName: string) {
    const ext = fileName.toLowerCase()
    return (
      ext.endsWith('.pdf') ||
      ext.endsWith('.docx') ||
      ext.endsWith('.xlsx') ||
      ext.endsWith('.jpg') ||
      ext.endsWith('.jpeg') ||
      ext.endsWith('.png')
    )
  }

  // Get source label from URL
  function getSourceLabel(url: string) {
    try {
      const parts = url.split('/')
      const sitesIdx = parts.findIndex(p => p === 'sites')
      if (sitesIdx >= 0 && parts[sitesIdx + 1]) {
        return decodeURIComponent(parts[sitesIdx + 1])
      }
      // Try to get last meaningful path segment
      const meaningfulParts = parts.filter(p => p && p !== 'https:' && p !== '' && !p.includes('sharepoint.com'))
      return decodeURIComponent(meaningfulParts[meaningfulParts.length - 1] || url)
    } catch {
      return url
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Folder className="h-5 w-5" />
          {translations.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Form - 6 URL inputs */}
        {!isConnected && (
          <div className="space-y-4">
            <div className="space-y-3">
              {siteUrls.map((url, index) => (
                <div key={index}>
                  <label className="text-sm font-medium mb-1 block flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {translations.siteUrl} {index + 1}
                  </label>
                  <Input
                    placeholder="https://company.sharepoint.com/sites/YourSite/..."
                    value={url}
                    onChange={(e) => {
                      const updated = [...siteUrls]
                      updated[index] = e.target.value
                      setSiteUrls(updated)
                    }}
                    disabled={isConnecting}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Example: https://icpladda.sharepoint.com/sites/WelfareClaims
            </p>
            <p className="text-xs text-muted-foreground">
              You can also paste a SharePoint folder link - it will automatically navigate to that folder.
            </p>
            <Button
              onClick={handleConnect}
              disabled={isConnecting || nonEmptyUrls.length === 0}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {translations.loading}
                </>
              ) : (
                <>
                  {translations.connect} ({nonEmptyUrls.length} path{nonEmptyUrls.length > 1 ? 's' : ''})
                </>
              )}
            </Button>
          </div>
        )}

        {/* File Browser */}
        {isConnected && (
          <>
            {/* Source Tabs */}
            {connectedSources.length > 1 && browsingSourceIndex === null && (
              <div className="flex flex-wrap gap-2 pb-2 border-b">
                <div className="text-xs text-muted-foreground font-medium py-1">
                  {connectedSources.length} sources connected:
                </div>
                {connectedSources.map((src, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleBrowseSource(idx)}
                    className="text-xs px-2.5 py-1 rounded-full bg-icp-primary/10 text-icp-primary hover:bg-icp-primary/20 transition-colors"
                  >
                    {getSourceLabel(src.url)} ({src.files.length} files)
                  </button>
                ))}
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-2 pb-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoHome}
                disabled={isLoading || browsingSourceIndex === null}
                title="Back to all sources"
              >
                <Home className="h-4 w-4" />
              </Button>
              {browsingSourceIndex !== null && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  disabled={isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {translations.back}
                </Button>
              )}
              <div className="flex-1 text-sm text-muted-foreground truncate">
                {browsingSourceIndex !== null ? (
                  <>
                    Source {browsingSourceIndex + 1}: /{currentPath.join('/')}
                  </>
                ) : (
                  `ไฟล์ทั้งหมดจาก ${connectedSources.length} sources (${allFiles.length} files)`
                )}
              </div>
              {browsingSourceIndex !== null && (
                <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading}>
                  <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                </Button>
              )}
            </div>

            {/* Select All Header */}
            {supportedFiles.length > 0 && (
              <div className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-md">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  disabled={isLoading}
                >
                  {allSelected ? (
                    <CheckSquare className="h-5 w-5 text-primary" />
                  ) : someSelected ? (
                    <MinusSquare className="h-5 w-5 text-primary" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                  <span>
                    {allSelected
                      ? 'Deselect All'
                      : `Select All (${supportedFiles.length} files)`}
                  </span>
                </button>
                {selectedFiles.size > 0 && (
                  <span className="text-sm text-muted-foreground ml-auto">
                    {selectedFiles.size} selected
                  </span>
                )}
              </div>
            )}

            {/* File List */}
            <div className="max-h-80 overflow-y-auto border rounded-md">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : allFolders.length === 0 && allFiles.length === 0 ? (
                <div className="text-center text-muted-foreground p-8">
                  {translations.noFiles}
                </div>
              ) : (
                <div className="divide-y">
                  {/* Folders (only in browsing mode) */}
                  {browsingSourceIndex !== null && allFolders.map((folder) => (
                    <div
                      key={folder.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleFolderClick(folder)}
                    >
                      <Folder className="h-5 w-5 text-yellow-500" />
                      <span className="flex-1 truncate">{folder.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {folder.childCount} items
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}

                  {/* Files */}
                  {allFiles.map((file) => {
                    const isSupported = isSupportedFile(file.name)
                    const isSelected = selectedFiles.has(file.id)

                    return (
                      <div
                        key={`${file._sourceIndex}-${file.id}`}
                        className={cn(
                          'flex items-center gap-3 p-3 transition-colors',
                          isSupported ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-50',
                          isSelected && 'bg-primary/10'
                        )}
                        onClick={() => isSupported && handleFileToggle(file)}
                      >
                        {/* Checkbox */}
                        {isSupported ? (
                          isSelected ? (
                            <CheckSquare className="h-5 w-5 text-primary flex-shrink-0" />
                          ) : (
                            <Square className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          )
                        ) : (
                          <div className="w-5" />
                        )}

                        <FileText
                          className={cn(
                            'h-5 w-5 flex-shrink-0',
                            file.name.toLowerCase().endsWith('.pdf')
                              ? 'text-red-500'
                              : file.name.toLowerCase().endsWith('.xlsx')
                              ? 'text-green-500'
                              : file.name.toLowerCase().endsWith('.docx')
                              ? 'text-blue-500'
                              : 'text-gray-500'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-sm">{file.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatSize(file.size)} - {formatDate(file.lastModifiedDateTime)}
                            {browsingSourceIndex === null && connectedSources.length > 1 && file._sourceIndex !== undefined && (
                              <span className="ml-2 text-icp-primary">
                                [Source {file._sourceIndex + 1}]
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Process Selected Button */}
            {selectedFiles.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-md">
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {selectedFiles.size} file{selectedFiles.size > 1 ? 's' : ''} selected
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {allFiles
                      .filter((f) => selectedFiles.has(f.id))
                      .map((f) => f.name)
                      .join(', ')}
                  </div>
                </div>
                <Button onClick={handleSelectFiles} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {translations.loading}
                    </>
                  ) : (
                    <>Process {selectedFiles.size} File{selectedFiles.size > 1 ? 's' : ''}</>
                  )}
                </Button>
              </div>
            )}

            {/* Change Site Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsConnected(false)
                setConnectedSources([])
                setBrowsingSourceIndex(null)
                setCurrentPath([])
                setBrowseFiles([])
                setBrowseFolders([])
                setSelectedFiles(new Set())
              }}
              className="w-full"
            >
              Change SharePoint Sites
            </Button>
          </>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md whitespace-pre-line">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
