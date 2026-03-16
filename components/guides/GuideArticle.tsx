'use client'
import { BackButton } from '@/components/layout/BackButton'
import { ShareBar } from '@/components/shared/ShareBar'
import type { ReactNode } from 'react'

interface GuideArticleProps {
  title: string
  subtitle: string
  date: string
  readTime: string
  children: ReactNode
  tool: string
}

export function GuideArticle({ title, subtitle, date, readTime, children, tool }: GuideArticleProps) {
  return (
    <article className="max-w-[720px] mx-auto px-5 py-8">
      <BackButton />
      <div className="mb-6">
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <time>{date}</time>
          <span>&middot;</span>
          <span>{readTime} оқу</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-3">{title}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">{subtitle}</p>
      </div>
      <div className="prose prose-slate dark:prose-invert max-w-none
        [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3
        [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2
        [&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:mb-4 [&_p]:text-foreground/80
        [&_ul]:space-y-2 [&_ul]:mb-4 [&_li]:text-[15px] [&_li]:text-foreground/80
        [&_strong]:text-foreground [&_strong]:font-semibold
        [&_table]:w-full [&_table]:text-sm [&_table]:border-collapse
        [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:border [&_th]:border-border
        [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-border
        [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
      ">
        {children}
      </div>
      <ShareBar tool={tool} />
    </article>
  )
}
