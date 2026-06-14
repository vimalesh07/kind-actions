import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { AdminShell, StatusPill } from "@/components/booknest/AdminShell";
import { findBook, findStudent, transactions } from "@/lib/booknest/data";

export const Route = createFileRoute("/admin/transactions")({
  head: () => ({ meta: [{ title: "Transactions · Book Nest Admin" }] }),
  component: TxnPage,
});

function TxnPage() {
  return (
    <AdminShell
      title="Transactions"
      subtitle={`${transactions.length} records · ${transactions.filter(t => t.status === "overdue").length} overdue`}
      actions={
        <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      }
    >
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Txn</th>
              <th className="text-left px-4 py-3 font-semibold">Student</th>
              <th className="text-left px-4 py-3 font-semibold">Book</th>
              <th className="text-left px-4 py-3 font-semibold">Borrowed</th>
              <th className="text-left px-4 py-3 font-semibold">Due</th>
              <th className="text-left px-4 py-3 font-semibold">Returned</th>
              <th className="text-left px-4 py-3 font-semibold">Fine</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, i) => {
              const s = findStudent(t.studentId);
              const b = findBook(t.bookId);
              return (
                <tr key={t.id} className={i % 2 ? "bg-[color-mix(in_oklch,var(--color-primary)_3%,var(--color-card))]" : ""}>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{t.id.toUpperCase()}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{s?.name}</div>
                    <div className="text-xs text-muted-foreground">{s?.studentCode}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{b?.title}</div>
                    <div className="text-xs text-muted-foreground">{b?.author}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{t.borrowDate}</td>
                  <td className="px-4 py-3 text-xs">{t.dueDate}</td>
                  <td className="px-4 py-3 text-xs">{t.returnDate ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold">
                    {t.fineAmount > 0 ? (
                      <span className="text-destructive">₹{t.fineAmount}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
