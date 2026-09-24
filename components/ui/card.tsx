import * as React from "react"

const Card = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        // `bg-card` / `text-card-foreground` are shadcn colour tokens that were never
        // defined in tailwind.config.js, so Tailwind emitted no rule for either and
        // every card rendered transparent over the page background. `bg-white` is what
        // the class was always meant to produce, and it matches the other Card in
        // simple-ui.tsx exactly, since a bare `border` is already gray-200.
        // The foreground token is dropped rather than replaced: it emits nothing today,
        // so removing it cannot change any text colour, whereas substituting one could.
        className={`rounded-lg border bg-white shadow-sm ${className || ''}`}
        {...props}
    />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={`flex flex-col space-y-1.5 p-6 ${className || ''}`}
        {...props}
    />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={`text-2xl font-semibold leading-none tracking-tight ${className || ''}`}
        {...props}
    />
))
CardTitle.displayName = "CardTitle"

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={`p-6 pt-0 ${className || ''}`} {...props} />
))
CardContent.displayName = "CardContent"

export { Card, CardHeader, CardTitle, CardContent }
