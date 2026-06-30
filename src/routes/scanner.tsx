import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Radio, RefreshCcw, Wifi } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScannerModal } from "@/components/booknest/ScannerModal";
import { Card, StatusBadge, UserShell } from "@/components/booknest/PrototypeShell";
import { getBooks, getUserDashboard, verifyRfid } from "@/lib/booknest/db.functions";
import type { Book, RfidVerification, UserDashboard } from "@/lib/booknest/data";

export const Route = createFileRoute("/scanner")({
  validateSearch: (search: Record<string, unknown>) => ({
    userId: String(search.userId ?? ""),
    autoStart: search.autoStart === "true" || search.autoStart === true,
  }),
  head: () => ({ meta: [{ title: "RFID Scanner - Book Nest" }] }),
  component: ScannerPage,
});

const prototypeRfids = ["RFID-001", "RFID-002", "RFID-003", "RFID-004"];
type RfidStatus = "idle" | "waiting" | "verified" | "failed";
const rfidApiBaseUrl = (import.meta.env.VITE_RFID_API_BASE_URL as string | undefined)?.replace(
  /\/$/,
  "",
);
const rfidScanEndpoint = rfidApiBaseUrl ? `${rfidApiBaseUrl}/api/rfid/scan` : "";
const rfidPingEndpoint = rfidApiBaseUrl ? `${rfidApiBaseUrl}/api/rfid/ping` : "";

