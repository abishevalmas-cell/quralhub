import { FeedbackForm } from '@/components/tools/FeedbackForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Кері байланыс — Quralhub',
  description: 'Пікір қалдыру',
}

export default function FeedbackPage() {
  return <FeedbackForm />
}
