import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

interface LabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  required?: boolean
}

export const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <LabelPrimitive.Root
      ref={ref}
      className={cn('text-xs uppercase tracking-wider text-muted-foreground', className)}
      {...props}
    >
      {children}
      {required && <span className="text-primary ml-1" aria-hidden="true">*</span>}
    </LabelPrimitive.Root>
  )
)
Label.displayName = LabelPrimitive.Root.displayName
