import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, QrCode, Receipt, ScanLine, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Logo } from "@/components/booknest/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Book Nest — Your College Library, Reimagined" },
      { name: "description", content: "Smart library management with RFID auth, QR borrowing, wallet-based fines, and analytics — built for college libraries." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#roles" className="hover:text-foreground">For your library</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/rfid" className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent">
              <ScanLine className="h-4 w-4" /> Kiosk
            </Link>
            <Link to="/admin" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-[var(--color-primary-dark)]">
              Open Admin <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, var(--color-primary) 0, transparent 40%), radial-gradient(circle at 80% 90%, var(--color-primary) 0, transparent 40%)",
          }}
        />
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Smart Library · College Edition
            </span>
            <h1 className="mt-6 text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Your college library,<br />
              <span className="text-primary">reimagined.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              Book Nest replaces clipboards and stamp pads with RFID cards, QR codes and a wallet that handles fines automatically — so your librarians can focus on books, not paperwork.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/admin" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-[var(--color-primary-dark)]">
                Explore Admin Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/rfid" className="inline-flex items-center gap-2 rounded-lg border border-primary px-5 py-3 text-sm font-semibold text-primary hover:bg-accent">
                Try Student Kiosk
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              {[
                ["12k+", "Books indexed"],
                ["3.4k", "Students served"],
                ["98%", "On-time returns"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="text-2xl font-bold text-primary">{n}</div>
                  <div className="text-xs text-muted-foreground mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-2xl border border-border bg-card shadow-[var(--shadow-elevated)] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Borrow · CSE Section B</div>
                <span className="bn-status-borrowed inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase">Live</span>
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-5 items-center">
                <div className="grid h-28 w-28 place-items-center rounded-xl bg-[var(--color-primary)]">
                  <QrCode className="h-16 w-16 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold leading-tight">Operating System Concepts</div>
                  <div className="text-sm text-muted-foreground">Silberschatz · Wiley</div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                    <div className="rounded-md bg-muted px-2 py-1.5"><div className="text-muted-foreground">Shelf</div><div className="font-bold">B-1-4</div></div>
                    <div className="rounded-md bg-muted px-2 py-1.5"><div className="text-muted-foreground">Copies</div><div className="font-bold">4 / 4</div></div>
                    <div className="rounded-md bg-muted px-2 py-1.5"><div className="text-muted-foreground">Due</div><div className="font-bold">30d</div></div>
                  </div>
                </div>
              </div>
              <div className="mt-5 rounded-xl bg-[oklch(0.14_0.01_25)] text-white p-4 flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider opacity-60">Ananya Sharma · CSE Y3</div>
                  <div className="text-sm font-semibold mt-0.5">Wallet ₹120 · Auto-pay ON</div>
                </div>
                <button className="rounded-lg bg-[var(--color-primary-light)] px-3 py-2 text-xs font-semibold">Confirm Borrow</button>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 hidden sm:flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold shadow-[var(--shadow-card)]">
              <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
              RFID scanner connected
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Everything a college library needs.</h2>
            <p className="mt-3 text-muted-foreground">From the front desk to the shelves to month-end fine collection — Book Nest covers the full loop.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: ScanLine, title: "RFID Authentication", body: "Tap a card, log in. Zero passwords, zero queues, zero fraud." },
              { icon: QrCode, title: "QR Borrow & Return", body: "Each copy has a unique QR. Camera-scan to borrow or return in under 5 seconds." },
              { icon: Receipt, title: "Wallet-based Fines", body: "₹1/day overdue, ₹30 monthly subscription. Auto-deducted from student wallets." },
              { icon: Users, title: "Department-aware", body: "CSE, AIDS, ECE, EEE, Mech, Civil — analytics and limits scoped per dept." },
              { icon: BookOpen, title: "Shelf-precise Locations", body: "Books indexed by Section A–E, row, and position. Find any title in seconds." },
              { icon: ShieldCheck, title: "Audit-grade Logs", body: "Every borrow, return, fine, payment — timestamped and tied to the actor." },
              { icon: Sparkles, title: "Smart Analytics", body: "Monthly borrow trends, top books, overdue patterns by department." },
              { icon: Receipt, title: "Auto Notifications", body: "Due reminders, overdue alerts, low-balance warnings — in-app and email." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-border bg-background p-5">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-[color-mix(in_oklch,var(--color-primary)_12%,transparent)] text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 font-bold">{title}</div>
                <div className="mt-1 text-sm text-muted-foreground leading-relaxed">{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { n: "01", t: "Student taps RFID", d: "Card scan opens their session — profile, wallet, and active borrows load instantly." },
            { n: "02", t: "Scan the book QR", d: "Camera reads the QR sticker. Book details and shelf location appear with a single tap to confirm." },
            { n: "03", t: "Auto fine + return", d: "On return, days_overdue × ₹1 is deducted from the wallet. No manual ledger, no disputes." },
          ].map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-border bg-card p-6">
              <div className="text-5xl font-extrabold text-[color-mix(in_oklch,var(--color-primary)_18%,transparent)]">{s.n}</div>
              <div className="mt-3 text-lg font-bold">{s.t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="roles" className="bg-[oklch(0.14_0.01_25)] text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Built for two kinds of users.</h2>
            <p className="mt-3 text-white/70 max-w-md">A focused kiosk for students and a powerful dashboard for librarians — same data, same source of truth.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link to="/admin" className="rounded-2xl bg-[var(--color-primary)] p-6 hover:bg-[var(--color-primary-light)] transition-colors">
              <div className="text-xs uppercase tracking-wider opacity-80">Librarian</div>
              <div className="mt-2 text-2xl font-bold">Admin Console</div>
              <div className="mt-2 text-sm opacity-80">Books CRUD, students, fines, analytics, QR printing.</div>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">Open <ArrowRight className="h-4 w-4" /></div>
            </Link>
            <Link to="/rfid" className="rounded-2xl border border-white/15 bg-white/5 p-6 hover:bg-white/10">
              <div className="text-xs uppercase tracking-wider opacity-80">Student</div>
              <div className="mt-2 text-2xl font-bold">Kiosk</div>
              <div className="mt-2 text-sm opacity-80">Tap card, scan QR, borrow or return — under 10 seconds.</div>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">Launch <ArrowRight className="h-4 w-4" /></div>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} Book Nest · Smart Library Management · College Edition</div>
        </div>
      </footer>
    </div>
  );
}
