import { forwardRef, useId, type InputHTMLAttributes } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible label above the input. Without one, pass aria-label or a placeholder. */
  label?: string
  hint?: string
  error?: string | null
}

// Text input (global app.css .field), with an optional label, hint and error line.
export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hint, error, id, className = '', ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const noteId = `${inputId}-note`
    const note = error || hint

    const input = (
      <input
        ref={ref}
        id={inputId}
        className={`field ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        {...props}
      />
    )

    if (!label && !note) return input

    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="field-label">
            {label}
          </label>
        )}
        {input}
        {note && (
          <p id={noteId} className={error ? 'field-error' : 'field-hint'}>
            {note}
          </p>
        )}
      </div>
    )
  },
)
Field.displayName = 'Field'
