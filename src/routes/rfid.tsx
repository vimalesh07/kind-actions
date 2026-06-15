import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ScanLine } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/booknest/Logo";
import { students } from "@/lib/booknest/data";

export const Route = createFileRoute("/rfid")({
  head: () => ({ meta: [{ title: "Kiosk · Book Nest" }] }),
  component: Kiosk,
});

function Kiosk() {
  const [scanned, setScanned] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1200);
    return () => clearInterval(id);
  }, []);

  const student = scanned ? students.find((s) => s.id === scanned) : null;

  return (
    <div className="min-h-screen bg-[oklch(0.08_0.005_25)] text-white relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, var(--color-primary) 0, transparent 45%), radial-gradient(circle at 80% 80%, var(--color-primary-light) 0, transparent 40%)",
        }}
      />
      <header className="relative px-6 py-5 flex items-center justify-between">
        <Logo variant="dark" />
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Exit kiosk
        </Link>
      </header>

      <div className="relative max-w-5xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-10 items-center min-h-[70vh]">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">Step 1 of 2</div>
          <h1 className="mt-4 text-5xl font-extrabold tracking-tight leading-[1.05]">
            Scan your<br />RFID card.
          </h1>
          <p className="mt-4 text-white/60 max-w-md">Hold your college ID near the reader. Your profile, wallet, and active borrows will load instantly.</p>

          <div className="mt-10 flex flex-wrap gap-2">
            {students.slice(0, 4).map((s) => (
              <button
                key={s.id}
                onClick={() => setScanned(s.id)}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold hover:bg-white/10"
              >
                Simulate · {s.name.split(" ")[0]}
              </button>
            ))}
            {scanned && (
              <button onClick={() => setScanned(null)} className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold">
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="relative grid place-items-center">
          {!student ? (
            <div className="relative grid place-items-center">
              <div
                className="absolute h-72 w-72 rounded-full border border-[var(--color-primary)]/40"
                style={{ transform: `scale(${1 + (tick % 3) * 0.08})`, opacity: 1 - (tick % 3) * 0.3, transition: "all 1.2s ease-out" }}
              />
              <div
                className="absolute h-56 w-56 rounded-full border border-[var(--color-primary)]/60"
                style={{ transform: `scale(${1 + ((tick + 1) % 3) * 0.08})`, opacity: 1 - ((tick + 1) % 3) * 0.3, transition: "all 1.2s ease-out" }}
              />
              <div className="relative grid h-44 w-44 place-items-center rounded-full bg-[var(--color-primary)] shadow-[0_0_60px_var(--color-primary)]">
                <ScanLine className="h-16 w-16 text-white" />
              </div>
            </div>
          ) : (
            <div className="w-full max-w-sm rounded-2xl bg-white text-[oklch(0.18_0.01_25)] p-6 shadow-[0_30px_80px_oklch(0_0_0/0.4)]">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                  {student.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary">Welcome back</div>
                  <div className="text-xl font-bold leading-tight">{student.name}</div>
                  <div className="text-xs text-muted-foreground">{student.studentCode} · {student.department} · Y{student.year}</div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md bg-muted px-2 py-2"><div className="text-muted-foreground">Wallet</div><div className="font-bold text-base">₹{student.walletBalance}</div></div>
                <div className="rounded-md bg-muted px-2 py-2"><div className="text-muted-foreground">Borrowed</div><div className="font-bold text-base">2</div></div>
                <div className="rounded-md bg-muted px-2 py-2"><div className="text-muted-foreground">Auto-pay</div><div className="font-bold text-base">{student.autoPay ? "ON" : "OFF"}</div></div>
              </div>
              <div className="mt-5 grid gap-2">
                <button className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-[var(--color-primary-dark)]">
                  Continue → Scan book QR
                </button>
                <Link to="/user" className="w-full rounded-lg border border-border py-3 text-center text-sm font-semibold hover:bg-accent">
                  Generate bill and pay
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
