import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CreditCard,
  QrCode,
  Radio,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { Logo } from "@/components/booknest/Logo";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Book Nest - Smart RFID and QR library system" }] }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--color-primary)_10%,transparent),transparent_36%),linear-gradient(180deg,var(--color-background),color-mix(in_oklch,var(--color-background)_90%,white))]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 sm:px-6">
        <header className="flex items-center justify-between gap-4 py-5">
          <Logo />
        </header>

        <section className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[1fr_0.92fr] lg:py-12">
          <div className="max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-3 py-1.5 text-sm font-bold text-primary shadow-card">
              <ShieldCheck className="h-4 w-4" />
              Smart RFID + QR Library System
            </div>

            <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
              Book Nest
            </h1>
            <p className="mt-4 text-2xl font-bold leading-tight text-foreground">
              Smart library automation for students and admins
            </p>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground lg:mx-0">
              RFID verifies the student. QR identifies the book. Admin tracks every borrow, return,
              fine, and payment.
            </p>

            <div className="mt-8 flex justify-center lg:justify-start">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-extrabold text-primary-foreground shadow-[0_16px_34px_color-mix(in_oklch,var(--color-primary)_30%,transparent)] transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-dark)]"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <SystemPreview />
        </section>

        <WorkflowStrip />
      </div>
    </main>
  );
}

function SystemPreview() {
  const flow = [
    { icon: Radio, label: "RFID card detected", detail: "RFID-001 verified" },
    { icon: UserRoundCheck, label: "Student profile matched", detail: "Ananya Sharma - CSE" },
    { icon: QrCode, label: "Scan Book QR", detail: "BOOK-001 identified" },
    { icon: BookOpenCheck, label: "Borrow record sent", detail: "Admin dashboard updated" },
  ];

  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[2rem] bg-primary/5 blur-2xl" />
      <div className="relative rounded-2xl border border-border bg-card/95 p-4 shadow-[0_24px_70px_color-mix(in_oklch,var(--color-primary)_14%,transparent)] backdrop-blur">
        <div className="rounded-xl border border-border bg-[color-mix(in_oklch,var(--color-card)_88%,var(--color-muted))] p-4">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Live prototype flow
              </div>
              <div className="mt-1 text-lg font-extrabold">RFID + QR session</div>
            </div>
            <div className="rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
              Ready
            </div>
          </div>

          <div className="grid gap-3">
            {flow.map(({ icon: Icon, label, detail }, index) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{label}</div>
                  <div className="text-sm text-muted-foreground">{detail}</div>
                </div>
                <div className="grid h-7 w-7 place-items-center rounded-full bg-success/10 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                {index < flow.length - 1 && <div className="sr-only">Next</div>}
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted p-3">
              <div className="text-xs font-bold uppercase text-muted-foreground">Due date</div>
              <div className="mt-1 font-mono text-sm font-bold">2026-06-30</div>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="text-xs font-bold uppercase text-muted-foreground">Fine check</div>
              <div className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-success">
                <CreditCard className="h-4 w-4" />
                Clear
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowStrip() {
  const items = [
    { icon: Radio, title: "Tap RFID", text: "Student identity is verified." },
    { icon: QrCode, title: "Scan Book QR", text: "Book details are captured." },
    { icon: BookOpenCheck, title: "Admin Records", text: "Borrow and return logs update." },
  ];

  return (
    <section className="mb-8 rounded-2xl border border-border bg-card/90 p-3 shadow-card">
      <div className="grid gap-3 md:grid-cols-3">
        {items.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3 rounded-xl px-3 py-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold">{title}</div>
              <div className="text-sm text-muted-foreground">{text}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
