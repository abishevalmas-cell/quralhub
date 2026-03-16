'use client'
import { HeroSection } from '@/components/home/HeroSection'
import { ToolGrid } from '@/components/home/ToolGrid'
import { InfiniteGridBackground } from '@/components/ui/the-infinite-grid'

export default function HomePage() {
  return (
    <InfiniteGridBackground className="min-h-screen">
      <HeroSection />
      <ToolGrid />
    </InfiniteGridBackground>
  )
}
