import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const retroButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-none text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-retro-green text-retro-green-foreground hover:bg-retro-green-dark border-2 border-retro-border",
        outline: "border-2 border-retro-border bg-transparent hover:bg-retro-green hover:text-retro-green-foreground",
        secondary:
          "bg-retro-green-light text-retro-green-foreground hover:bg-retro-green-dark border-2 border-retro-border",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface RetroButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof retroButtonVariants> {
  asChild?: boolean
}

const RetroButton = React.forwardRef<HTMLButtonElement, RetroButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(retroButtonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
RetroButton.displayName = "RetroButton"

export { RetroButton, retroButtonVariants }
