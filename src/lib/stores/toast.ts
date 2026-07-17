import { writable } from 'svelte/store'
import { DEFAULT_TOAST_DURATION_MS } from '../constants'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

export const toasts = writable<Toast[]>([])

let counter = 0

export function addToast(message: string, type: ToastType = 'info', duration = DEFAULT_TOAST_DURATION_MS) {
  const id = `toast-${++counter}`
  toasts.update(t => [...t, { id, message, type, duration }])
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration)
  }
  return id
}

export function removeToast(id: string) {
  toasts.update(t => t.filter(toast => toast.id !== id))
}
