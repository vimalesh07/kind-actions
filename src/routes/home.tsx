import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, Edit3, QrCode, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, StatusBadge, UserShell } from "@/components/booknest/PrototypeShell";
import { getUserDashboard } from "@/lib/booknest/db.functions";
import type { UserDashboard } from "@/lib/booknest/data";

export const Route = createFileRoute("/home")({
  validateSearch: (search: Record<string, unknown>) => ({ userId: String(search.userId ?? "") }),
  head: () => ({ meta: [{ title: "User Home - Book Nest" }] }),
  component: HomePage,
});

function HomePage() {
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

  if (error) {
    return (
      <UserShell title="User Home" userId={userId}>
        <Card className="text-destructive">{error}</Card>
      </UserShell>
    );
  }

  if (!dashboard) {
    return (
      <UserShell title="User Home" userId={userId}>
        <Card>Loading your library profile...</Card>
      </UserShell>
    );
  }

  const fineTotal = dashboard.fines
    .filter((fine) => fine.status === "Pending")
    .reduce((sum, fine) => sum + fine.amount, 0);

  return (
    <UserShell
      title={`Welcome, ${dashboard.user.fullName}`}
      subtitle="Your RFID profile, borrowed books, and payments are connected here."
      userId={userId}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <div className="mb-4 text-xs font-bold uppercase text-muted-foreground">
            Profile summary
          </div>
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              {dashboard.user.photoInitials}
            </div>
            <div>
              <div className="text-lg font-bold">{dashboard.user.fullName}</div>
              <div className="text-sm text-muted-foreground">{dashboard.user.registerNumber}</div>
            </div>
          </div>
          <dl className="mt-5 grid gap-3 text-sm">
            <Row label="Department" value={dashboard.user.department} />
            <Row label="RFID card ID" value={dashboard.user.rfidId ?? "Not assigned"} mono />
            <Row label="Fine status" value={`Rs. ${fineTotal}`} />
          </dl>
          <div className="mt-5 grid gap-2">
            <Link
              to="/profile"
              search={{ userId }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-[var(--color-primary-dark)]"
            >
              <Edit3 className="h-4 w-4" />
              Edit Profile
            </Link>
            <Link
              to="/scanner"
              search={{ userId, autoStart: "true" }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-bold hover:bg-accent"
            >
              <QrCode className="h-4 w-4" />
              Start RFID Scan
            </Link>
            <Link
              to="/profile"
              search={{ userId }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-bold hover:bg-accent"
            >
              <User className="h-4 w-4" />
              View Profile
            </Link>
            <Link
              to="/payments"
              search={{ userId }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-bold hover:bg-accent"
            >
              <CreditCard className="h-4 w-4" />
              Payment History
            </Link>
          </div>
        </Card>

        <div className="grid gap-5">
          <Card>
            <h2 className="text-lg font-bold">Books currently borrowed</h2>
            {dashboard.borrowedBooks.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                You have not borrowed any books yet.
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Book</th>
                      <th className="px-4 py-3">Due date</th>
                      <th className="px-4 py-3">Fine</th>
                      <th className="px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.borrowedBooks.map((book) => (
                      <tr key={book.bookId} className="border-t border-border">
                        <td className="px-4 py-3 font-semibold">{book.title}</td>
                        <td className="px-4 py-3">{book.dueDate}</td>
                        <td className="px-4 py-3">Rs. {book.fineAmount}</td>
                        <td className="px-4 py-3">
                          <Link
                            to="/books/$id"
                            params={{ id: book.bookId }}
                            search={{ userId }}
                            className="font-bold text-primary"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-bold">Payment history</h2>
            <div className="mt-4 grid gap-2">
              {dashboard.payments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No payment records yet.
                </div>
              ) : (
                dashboard.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <div>
                      <div className="font-semibold">{payment.label}</div>
                      <div className="text-xs text-muted-foreground">{payment.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">Rs. {payment.amount}</div>
                      <StatusBadge status={payment.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </UserShell>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`font-semibold ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
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
