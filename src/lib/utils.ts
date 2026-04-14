import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

export function formatDate(date: string | Date | null): string {
  if (!date) return '—'
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return '—'
  return format(new Date(date), 'MMM d, yyyy h:mm a')
}

export function timeAgo(date: string | Date | null): string {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatNumber(n: number): string {
  return n.toLocaleString()
}

export const BATCH_SIZE_OPTIONS = [1, 2, 3, 5, 10, 20, 50, 0] // 0 = all
export const BATCH_SIZE_LABELS: Record<number, string> = {
  0: 'All unsent leads',
  1: '1 email', 2: '2 emails', 3: '3 emails',
  5: '5 emails', 10: '10 emails', 20: '20 emails', 50: '50 emails',
}

export const INTERVAL_OPTIONS = [1, 2, 3, 5, 10, 15, 30, 60]
export const FOLLOWUP_DAY_OPTIONS = [1, 2, 3, 4, 5]

export function getStatusColor(status: string) {
  switch (status) {
    case 'active': return 'text-brand-600 bg-brand-50'
    case 'paused': return 'text-amber-700 bg-amber-50'
    case 'stopped': return 'text-red-700 bg-red-50'
    case 'sent': return 'text-brand-600 bg-brand-50'
    case 'pending': return 'text-amber-700 bg-amber-50'
    case 'failed': return 'text-red-700 bg-red-50'
    default: return 'text-gray-600 bg-gray-100'
  }
}
