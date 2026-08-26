import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

export const fieldBase =
  "w-full rounded-[var(--radius-control)] border border-border bg-surface px-4 py-3 text-ink placeholder:text-ink-faint focus:border-forest focus:outline-none transition-colors";

interface FieldWrapProps {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function FieldWrap({ label, error, hint, children }: FieldWrapProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-ink-muted">{label}</span>}
      {children}
      {hint && !error && <span className="text-xs text-ink-faint">{hint}</span>}
      {error && <span className="text-xs text-error">{error}</span>}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string };
export function Input({ label, error, hint, className = "", ...rest }: InputProps) {
  return (
    <FieldWrap label={label} error={error} hint={hint}>
      <input className={`${fieldBase} ${error ? "border-error" : ""} ${className}`} {...rest} />
    </FieldWrap>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string; hint?: string };
export function Textarea({ label, error, hint, className = "", ...rest }: TextareaProps) {
  return (
    <FieldWrap label={label} error={error} hint={hint}>
      <textarea className={`${fieldBase} min-h-24 ${error ? "border-error" : ""} ${className}`} {...rest} />
    </FieldWrap>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string };
export function Select({ label, error, className = "", children, ...rest }: SelectProps) {
  return (
    <FieldWrap label={label} error={error}>
      <select className={`${fieldBase} ${error ? "border-error" : ""} ${className}`} {...rest}>
        {children}
      </select>
    </FieldWrap>
  );
}
