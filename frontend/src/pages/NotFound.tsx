import Button from "../components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ivory text-center">
      <h1 className="font-display text-3xl text-ink">Page not found</h1>
      <p className="text-ink-muted">The page you're looking for doesn't exist.</p>
      <Button href="/dashboard">Go home</Button>
    </div>
  );
}
