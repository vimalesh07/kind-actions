import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminPrototypeShell, Card, StatusBadge } from "@/components/booknest/PrototypeShell";
import { getTransactions } from "@/lib/booknest/db.functions";
import type { Transaction } from "@/lib/booknest/data";

export const Route = createFileRoute("/admin/transactions")({
  head: () => ({ meta: [{ title: "Transactions - Book Nest Admin" }] }),
  component: AdminTransactionsPage,
});

function AdminTransactionsPage() {
  const [filter, setFilter] = useState("All");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getTransactions()
      .then(setTransactions)
      .catch((caught) => setError(readError(caught)));
  }, []);

  const filtered = transactions.filter((txn) => filter === "All" || txn.status === filter);

  return (
    <AdminPrototypeShell
      title="Transactions"
      subtitle="Borrow and return records saved in PostgreSQL."
    >
      {error && <Card className="mb-5 text-destructive">{error}</Card>}
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          {["All", "Borrowed", "Returned", "Overdue"].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${filter === item ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">RFID UID</th>
                <th className="px-4 py-3">Scan date/time</th>
                <th className="px-4 py-3">Due date</th>
                <th className="px-4 py-3">Return date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((txn) => (
                <tr key={txn.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{txn.studentName}</div>
                    <div className="text-xs text-muted-foreground">{txn.studentEmail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{txn.bookTitle}</div>
                    <div className="font-mono text-xs text-muted-foreground">{txn.bookId}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{txn.rfidId}</td>
                  <td className="px-4 py-3">{txn.scanDateTime}</td>
                  <td className="px-4 py-3">{txn.dueDate ?? "-"}</td>
                  <td className="px-4 py-3">{txn.returnDate ?? "-"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={txn.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminPrototypeShell>
  );
}

function readError(error: unknown) {
  try {
    return (
      (JSON.parse((error as Error).message) as { message?: string }).message ?? "Request failed."
    );
  } catch {
    return (error as Error).message || "Request failed.";
  }
}
