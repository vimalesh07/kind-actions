import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Mail, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/booknest/Logo";
import { departments, type Department } from "@/lib/booknest/data";
import { signUp } from "@/lib/booknest/db.functions";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign Up - Book Nest" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    registerNumber: "",
    department: "CSE" as Department,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const user = await signUp({ data: form });
      await navigate({ to: "/home", search: { userId: user.id } });
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
              <UserPlus className="h-4 w-4" />
              Student access
            </div>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Create your Book Nest profile
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Your student profile is saved securely in PostgreSQL.
            </p>
          </div>

          <form
            onSubmit={submit}
            className="rounded-2xl border border-border bg-card p-6 shadow-[0_24px_70px_color-mix(in_oklch,var(--color-primary)_12%,transparent)]"
          >
            <h2 className="text-2xl font-extrabold">Student signup</h2>
            <p className="mt-2 text-sm text-muted-foreground">Create a database-backed profile.</p>

            {error && (
              <div className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                {error}
              </div>
            )}

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-bold">
                Full name
                <input
                  value={form.fullName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Email
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, email: event.target.value }))
                    }
                    className="w-full rounded-lg border border-border bg-background py-3 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Register number
                <input
                  value={form.registerNumber}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, registerNumber: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Department
                <select
                  value={form.department}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      department: event.target.value as Department,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {departments.map((department) => (
                    <option key={department}>{department}</option>
                  ))}
                </select>
              </label>
            </div>

            <button
              disabled={isSubmitting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_color-mix(in_oklch,var(--color-primary)_24%,transparent)] hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4" />
              {isSubmitting ? "Creating..." : "Sign Up"}
            </button>
            <Link
              to="/login"
              className="mt-3 block w-full rounded-lg border border-border px-4 py-3 text-center text-sm font-bold hover:bg-accent"
            >
              Continue with Google
            </Link>
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
