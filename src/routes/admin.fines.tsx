import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/booknest/AdminShell";
import { findBook, findStudent, transactions } from "@/lib/booknest/data";

export const Route = createFileRoute("/admin/fines")({
  head: () => ({ meta: [{ title: "Fines & Payments · Book Nest Admin" }] }),
  component: FinesPage,
});

function FinesPage() {
  const outstanding = transactions.filter((t) => t.fineAmount > 0 && !t.finePaid);
  const collected = transactions.filter((t) => t.finePaid).reduce((n, t) => n + t.fineAmount, 0);
  const pending = outstanding.reduce((n, t) => n + t.fineAmount, 0);

  return (
    <AdminShell title="Fines & Payments" subtitle="Wallet deductions and outstanding balances">
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Collected (this month)</div>
          <div className="mt-2 text-3xl font-extrabold text-[var(--color-success)]">₹{collected}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending</div>
          <div className="mt-2 text-3xl font-extrabold text-destructive">₹{pending}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active subscribers</div>
          <div className="mt-2 text-3xl font-extrabold">₹30<span className="text-base font-bold text-muted-foreground">/mo</span></div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="font-bold text-sm">Outstanding fines</div>
          <div className="text-xs text-muted-foreground">{outstanding.length} items</div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Student</th>
              <th className="text-left px-4 py-3 font-semibold">Book</th>
              <th className="text-left px-4 py-3 font-semibold">Due</th>
              <th className="text-left px-4 py-3 font-semibold">Fine</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {outstanding.map((t, i) => {
              const s = findStudent(t.studentId);
              const b = findBook(t.bookId);
              return (
                <tr key={t.id} className={i % 2 ? "bg-[color-mix(in_oklch,var(--color-primary)_3%,var(--color-card))]" : ""}>
                  <td className="px-4 py-3 font-semibold">{s?.name}</td>
                  <td className="px-4 py-3">{b?.title}</td>
                  <td className="px-4 py-3 text-xs font-mono">{t.dueDate}</td>
                  <td className="px-4 py-3 font-bold text-destructive">₹{t.fineAmount}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent">Waive</button>
                    <button className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-[var(--color-primary-dark)]">Mark paid</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
