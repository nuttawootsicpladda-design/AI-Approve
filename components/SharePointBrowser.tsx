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

const SHAREPOINT_URL_KEY = 'po-approval-sharepoint-url'

export function SharePointBrowser({
  onFileSelect,
  isProcessing = false,
  translations,
}: SharePointBrowserProps) {
  const [siteUrl, setSiteUrl] = useState('')
  const [driveId, setDriveId] = useState<string | null>(null)

  // Load saved SharePoint URL from localStorage on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem(SHAREPOINT_URL_KEY)
    if (savedUrl) {
      setSiteUrl(savedUrl)
    }
  }, [])
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<SharePointFile[]>([])
  const [folders, setFolders] = useState<SharePointFolder[]>([])
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

  // Get supported files only
  const supportedFiles = useMemo(() => {
    return files.filter((file) => isSupportedFile(file.name))
  }, [files])

  // Check if all supported files are selected
  const allSelected = useMemo(() => {
    return supportedFiles.length > 0 && supportedFiles.every((f) => selectedFiles.has(f.id))
  }, [supportedFiles, selectedFiles])

  // Check if some (but not all) files are selected
  const someSelected = useMemo(() => {
    return supportedFiles.some((f) => selectedFiles.has(f.id)) && !allSelected
  }, [supportedFiles, selectedFiles, allSelected])

  // Connect to SharePoint site
  const handleConnect = async () => {
    if (!siteUrl.trim()) {
      setError('Please enter a SharePoint site URL')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/sharepoint?action=get-drive&siteUrl=${encodeURIComponent(siteUrl)}`
      )
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      setDriveId(result.data.driveId)

      // Save URL to localStorage for next time
      localStorage.setItem(SHAREPOINT_URL_KEY, siteUrl)

      // If URL contained a folder path, navigate to it
      if (result.data.initialFolderPath) {
        const pathParts = result.data.initialFolderPath.split('/').filter(Boolean)
        setCurrentPath(pathParts)
        await loadFiles(result.data.driveId, result.data.initialFolderPath)
      } else {
        setCurrentPath([])
        await loadFiles(result.data.driveId)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to SharePoint')
    } finally {
      setIsConnecting(false)
    }
  }

  // Load files from current folder
  const loadFiles = useCallback(async (drive: string, path?: string) => {
    setIsLoading(true)
    setError(null)
    setSelectedFiles(new Set()) // Clear selection when navigating

    try {
      let url = `/api/sharepoint?action=list-files&driveId=${encodeURIComponent(drive)}`
      if (path) {
        url += `&folderPath=${encodeURIComponent(path)}`
      }

      const response = await fetch(url)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      setFiles(result.data.files)
      setFolders(result.data.folders)
    } catch (err: any) {
      setError(err.message || 'Failed to load files')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Navigate to folder
  const handleFolderClick = async (folder: SharePointFolder) => {
    const newPath = [...currentPath, folder.name]
    setCurrentPath(newPath)
    if (driveId) {
      await loadFiles(driveId, newPath.join('/'))
    }
  }

  // Go back to parent folder
  const handleBack = async () => {
    const newPath = currentPath.slice(0, -1)
    setCurrentPath(newPath)
    if (driveId) {
      await loadFiles(driveId, newPath.length > 0 ? newPath.join('/') : undefined)
    }
  }

  // Go to root
  const handleGoHome = async () => {
    setCurrentPath([])
    if (driveId) {
      await loadFiles(driveId)
    }
  }

  // Refresh current folder
  const handleRefresh = async () => {
    if (driveId) {
      await loadFiles(driveId, currentPath.length > 0 ? currentPath.join('/') : undefined)
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
      // Deselect all
      setSelectedFiles(new Set())
    } else {
      // Select all supported files
      setSelectedFiles(new Set(supportedFiles.map((f) => f.id)))
    }
  }

  // Confirm file selection
  const handleSelectFiles = () => {
    if (selectedFiles.size > 0 && driveId) {
      const selected = files.filter((f) => selectedFiles.has(f.id))
      onFileSelect(selected, driveId)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Folder className="h-5 w-5" />
          {translations.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Form */}
        {!driveId && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">
                {translations.siteUrl}
              </label>
              <Input
                placeholder="https://company.sharepoint.com/sites/YourSite"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                disabled={isConnecting}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Example: https://icpladda.sharepoint.com/sites/WelfareClaims
              </p>
              <p className="text-xs text-muted-foreground">
                You can also paste a SharePoint folder link - it will automatically navigate to
                that folder.
              </p>
            </div>
            <Button
              onClick={handleConnect}
              disabled={isConnecting || !siteUrl.trim()}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {translations.loading}
                </>
              ) : (
                translations.connect
              )}
            </Button>
          </div>
        )}

        {/* File Browser */}
        {driveId && (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-2 pb-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoHome}
                disabled={isLoading || currentPath.length === 0}
              >
                <Home className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={isLoading || currentPath.length === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                {translations.back}
              </Button>
              <div className="flex-1 text-sm text-muted-foreground truncate">
                /{currentPath.join('/')}
              </div>
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
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
              ) : folders.length === 0 && files.length === 0 ? (
                <div className="text-center text-muted-foreground p-8">
                  {translations.noFiles}
                </div>
              ) : (
                <div className="divide-y">
                  {/* Folders */}
                  {folders.map((folder) => (
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
                  {files.map((file) => {
                    const isSupported = isSupportedFile(file.name)
                    const isSelected = selectedFiles.has(file.id)

                    return (
                      <div
                        key={file.id}
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
                    {files
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
                setDriveId(null)
                setFiles([])
                setFolders([])
                setCurrentPath([])
                setSelectedFiles(new Set())
              }}
              className="w-full"
            >
              Change SharePoint Site
            </Button>
          </>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
