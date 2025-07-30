import * as React from "react"
import { cn } from "@/lib/utils"

const RetroCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-none border-2 border-retro-border bg-retro-background text-retro-text shadow-none",
        "p-4", // Default padding
        className,
      )}
      {...props}
    />
  ),
)
RetroCard.displayName = "RetroCard"

const RetroCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex flex-col space-y-1.5", className)} {...props} />,
)
RetroCardHeader.displayName = "RetroCardHeader"

const RetroCardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-bold leading-none tracking-tight retro-text", className)} {...props} />
  ),
)
RetroCardTitle.displayName = "RetroCardTitle"

const RetroCardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground retro-text", className)} {...props} />
  ),
)
RetroCardDescription.displayName = "RetroCardDescription"

const RetroCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("pt-0", className)} {...props} />,
)
RetroCardContent.displayName = "RetroCardContent"

const RetroCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex items-center pt-0", className)} {...props} />,
)
RetroCardFooter.displayName = "RetroCardFooter"

export { RetroCard, RetroCardHeader, RetroCardFooter, RetroCardTitle, RetroCardDescription, RetroCardContent }
