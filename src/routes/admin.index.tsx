import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, BookPlus, ScanLine, UserPlus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminShell, StatusPill } from "@/components/booknest/AdminShell";
import { books, deptBorrows, findBook, findStudent, monthlyBorrows, stats, transactions } from "@/lib/booknest/data";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard · Book Nest" }] }),
  component: Dashboard,
});

function StatCard({ label, value, hint, tone = "default" }: { label: string; value: string | number; hint?: string; tone?: "default" | "primary" | "warn" }) {
  const toneStyles: Record<string, string> = {
    default: "bg-card",
    primary: "bg-primary text-primary-foreground border-transparent",
    warn: "bg-[color-mix(in_oklch,var(--color-destructive)_10%,var(--color-card))]",
  };
  return (
    <div className={`rounded-xl border border-border p-5 ${toneStyles[tone]}`}>
      <div className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs opacity-70">{hint}</div>}
    </div>
  );
}

function Dashboard() {
  const s = stats();
  const recent = transactions.slice(0, 6);

  return (
    <AdminShell title="Dashboard" subtitle="At-a-glance health of the library">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Books" value={s.totalBooks} hint={`${books.length} unique titles`} />
        <StatCard label="Available" value={s.available} tone="primary" />
        <StatCard label="Borrowed" value={s.borrowed} />
        <StatCard label="Overdue" value={s.overdue} tone="warn" hint="Action required" />
        <StatCard label="Students" value={s.students} />
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">Monthly borrows</div>
              <div className="text-xs text-muted-foreground">Last 6 months</div>
            </div>
            <span className="text-xs font-semibold text-primary">+24% vs prev</span>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <LineChart data={monthlyBorrows} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="borrows" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--color-primary)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm font-bold">Quick actions</div>
          <div className="mt-4 space-y-2">
            <Link to="/admin/books" className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold hover:bg-accent">
              <BookPlus className="h-4 w-4 text-primary" /> Add a book
            </Link>
            <Link to="/admin/students" className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold hover:bg-accent">
              <UserPlus className="h-4 w-4 text-primary" /> Register student
            </Link>
            <Link to="/rfid" className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold hover:bg-accent">
              <ScanLine className="h-4 w-4 text-primary" /> Launch kiosk
            </Link>
            <Link to="/admin/transactions" className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold hover:bg-accent">
              <ArrowUpRight className="h-4 w-4 text-primary" /> View overdue
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="text-sm font-bold">Borrows by department</div>
          <div className="mt-4 h-56">
            <ResponsiveContainer>
              <BarChart data={deptBorrows} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="dept" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="borrows" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm font-bold">Recent activity</div>
          <div className="mt-3 divide-y divide-border">
            {recent.map((t) => {
              const b = findBook(t.bookId);
              const st = findStudent(t.studentId);
              return (
                <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{b?.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{st?.name} · {st?.department}</div>
                  </div>
                  <StatusPill status={t.status} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
