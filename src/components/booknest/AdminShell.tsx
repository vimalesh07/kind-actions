import { Link, useRouterState, type LinkProps } from "@tanstack/react-router";
import { Bell, BookOpen, Coins, LayoutDashboard, QrCode, Receipt, Settings, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "./Logo";

type NavItem = { to: LinkProps["to"]; label: string; icon: typeof BookOpen };

const nav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/books", label: "Books", icon: BookOpen },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/transactions", label: "Transactions", icon: Receipt },
  { to: "/admin/fines", label: "Fines & Payments", icon: Coins },
  { to: "/rfid", label: "Kiosk Mode", icon: QrCode },
];

export function AdminShell({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  const pathname = useRouterState({ select: s => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <Logo variant="dark" />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = to === "/admin" ? pathname === "/admin" : pathname.startsWith(to as string);
            return (
              <Link
                key={to}
                to={to}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                style={
                  active
                    ? { background: "var(--color-sidebar-active)", color: "white" }
                    : { color: "color-mix(in oklch, var(--color-sidebar-foreground) 75%, transparent)" }
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-sidebar-border">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-border">
            <Settings className="h-4 w-4" /> Settings
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-card/80 px-6 py-4 backdrop-blur">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <button className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-card hover:bg-accent">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-[var(--color-gold)] px-1 text-[10px] font-bold text-black grid place-items-center">3</span>
            </button>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">A</div>
          </div>
        </header>
        <div className="px-6 py-6 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}

export function StatusPill({ status }: { status: "available" | "borrowed" | "overdue" | "pending" | "returned" }) {
  const map: Record<string, { cls: string; label: string }> = {
    available: { cls: "bn-status-available", label: "Available" },
    borrowed: { cls: "bn-status-borrowed", label: "Borrowed" },
    overdue: { cls: "bn-status-overdue", label: "Overdue" },
    pending: { cls: "bn-status-pending", label: "Pending" },
    returned: { cls: "bn-status-available", label: "Returned" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  );
}
