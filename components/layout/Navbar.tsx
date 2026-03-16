'use client'
import { useApp } from './Providers'
import { Search, Moon, Sun } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TOOLS } from '@/lib/tools'

export function Navbar() {
  const { lang, toggleLang, theme, toggleTheme } = useApp()
  const [query, setQuery] = useState('')
  const router = useRouter()

  const filtered = query.trim()
    ? TOOLS.filter(t => t.search.toLowerCase().includes(query.toLowerCase()))
    : []

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[60px] bg-card/85 backdrop-blur-xl border-b border-border flex items-center gap-3 px-4 md:px-5">
      <Link href="/" className="flex items-center gap-2 text-primary font-extrabold text-xl tracking-tight hover:opacity-80 transition-opacity shrink-0">
        <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8 drop-shadow-sm">
          <defs><linearGradient id="lg" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#10B981"/><stop offset="1" stopColor="#059669"/></linearGradient></defs>
          <rect width="32" height="32" rx="9" fill="url(#lg)"/>
          <text x="16" y="22" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800" fontFamily="Inter,sans-serif">Q</text>
        </svg>
        <span className="hidden sm:inline">Quralhub</span>
      </Link>

      <div className="flex-1 max-w-[360px] ml-auto relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={lang === 'kz' ? 'Құрал іздеу...' : 'Поиск...'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 min-h-[44px] bg-background border border-border rounded-xl text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
        />
        {filtered.length > 0 && query.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto z-50">
            {filtered.slice(0, 8).map(tool => (
              <button
                key={tool.href}
                onClick={() => { router.push(tool.href); setQuery('') }}
                className="w-full px-4 py-2.5 text-left hover:bg-accent flex items-center gap-2 text-sm"
              >
                <span>{tool.icon}</span>
                <span className="font-medium">{tool.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={toggleTheme}
        className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center border border-border rounded-full bg-card hover:border-primary hover:bg-accent transition-all text-sm"
        title="Тема ауыстыру"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <button
        onClick={toggleLang}
        className="px-3 py-1.5 min-h-[40px] min-w-[40px] flex items-center justify-center text-xs font-bold border border-border rounded-full bg-card hover:border-primary hover:text-primary hover:bg-accent transition-all tracking-wider"
      >
        {lang === 'kz' ? 'RU' : 'KZ'}
      </button>
    </nav>
  )
}
