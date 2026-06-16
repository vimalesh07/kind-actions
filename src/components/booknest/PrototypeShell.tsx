import { Link, useNavigate, useRouterState, type LinkProps } from "@tanstack/react-router";
import { BookOpen, CreditCard, Home, LogOut, QrCode, Receipt, User, Users } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Logo } from "./Logo";

type NavItem = { to: LinkProps["to"]; label: string; icon: typeof Home };

const userNav: NavItem[] = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/scanner", label: "RFID Scan", icon: QrCode },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/payments", label: "Payments", icon: CreditCard },
];

const adminNav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: Home },
  { to: "/admin/books", label: "Books", icon: BookOpen },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/transactions", label: "Transactions", icon: Receipt },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
];

export function UserShell({
  title,
  subtitle,
  children,
  actions,
  userId,
}: ShellProps & { userId?: string }) {
  return (
    <Shell nav={userNav} title={title} subtitle={subtitle} actions={actions} userId={userId}>
      {children}
    </Shell>
  );
}

export function AdminPrototypeShell({ title, subtitle, children, actions }: ShellProps) {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate;
  }, [navigate]);

  return (
    <Shell nav={adminNav} title={title} subtitle={subtitle} actions={actions}>
      {children}
    </Shell>
  );
}

function Shell({
  nav,
  title,
  subtitle,
  children,
  actions,
  userId,
}: ShellProps & { nav: NavItem[]; userId?: string }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Logo />
          <nav className="flex flex-wrap gap-1">
            {nav.map(({ to, label, icon: Icon }) => {
              const active =
                to === "/admin" ? pathname === "/admin" : pathname.startsWith(to as string);
              return (
                <Link
                  key={to}
                  to={to}
                  search={userId ? { userId } : undefined}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-accent"
          >
            <LogOut className="h-4 w-4" />
            Exit
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border bg-card p-5 shadow-card ${className}`}>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Available" || status === "Paid" || status === "Returned" || status === "Verified"
      ? "bn-status-available"
      : status === "Pending"
        ? "bn-status-pending"
        : status === "Overdue"
          ? "bn-status-overdue"
          : "bn-status-borrowed";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>
      {status}
    </span>
  );
}

type ShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
};
