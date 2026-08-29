import * as React from "react"
import { cn } from "@/lib/cn"
import FormError from "./FormError"

type FormControlElement = React.ReactElement<{
  id?: string
  "aria-describedby"?: string
  "aria-invalid"?: React.AriaAttributes["aria-invalid"]
  required?: boolean
}>

export interface FormFieldProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  id: string
  label: React.ReactNode
  children: FormControlElement
  error?: React.ReactNode
  helperText?: React.ReactNode
  required?: boolean
}

export default function FormField({
  id,
  label,
  children,
  error,
  helperText,
  required = false,
  className,
  ...props
}: FormFieldProps) {
  const helperId = helperText ? `${id}-helper` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [children.props["aria-describedby"], helperId, errorId]
    .filter(Boolean)
    .join(" ") || undefined

  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      <label htmlFor={id} className="block text-sm font-semibold text-[var(--text-heading)]">
        {label}
        {required ? (
          <span className="ml-1 text-[var(--warning)]" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {React.cloneElement(children, {
        id,
        required: children.props.required ?? required,
        "aria-invalid": children.props["aria-invalid"] ?? (error ? true : undefined),
        "aria-describedby": describedBy,
      })}
      {helperText ? (
        <p id={helperId} className="text-sm text-[var(--text-muted)]">
          {helperText}
        </p>
      ) : null}
      {error ? <FormError id={errorId}>{error}</FormError> : null}
    </div>
  )
}
