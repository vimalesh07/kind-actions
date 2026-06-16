import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, StatusBadge, UserShell } from "@/components/booknest/PrototypeShell";
import { getUserDashboard } from "@/lib/booknest/db.functions";
import type { UserDashboard } from "@/lib/booknest/data";

export const Route = createFileRoute("/payments")({
  validateSearch: (search: Record<string, unknown>) => ({ userId: String(search.userId ?? "") }),
  head: () => ({ meta: [{ title: "Payments - Book Nest" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { userId } = Route.useSearch();
  const [dashboard, setDashboard] = useState<UserDashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setError("User not found. Please sign in again.");
      return;
    }
    getUserDashboard({ data: { userId } })
      .then(setDashboard)
      .catch((caught) => setError(readError(caught)));
  }, [userId]);

  const pendingFine =
    dashboard?.fines
      .filter((fine) => fine.status === "Pending")
      .reduce((sum, fine) => sum + fine.amount, 0) ?? 0;

  return (
    <UserShell
      title="Payment history"
      subtitle="Paid fines, pending fines, and monthly library fee records."
      userId={userId}
    >
      {error && <Card className="mb-5 text-destructive">{error}</Card>}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <div className="text-sm font-medium text-muted-foreground">Pending fine</div>
          <div className="mt-2 text-3xl font-bold">Rs. {pendingFine}</div>
        </Card>
        <Card>
          <div className="text-sm font-medium text-muted-foreground">Monthly library fee</div>
          <div className="mt-2 text-3xl font-bold">Tracked in DB</div>
        </Card>
        <Card>
          <div className="text-sm font-medium text-muted-foreground">Records</div>
          <div className="mt-2 text-3xl font-bold">{dashboard?.payments.length ?? 0}</div>
        </Card>
      </div>

      <Card className="mt-5">
        {!dashboard ? (
          <div className="text-sm text-muted-foreground">Loading payments...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.payments.map((payment) => (
                <tr key={payment.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{payment.label}</td>
                  <td className="px-4 py-3">Rs. {payment.amount}</td>
                  <td className="px-4 py-3">{payment.date}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={payment.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </UserShell>
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
