'use client'

import { Globe } from 'lucide-react'
import { Button } from './ui/button'
import { Language } from '@/lib/types'

interface LanguageSwitcherProps {
  currentLanguage: Language
  onLanguageChange: (lang: Language) => void
}

export function LanguageSwitcher({ currentLanguage, onLanguageChange }: LanguageSwitcherProps) {
  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <div className="flex border rounded-md overflow-hidden">
        <Button
          variant={currentLanguage === 'en' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onLanguageChange('en')}
          className="rounded-none h-8 px-3"
        >
          EN
        </Button>
        <Button
          variant={currentLanguage === 'th' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onLanguageChange('th')}
          className="rounded-none h-8 px-3"
        >
          TH
        </Button>
      </div>
    </div>
  )
}
