import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { GoogleSignInButton } from "@/components/booknest/GoogleSignInButton";
import { Logo } from "@/components/booknest/Logo";
import { signIn, signInWithGoogle } from "@/lib/booknest/db.functions";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    google: search.google === "true" ? "true" : undefined,
  }),
  head: () => ({ meta: [{ title: "Sign In - Book Nest" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await signIn({ data: { email, password } });
      if (result.role === "admin") {
        await navigate({ to: "/admin" });
        return;
      }
      await navigate({ to: "/home", search: { userId: result.user.id } });
    } catch (caught) {
      setError(readError(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  const continueWithGoogle = async (credential: string) => {
    setError("");
    setIsSubmitting(true);
    try {
      const result = await signInWithGoogle({ data: { credential } });
      if (result.role === "admin") {
        await navigate({ to: "/admin" });
        return;
      }
      await navigate({ to: "/home", search: { userId: result.user.id } });
    } catch (caught) {
      setError(readError(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--color-primary)_10%,transparent),transparent_34%),var(--color-background)] px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <Logo />
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold shadow-card hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1fr_440px]">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1.5 text-sm font-bold text-primary shadow-card">
              <ShieldCheck className="h-4 w-4" />
              Secure database access
            </div>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Sign in to Book Nest
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Students continue to their library profile. Admins use separate credentials to open
              the dashboard and records.
            </p>
          </div>

          <form
            onSubmit={submit}
            className="rounded-2xl border border-border bg-card p-6 shadow-[0_24px_70px_color-mix(in_oklch,var(--color-primary)_12%,transparent)]"
          >
            <h2 className="text-2xl font-extrabold">Account login</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Frontend calls server APIs. PostgreSQL is only used on the server.
            </p>

            {error && (
              <div className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                {error}
              </div>
            )}

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-bold">
                Email
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background py-3 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Password
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background py-3 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </label>
            </div>

            <button
              disabled={isSubmitting}
              className="mt-5 w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_color-mix(in_oklch,var(--color-primary)_24%,transparent)] hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
            <GoogleSignInButton onCredential={continueWithGoogle} disabled={isSubmitting} />

            <div className="mt-5 text-center text-sm text-muted-foreground">
              No student account?{" "}
              <Link to="/signup" className="font-bold text-primary">
                Sign up
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function readError(error: unknown) {
  try {
    const parsed = JSON.parse((error as Error).message) as { message?: string };
    return parsed.message ?? "Request failed.";
  } catch {
    return (error as Error).message || "Request failed.";
  }
}
