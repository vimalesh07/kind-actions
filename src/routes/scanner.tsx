import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Radio, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { ScannerModal } from "@/components/booknest/ScannerModal";
import { Card, StatusBadge, UserShell } from "@/components/booknest/PrototypeShell";
import { getBooks, getUserDashboard, verifyRfid } from "@/lib/booknest/db.functions";
import type { Book, RfidVerification, UserDashboard } from "@/lib/booknest/data";

export const Route = createFileRoute("/scanner")({
  validateSearch: (search: Record<string, unknown>) => ({ userId: String(search.userId ?? "") }),
  head: () => ({ meta: [{ title: "RFID Scanner - Book Nest" }] }),
  component: ScannerPage,
});

const prototypeRfids = ["RFID-001", "RFID-002", "RFID-003", "RFID-004"];

function ScannerPage() {
  const { userId } = Route.useSearch();
  const [rfidId, setRfidId] = useState("RFID-001");
  const [verified, setVerified] = useState<RfidVerification | null>(null);
  const [dashboard, setDashboard] = useState<UserDashboard | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const refreshBooks = () =>
    getBooks()
      .then(setBooks)
      .catch((caught) => setError(readError(caught)));

  useEffect(() => {
    void refreshBooks();
    if (!userId) return;
    getUserDashboard({ data: { userId } })
      .then((data) => {
        setDashboard(data);
        setRfidId(data.user.rfidId ?? "RFID-001");
      })
      .catch(() => undefined);
  }, [userId]);

  const detect = async (value = rfidId) => {
    setError("");
    setIsChecking(true);
    try {
      const result = await verifyRfid({ data: { rfidId: value } });
      setVerified(result);
      setScannerOpen(true);
    } catch (caught) {
      setVerified(null);
      setError(readError(caught));
    } finally {
      setIsChecking(false);
    }
  };

  const currentUser = verified?.user ?? dashboard?.user;

  return (
    <UserShell
      title="RFID + QR scanner"
      subtitle="Verify the student RFID UID, then scan the book QR to borrow or return."
      userId={currentUser?.id ?? userId}
    >
      {error && <Card className="mb-5 text-destructive">{error}</Card>}

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Radio className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                ESP32 RC522 input
              </div>
              <h2 className="mt-1 text-xl font-bold">RFID reader simulation</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Use these four prototype cards until the ESP32 posts a real UID to the backend.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <label className="grid gap-2 text-sm font-bold">
              RFID UID
              <input
                value={rfidId}
                onChange={(event) => setRfidId(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              {prototypeRfids.map((uid) => (
                <button
                  key={uid}
                  onClick={() => {
                    setRfidId(uid);
                    void detect(uid);
                  }}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-bold hover:bg-accent"
                >
                  {uid}
                </button>
              ))}
            </div>
            <button
              disabled={isChecking}
              onClick={() => void detect()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isChecking ? "Verifying..." : "Detect RFID"}
            </button>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Verified student</h2>
            {verified && <StatusBadge status="Verified" />}
          </div>

          {!verified ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Tap a prototype RFID card to load the matched student profile.
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {verified.user.photoInitials}
                </div>
                <div>
                  <div className="text-xl font-bold">{verified.user.fullName}</div>
                  <div className="text-sm text-muted-foreground">{verified.user.email}</div>
                </div>
              </div>

              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Register number" value={verified.user.registerNumber} />
                <Info label="Department" value={verified.user.department} />
                <Info label="RFID UID" value={verified.user.rfidId ?? ""} mono />
                <Info label="Borrowed books" value={String(verified.borrowedBooks.length)} />
              </dl>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => setScannerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
                >
                  Scan Book QR
                </button>
                <Link
                  to="/home"
                  search={{ userId: verified.user.id }}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-bold hover:bg-accent"
                >
                  Open home
                </Link>
                <button
                  onClick={() => {
                    setVerified(null);
                    setScannerOpen(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-bold hover:bg-accent"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {scannerOpen && verified && (
        <ScannerModal
          user={verified.user}
          books={books}
          onClose={() => setScannerOpen(false)}
          onSaved={() => {
            void refreshBooks();
            void detect(verified.user.rfidId ?? rfidId);
          }}
        />
      )}
    </UserShell>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <dt className="text-xs font-bold uppercase text-muted-foreground">{label}</dt>
      <dd className={`mt-1 font-semibold ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
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
