import type { ReactNode } from "react";

export default function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-soft)] ${className}`}>
      {children}
    </div>
  );
}
