// Centralizes the Hadiya wordmark/logo so a real logo asset can replace the
// text below in one place. To swap in the official logo once uploaded, drop
// the file at `frontend/public/logo.svg` (or .png) and replace the <span>
// with `<img src="/logo.svg" alt="Hadiya" className={className} />`, keeping
// the current forest-green wordmark colors if the asset doesn't already
// carry them.
export default function Logo({ className = "font-display text-xl font-semibold text-forest" }: { className?: string }) {
  return <span className={className}>Hadiya</span>;
}
