import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AdminPrototypeShell,
  Card,
  StatCard,
  StatusBadge,
} from "@/components/booknest/PrototypeShell";
import { getFines, getPayments, getUsers, markPaymentPaid } from "@/lib/booknest/db.functions";
import type { Fine, Payment, UserProfile } from "@/lib/booknest/data";

type AdminUser = UserProfile & { fineTotal: number };

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Payments - Book Nest Admin" }] }),
  component: AdminPaymentsPage,
});

function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");

  const refresh = () =>
    Promise.all([getPayments({ data: {} }), getFines({ data: {} }), getUsers()])
      .then(([paymentData, fineData, userData]) => {
        setPayments(paymentData);
        setFines(fineData);
        setUsers(userData as AdminUser[]);
      })
      .catch((caught) => setError(readError(caught)));

  useEffect(() => {
    void refresh();
  }, []);

  const collected = payments
    .filter((payment) => payment.status === "Paid")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const pending = fines
    .filter((fine) => fine.status === "Pending")
    .reduce((sum, fine) => sum + fine.amount, 0);

  return (
    <AdminPrototypeShell
      title="Payments"
      subtitle="Payment and fine records loaded from PostgreSQL."
    >
      {error && <Card className="mb-5 text-destructive">{error}</Card>}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Fine collected" value={`Rs. ${collected}`} />
        <StatCard label="Pending amount" value={`Rs. ${pending}`} />
        <StatCard label="Payment records" value={payments.length} />
      </div>

      <Card className="mt-5">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const student = users.find((item) => item.id === payment.userId);
                return (
                  <tr key={payment.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{student?.fullName ?? payment.userId}</div>
                      <div className="text-xs text-muted-foreground">{student?.registerNumber}</div>
                    </td>
                    <td className="px-4 py-3">{payment.label}</td>
                    <td className="px-4 py-3">Rs. {payment.amount}</td>
                    <td className="px-4 py-3">{payment.date}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={payment.status === "Paid"}
                        onClick={async () => {
                          await markPaymentPaid({ data: { paymentId: payment.id } });
                          await refresh();
                        }}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-accent disabled:opacity-50"
                      >
                        Mark paid
                      </button>
                    </td>
                  </tr>
                );
              })}
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
