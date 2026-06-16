import { createFileRoute } from "@tanstack/react-router";
import { Activity, BookOpen, Clock, Radio } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  AdminPrototypeShell,
  Card,
  StatCard,
  StatusBadge,
} from "@/components/booknest/PrototypeShell";
import { getAdminDashboard } from "@/lib/booknest/db.functions";
import type { AdminDashboard, Transaction } from "@/lib/booknest/data";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard - Book Nest" }] }),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminDashboard()
      .then(setDashboard)
      .catch((caught) => setError(readError(caught)));
  }, []);

  return (
    <AdminPrototypeShell
      title="Admin dashboard"
      subtitle="Live PostgreSQL records for RFID, QR, books, users, and transactions."
    >
      {error && <Card className="mb-5 text-destructive">{error}</Card>}
      {!dashboard ? (
        <Card>Loading dashboard...</Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total books" value={dashboard.totalBooks} />
            <StatCard label="Available" value={dashboard.availableBooks} />
            <StatCard label="Borrowed" value={dashboard.borrowedBooks} />
            <StatCard label="Overdue" value={dashboard.overdueBooks} />
            <StatCard label="Users" value={dashboard.totalUsers} />
            <StatCard label="Transactions" value={dashboard.totalTransactions} />
            <StatCard label="Pending fines" value={`Rs. ${dashboard.pendingFines}`} />
            <StatCard label="Paid amount" value={`Rs. ${dashboard.paidAmount}`} />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <RecentCard icon={Radio} title="Recent RFID scans">
              {dashboard.recentRfidScans.map((scan) => (
                <Row key={scan.id} txn={scan} />
              ))}
            </RecentCard>
            <RecentCard icon={BookOpen} title="Recent book scans">
              {dashboard.recentBookScans.map((scan) => (
                <Row key={scan.id} txn={scan} />
              ))}
            </RecentCard>
            <RecentCard icon={Activity} title="Borrow / return activity">
              {dashboard.recentTransactions.map((txn) => (
                <Row key={txn.id} txn={txn} />
              ))}
            </RecentCard>
          </div>
        </>
      )}
    </AdminPrototypeShell>
  );
}

function RecentCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Clock;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="font-bold">{title}</h2>
      </div>
      <div className="grid gap-2">{children}</div>
    </Card>
  );
}

function Row({ txn }: { txn: Transaction }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div>
        <div className="font-semibold">{txn.bookTitle}</div>
        <div className="text-xs text-muted-foreground">
          {txn.studentName} - {txn.scanDateTime}
        </div>
      </div>
      <StatusBadge status={txn.status} />
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
