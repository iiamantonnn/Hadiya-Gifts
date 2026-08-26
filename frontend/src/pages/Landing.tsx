import Button from "../components/ui/Button";

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-2xl font-semibold text-forest">Hadiya</span>
        <div className="flex gap-3">
          <Button href="/login" variant="ghost" size="sm">Log In</Button>
          <Button href="/register" variant="primary" size="sm">Create Account</Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-display text-5xl font-semibold leading-tight text-ink sm:text-6xl">
          More than a gift.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-muted">
          Hadiya helps you remember the people who matter, the moments worth celebrating, and the
          gifts that actually mean something - flowers, wishlists, handwritten words, and a little
          help from AI when you're not sure where to start.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button href="/register" size="lg">Create your account</Button>
          <Button href="/login" variant="ghost" size="lg">I already have one</Button>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-ink-faint">
        Hadiya - privacy-first gifting.
      </footer>
    </div>
  );
}
