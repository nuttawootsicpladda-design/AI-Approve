'use client'

import { useCallback, useState } from 'react'
import { Upload, FileText, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  isProcessing?: boolean
  acceptedFormats?: string[]
  translations: {
    dropFile: string
    supportedFormats: string
    processing: string
  }
}

export function FileUpload({
  onFileSelect,
  isProcessing = false,
  acceptedFormats = ['.pdf', '.docx', '.xlsx', '.jpg', '.jpeg', '.png'],
  translations,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0]
        setSelectedFile(file)
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0]
        setSelectedFile(file)
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  return (
    <Card
      className={cn(
        'border-2 border-dashed transition-colors',
        isDragOver && 'border-primary bg-primary/5',
        isProcessing && 'opacity-50 pointer-events-none'
      )}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        {isProcessing ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">{translations.processing}</p>
          </>
        ) : (
          <>
            {selectedFile ? (
              <>
                <FileText className="h-12 w-12 text-primary mb-4" />
                <p className="text-sm font-medium mb-2">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground mb-4">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">{translations.dropFile}</p>
                <p className="text-xs text-muted-foreground mb-4">
                  {translations.supportedFormats}
                </p>
              </>
            )}
            <div>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept={acceptedFormats.join(',')}
                onChange={handleFileInput}
                disabled={isProcessing}
              />
              <Button
                variant="outline"
                type="button"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                Browse Files
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
