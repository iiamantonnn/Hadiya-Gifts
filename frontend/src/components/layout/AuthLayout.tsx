import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-ivory px-6 py-10">
      <Link to="/" className="font-display text-2xl font-semibold text-forest">Hadiya</Link>
      <div className="mt-10 w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
