import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastKind = 'default' | 'success' | 'error'
interface ToastItem { id: number; title: string; description?: string; kind: ToastKind }
interface ToastContextValue {
  show: (t: Omit<ToastItem, 'id'>) => void
  success: (msg: string, description?: string) => void
  error: (msg: string, description?: string) => void
}
const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])
  const counter = React.useRef(0)

  const show = React.useCallback((t: Omit<ToastItem, 'id'>) => {
    counter.current += 1
    const id = counter.current
    setItems((prev) => [...prev, { ...t, id }])
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 4000)
  }, [])

  const value: ToastContextValue = {
    show,
    success: (m, d) => show({ title: m, description: d, kind: 'success' }),
    error: (m, d) => show({ title: m, description: d, kind: 'error' })
  }

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {items.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            className={cn(
              'card-surface flex items-start justify-between gap-3 p-4 data-[state=open]:animate-in data-[state=closed]:animate-out',
              t.kind === 'success' && 'border-emerald-600',
              t.kind === 'error' && 'border-destructive'
            )}
          >
            <div>
              <ToastPrimitive.Title className="font-semibold">{t.title}</ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="text-sm text-muted-foreground">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close className="rounded-md p-1 hover:bg-secondary">
              <X className="h-4 w-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-[360px] max-w-[95vw] flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
