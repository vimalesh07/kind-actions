import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, QrCode } from "lucide-react";
import { Card, UserShell } from "@/components/booknest/PrototypeShell";
import { getBookScanAccess } from "@/lib/booknest/db.functions";
import type { UserProfile } from "@/lib/booknest/data";

export const Route = createFileRoute("/book-scan")({
  validateSearch: (search: Record<string, unknown>) => ({ userId: String(search.userId ?? "") }),
  head: () => ({ meta: [{ title: "Book Scan - Book Nest" }] }),
  component: BookScanPage,
});

function BookScanPage() {
  const { userId } = Route.useSearch();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [normalizedUid, setNormalizedUid] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!userId) {
      setError("Please verify RFID first.");
      return;
    }

    getBookScanAccess({ data: { userId } })
      .then((result) => {
        setUser(result.user);
        setNormalizedUid(result.session.normalizedUid ?? "");
      })
      .catch((caught) => setError(readError(caught)));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <UserShell title="Book Scan" userId={userId}>
        <Card>
          <div className="text-sm font-semibold text-destructive">{error}</div>
          <Link
            to="/profile"
            search={{ userId }}
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Back to Profile
          </Link>
        </Card>
      </UserShell>
    );
  }

  if (!user) {
    return (
      <UserShell title="Book Scan" userId={userId}>
        <Card>Checking RFID verification...</Card>
      </UserShell>
    );
  }

  return (
    <UserShell title="Book Scan" subtitle="RFID verified. Continue with book QR scanning." userId={userId}>
      <Card className="border-primary/30 bg-primary/10">
        <div className="flex items-center gap-2 text-sm font-bold text-primary">
          <CheckCircle2 className="h-5 w-5" />
          RFID verified
        </div>
      </Card>

      <Card className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{user.fullName}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="rounded-lg bg-muted px-4 py-3 font-mono text-sm font-bold">
            {normalizedUid || user.rfidId || "RFID verified"}
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <Info label="Register number" value={user.registerNumber} />
          <Info label="Department" value={user.department} />
          <Info label="RFID UID" value={user.rfidId ?? normalizedUid} />
        </dl>
      </Card>

      <Card className="mt-5">
        <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-muted/40 p-8 text-center">
          <div>
            <QrCode className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-4 text-xl font-bold">Scan book QR code now.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              QR scanner integration will continue from this verified RFID portal.
            </p>
          </div>
        </div>
      </Card>
    </UserShell>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg bg-muted p-4">
      <div className="text-xs font-bold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value || "Not assigned"}</div>
    </div>
  );
}

function readError(error: unknown) {
  try {
    const parsed = JSON.parse((error as Error).message) as { message?: string };
    return parsed.message ?? "Request failed.";
  } catch {
    return (error as Error).message || "Request failed.";
  }
}
