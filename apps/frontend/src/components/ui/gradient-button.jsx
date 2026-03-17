import React from "react"
import { cn } from "../../lib/utils"

const GradientButton = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  return (
    <button
      className={cn(
        "gradient-button",
        variant === "variant" && "gradient-button-variant",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})

GradientButton.displayName = "GradientButton"

export { GradientButton }
