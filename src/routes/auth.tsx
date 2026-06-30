import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, KeyRound, Mail, UserPlus } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { GoogleSignInButton } from "@/components/booknest/GoogleSignInButton";
import { Logo } from "@/components/booknest/Logo";
import { departments, type Department } from "@/lib/booknest/data";
import { signIn, signInWithGoogle, signUp, signUpWithGoogle } from "@/lib/booknest/db.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Auth - Book Nest" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [login, setLogin] = useState({ email: "", password: "" });
  const [signup, setSignup] = useState({
    fullName: "",
    email: "",
    registerNumber: "",
    department: "CSE" as Department,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const result = await signIn({ data: login });
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

  const submitSignup = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const user = await signUp({ data: signup });
      await navigate({ to: "/profile", search: { userId: user.id } });
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
      const result =
        mode === "signup"
          ? await signUpWithGoogle({ data: { credential } })
          : await signInWithGoogle({ data: { credential } });
      if (result.role === "admin") {
        await navigate({ to: "/admin" });
        return;
      }
      await navigate({
        to: mode === "signup" ? "/profile" : "/home",
        search: { userId: result.user.id },
      });
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

        <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1fr_460px]">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1.5 text-sm font-bold text-primary shadow-card">
              RFID + QR access
            </div>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Enter Book Nest
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Students continue to their RFID-linked library profile. Admin credentials open the
              management dashboard.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_24px_70px_color-mix(in_oklch,var(--color-primary)_12%,transparent)]">
            <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
              {(["signin", "signup"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setMode(item);
                    setError("");
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-bold ${
                    mode === item ? "bg-card text-foreground shadow-card" : "text-muted-foreground"
                  }`}
                >
                  {item === "signin" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                {error}
              </div>
            )}

            {mode === "signin" ? (
              <form onSubmit={submitLogin} className="mt-5 grid gap-4">
                <Input
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={login.email}
                  onChange={(value) => setLogin((current) => ({ ...current, email: value }))}
                />
                <Input
                  icon={<KeyRound className="h-4 w-4" />}
                  label="Password"
                  type="password"
                  value={login.password}
                  onChange={(value) => setLogin((current) => ({ ...current, password: value }))}
                />
                <PrimaryButton disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </PrimaryButton>
              </form>
            ) : (
              <form onSubmit={submitSignup} className="mt-5 grid gap-4">
                <PlainInput
                  label="Full name"
                  value={signup.fullName}
                  onChange={(value) => setSignup((current) => ({ ...current, fullName: value }))}
                />
                <Input
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={signup.email}
                  onChange={(value) => setSignup((current) => ({ ...current, email: value }))}
                />
                <PlainInput
                  label="Register number"
                  value={signup.registerNumber}
                  onChange={(value) =>
                    setSignup((current) => ({ ...current, registerNumber: value }))
                  }
                />
                <label className="grid gap-2 text-sm font-bold">
                  Department
                  <select
                    value={signup.department}
                    onChange={(event) =>
                      setSignup((current) => ({
                        ...current,
                        department: event.target.value as Department,
                      }))
                    }
                    className="rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    {departments.map((department) => (
                      <option key={department}>{department}</option>
                    ))}
                  </select>
                </label>
                <PrimaryButton disabled={isSubmitting}>
                  <UserPlus className="h-4 w-4" />
                  {isSubmitting ? "Creating..." : "Sign Up"}
                </PrimaryButton>
              </form>
            )}

            <GoogleSignInButton onCredential={continueWithGoogle} disabled={isSubmitting} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  type = "text",
  icon,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  icon: ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      {label}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <input
          required
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-border bg-background py-3 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </label>
  );
}

function PlainInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      {label}
      <input
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function PrimaryButton({ children, disabled }: { children: ReactNode; disabled: boolean }) {
  return (
    <button
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_color-mix(in_oklch,var(--color-primary)_24%,transparent)] hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
    >
      {children}
    </button>
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
