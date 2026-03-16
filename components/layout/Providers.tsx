'use client'
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Lang } from '@/lib/i18n'
import { STORAGE_KEYS } from '@/lib/constants'

type Theme = 'light' | 'dark'

interface AppContextType {
  lang: Lang
  toggleLang: () => void
  theme: Theme
  toggleTheme: () => void
}

const AppContext = createContext<AppContextType>({
  lang: 'kz',
  toggleLang: () => {},
  theme: 'light',
  toggleTheme: () => {},
})

export function useApp() {
  return useContext(AppContext)
}

export function Providers({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('kz')
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const savedLang = localStorage.getItem(STORAGE_KEYS.LANG) as Lang | null
    if (savedLang) setLang(savedLang)
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as Theme | null
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const initial = savedTheme || (prefersDark ? 'dark' : 'light')
    setTheme(initial as Theme)
    document.documentElement.classList.toggle('dark', initial === 'dark')
  }, [])

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === 'kz' ? 'ru' : 'kz'
      localStorage.setItem(STORAGE_KEYS.LANG, next)
      return next
    })
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark', next === 'dark')
      localStorage.setItem(STORAGE_KEYS.THEME, next)
      return next
    })
  }, [])

  return (
    <AppContext value={{ lang, toggleLang, theme, toggleTheme }}>
      {children}
    </AppContext>
  )
}