function ScannerPage() {
  const { userId, autoStart } = Route.useSearch();
  const [rfidId, setRfidId] = useState("RFID-001");
  const [verified, setVerified] = useState<RfidVerification | null>(null);
  const [dashboard, setDashboard] = useState<UserDashboard | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [rfidStatus, setRfidStatus] = useState<RfidStatus>("idle");
  const [verifiedRFID, setVerifiedRFID] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("RFID scan is idle.");
  const [pingResult, setPingResult] = useState("");
  const [isPinging, setIsPinging] = useState(false);
  const autoStartedRef = useRef(false);

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

  const loadVerifiedUser = useCallback(async () => {
    if (!userId) return;
    const data = await getUserDashboard({ data: { userId } });
    setDashboard(data);
    setVerified({ user: data.user, borrowedBooks: data.borrowedBooks });
    setScannerOpen(true);
  }, [userId]);

  const checkHardwareStatus = useCallback(async () => {
    if (!userId) return;
    const response = await fetch("/api/rfid/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    const result = (await response.json()) as {
      success?: boolean;
      status?: RfidStatus | "idle";
      message?: string;
      rfid_uid?: string | null;
    };

    if (result.status === "verified") {
      setRfidStatus("verified");
      setVerifiedRFID(result.rfid_uid ?? null);
      setStatusMessage(result.message ?? "RFID verified successfully");
      await loadVerifiedUser();
      return;
    }

    if (result.status === "failed") {
      setRfidStatus("failed");
      setVerifiedRFID(result.rfid_uid ?? null);
      setStatusMessage(result.message ?? "Wrong RFID card");
      setScannerOpen(false);
      return;
    }

    setRfidStatus("waiting");
    setStatusMessage(result.message ?? "Waiting for RFID card...");
  }, [loadVerifiedUser, userId]);

  const startHardwareScan = useCallback(async () => {
    if (!userId) {
      setError("User not found. Please sign in again.");
      return;
    }

    setError("");
    setVerified(null);
    setVerifiedRFID(null);
    setScannerOpen(false);
    setRfidStatus("waiting");
    setStatusMessage("Waiting for RFID card...");

    try {
      const response = await fetch("/api/rfid/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const result = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "RFID scan could not start.");
      }
      setStatusMessage(result.message ?? "Waiting for RFID card...");
    } catch (caught) {
      setRfidStatus("failed");
      setStatusMessage(readError(caught));
      setError(readError(caught));
    }
  }, [userId]);

  const testRfidPing = async () => {
    if (!rfidPingEndpoint) {
      setPingResult("RFID API base URL is not configured.");
      return;
    }

    setIsPinging(true);
    setPingResult("");
    try {
      const response = await fetch(rfidPingEndpoint);
      const result = (await response.json()) as { ok?: boolean; message?: string };
      setPingResult(
        response.ok && result.ok
          ? result.message ?? "RFID API reachable"
          : result.message ?? "RFID API ping failed",
      );
    } catch (caught) {
      setPingResult(readError(caught));
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || !dashboard) return;
    autoStartedRef.current = true;
    void startHardwareScan();
  }, [autoStart, dashboard, startHardwareScan]);

  useEffect(() => {
    if (rfidStatus !== "waiting") return undefined;
    const interval = window.setInterval(() => {
      void checkHardwareStatus();
    }, 1500);
    return () => window.clearInterval(interval);
  }, [checkHardwareStatus, rfidStatus]);

  const detect = async (value = rfidId) => {
    setError("");
    setIsChecking(true);
    setScannerOpen(false);
    try {
      const result = await verifyRfid({ data: { rfidId: value } });
      if (userId && result.user.id !== userId) {
        throw new Error("RFID card does not match this profile");
      }
      setVerified(result);
      setVerifiedRFID(result.user.rfidId);
      setRfidStatus("verified");
      setStatusMessage("RFID verified successfully");
      setScannerOpen(true);
    } catch (caught) {
      setVerified(null);
      setScannerOpen(false);
      setRfidStatus("failed");
      setStatusMessage(readError(caught));
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
                ESP8266 RC522 input
              </div>
              <h2 className="mt-1 text-xl font-bold">Hardware RFID verification</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Click start, then tap the card. ESP8266 should POST to the endpoint shown below.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-border bg-muted/50 p-4">
            {rfidScanEndpoint ? (
              <div className="grid gap-3">
                <div>
                  <div className="text-xs font-bold uppercase text-muted-foreground">
                    Current configured RFID API base URL
                  </div>
                  <div className="mt-1 break-all font-mono text-sm font-semibold">
                    {rfidApiBaseUrl}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-muted-foreground">
                    ESP8266 should POST to
                  </div>
                  <div className="mt-1 break-all font-mono text-sm font-semibold">
                    {rfidScanEndpoint}
                  </div>
                </div>
                <div className="rounded-lg bg-background p-3">
                  <div className="text-xs font-bold uppercase text-muted-foreground">
                    Correct ESP8266 SERVER_URL
                  </div>
                  <code className="mt-1 block break-all text-xs font-semibold">
                    const char* SERVER_URL = "{rfidScanEndpoint}";
                  </code>
                </div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Do not use localhost in ESP8266 code. ESP8266 needs your laptop WiFi IPv4
                  address. If WiFi changes, this IP may change.
                </p>
                <button
                  type="button"
                  onClick={() => void testRfidPing()}
                  disabled={isPinging}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-bold hover:bg-accent disabled:opacity-60"
                >
                  {isPinging ? "Testing RFID API..." : "Ping RFID API"}
                </button>
                {pingResult && (
                  <div className="rounded-lg bg-background px-3 py-2 text-sm font-semibold">
                    {pingResult}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm font-semibold text-destructive">
                RFID API base URL is not configured. Add VITE_RFID_API_BASE_URL to .env using
                your laptop IPv4 address.
              </div>
            )}
          </div>

          <div
            className={`mt-5 rounded-lg border p-4 ${
              rfidStatus === "verified"
                ? "border-primary/30 bg-primary/10"
                : rfidStatus === "failed"
                  ? "border-destructive/30 bg-destructive/10"
                  : "border-border bg-muted/50"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase text-muted-foreground">RFID status</div>
                <div className="mt-1 font-bold">{statusMessage}</div>
                {verifiedRFID && <div className="mt-1 font-mono text-xs">{verifiedRFID}</div>}
              </div>
              {rfidStatus === "verified" && <StatusBadge status="Verified" />}
              {rfidStatus === "failed" && <StatusBadge status="Rejected" />}
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <button
              disabled={rfidStatus === "waiting"}
              onClick={() => void startHardwareScan()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              <Wifi className="h-4 w-4" />
              {rfidStatus === "waiting" ? "Waiting for RFID card..." : "Start RFID Scan"}
            </button>
            <label className="grid gap-2 text-sm font-bold">
              Manual RFID UID
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
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-bold hover:bg-accent disabled:opacity-60"
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
              {rfidStatus === "waiting"
                ? "Waiting for RFID card..."
                : "Start RFID scan to verify this profile before opening the book scanner."}
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
                <Info label="RFID UID" value={verifiedRFID ?? verified.user.rfidId ?? ""} mono />
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
