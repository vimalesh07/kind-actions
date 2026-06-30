import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, Edit3, Lock, QrCode, UserRound } from "lucide-react";
import { Card, UserShell } from "@/components/booknest/PrototypeShell";
import {
  cancelRfidScanSession,
  getRfidScanStatus,
  getUserDashboard,
  startRfidScanSession,
  updateUserProfile,
} from "@/lib/booknest/db.functions";
import { departments, type Department, type UserDashboard, type UserProfile } from "@/lib/booknest/data";

export const Route = createFileRoute("/profile")({
  validateSearch: (search: Record<string, unknown>) => ({ userId: String(search.userId ?? "") }),
  head: () => ({ meta: [{ title: "Profile - Book Nest" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { userId } = Route.useSearch();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<UserDashboard | null>(null);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [success, setSuccess] = useState("");
  const [rfidSessionId, setRfidSessionId] = useState("");
  const [rfidStatus, setRfidStatus] = useState("");
  const [isStartingRfid, setIsStartingRfid] = useState(false);

  const refresh = useCallback(() => {
    if (!userId) {
      setError("User not found. Please sign in again.");
      return;
    }
    getUserDashboard({ data: { userId } })
      .then(setDashboard)
      .catch((caught) => setError(readError(caught)));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!rfidSessionId || !userId) return;

    let stopped = false;
    const interval = window.setInterval(() => {
      getRfidScanStatus({ data: { sessionId: rfidSessionId, userId } })
        .then(async (result) => {
          if (stopped) return;
          setRfidStatus(result.message);
          if (result.status === "verified" && result.openBookScanner) {
            window.clearInterval(interval);
            setRfidStatus("RFID verified. Opening book scanner...");
            await navigate({ to: "/book-scan", search: { userId } });
          }
          if (result.status === "failed" || result.status === "expired") {
            window.clearInterval(interval);
            setRfidSessionId("");
          }
        })
        .catch((caught) => {
          if (stopped) return;
          window.clearInterval(interval);
          setRfidStatus(readError(caught));
          setRfidSessionId("");
        });
    }, 1000);

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [navigate, rfidSessionId, userId]);

  const startRfidScan = async () => {
    if (!userId) {
      setError("User not found. Please sign in again.");
      return;
    }

    setIsStartingRfid(true);
    setRfidStatus("");
    try {
      const session = await startRfidScanSession({ data: { userId } });
      setRfidSessionId(session.sessionId);
      setRfidStatus(session.message);
    } catch (caught) {
      setRfidStatus(readError(caught));
    } finally {
      setIsStartingRfid(false);
    }
  };

  const cancelRfidScan = async () => {
    if (!rfidSessionId || !userId) return;

    try {
      const result = await cancelRfidScanSession({ data: { sessionId: rfidSessionId, userId } });
      setRfidStatus(result.message);
    } catch (caught) {
      setRfidStatus(readError(caught));
    } finally {
      setRfidSessionId("");
    }
  };

  if (error) {
    return (
      <UserShell title="Profile" userId={userId}>
        <Card className="text-destructive">{error}</Card>
      </UserShell>
    );
  }

  if (!dashboard) {
    return (
      <UserShell title="Profile" userId={userId}>
        <Card>Loading profile...</Card>
      </UserShell>
    );
  }

  const fineTotal = dashboard.fines
    .filter((fine) => fine.status === "Pending")
    .reduce((sum, fine) => sum + fine.amount, 0);
  const paidTotal = dashboard.payments
    .filter((payment) => payment.status === "Paid")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const pendingPaymentTotal = dashboard.payments
    .filter((payment) => payment.status === "Pending")
    .reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <UserShell
      title="Profile"
      subtitle="Student profile linked with a unique RFID UID."
      userId={userId}
    >
      {success && (
        <Card className="mb-5 border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        </Card>
      )}

      {rfidStatus && (
        <Card className="mb-5 border-primary/30 bg-primary/10 text-sm font-semibold">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" />
              {rfidStatus}
            </div>
            {rfidSessionId && (
              <button
                type="button"
                onClick={cancelRfidScan}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-accent"
              >
                Cancel
              </button>
            )}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
              {dashboard.user.photoInitials}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{dashboard.user.fullName}</h2>
              <p className="text-sm text-muted-foreground">{dashboard.user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startRfidScan}
              disabled={isStartingRfid || Boolean(rfidSessionId)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
            >
              <QrCode className="h-4 w-4" />
              {isStartingRfid ? "Starting..." : "Start RFID Scan"}
            </button>
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-accent"
            >
              <Edit3 className="h-4 w-4" />
              Edit Profile
            </button>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Register number", dashboard.user.registerNumber],
            ["Department", dashboard.user.department],
            ["RFID UID", dashboard.user.rfidId ?? "Not assigned"],
            ["Fine status", `Rs. ${fineTotal}`],
            ["Current borrowed books", String(dashboard.borrowedBooks.length)],
            ["Payments paid", `Rs. ${paidTotal}`],
            ["Payments pending", `Rs. ${pendingPaymentTotal}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-muted p-4">
              <dt className="text-xs font-bold uppercase text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="mt-5">
        <h2 className="text-lg font-bold">Books borrowed</h2>
        <div className="mt-4 grid gap-2">
          {dashboard.borrowedBooks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No borrowed books.
            </div>
          ) : (
            dashboard.borrowedBooks.map((book) => (
              <div key={book.bookId} className="rounded-lg border border-border p-3">
                <div className="font-semibold">{book.title}</div>
                <div className="text-sm text-muted-foreground">
                  Due {book.dueDate} - Fine Rs. {book.fineAmount}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Payment history summary</h2>
          <div className="text-sm font-semibold text-muted-foreground">
            {dashboard.payments.length} records
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Summary label="Paid amount" value={`Rs. ${paidTotal}`} />
          <Summary label="Pending amount" value={`Rs. ${pendingPaymentTotal}`} />
          <Summary label="Pending fines" value={`Rs. ${fineTotal}`} />
        </div>
      </Card>

      {editOpen && (
        <EditProfileDialog
          dashboard={dashboard}
          onClose={() => setEditOpen(false)}
          onSaved={(user) => {
            setDashboard((current) => (current ? { ...current, user } : current));
            setSuccess("Profile updated successfully.");
            setEditOpen(false);
            window.setTimeout(() => setSuccess(""), 3500);
          }}
        />
      )}
    </UserShell>
  );
}

function EditProfileDialog({
  dashboard,
  onClose,
  onSaved,
}: {
  dashboard: UserDashboard;
  onClose: () => void;
  onSaved: (user: UserProfile) => void;
}) {
  const [form, setForm] = useState({
    fullName: dashboard.user.fullName,
    registerNumber: dashboard.user.registerNumber,
    department: dashboard.user.department,
    photoInitials: dashboard.user.photoInitials,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.fullName.trim()) nextErrors.fullName = "Full name is required.";
    if (!form.registerNumber.trim()) nextErrors.registerNumber = "Register number is required.";
    if (!form.department) nextErrors.department = "Department is required.";
    if (!form.photoInitials.trim()) nextErrors.photoInitials = "Avatar initials are required.";

    setErrors(nextErrors);
    setSubmitError("");
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);

    try {
      const user = await updateUserProfile({
        data: {
          userId: dashboard.user.id,
          fullName: form.fullName,
          registerNumber: form.registerNumber,
          department: form.department,
          photoInitials: form.photoInitials,
        },
      });
      onSaved(user);
    } catch (caught) {
      setSubmitError(readError(caught));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card p-6 shadow-elevated"
      >
        <h2 className="text-xl font-bold">Edit Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your student details. Email and RFID UID stay locked to protect identity records.
        </p>

        {submitError && (
          <div className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            {submitError}
          </div>
        )}

        <div className="mt-5 flex items-center gap-4 rounded-lg border border-border bg-muted/50 p-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            {form.photoInitials || <UserRound className="h-6 w-6" />}
          </div>
          <Field label="Profile photo/avatar placeholder" error={errors.photoInitials}>
            <input
              value={form.photoInitials}
              maxLength={4}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  photoInitials: event.target.value.toUpperCase(),
                }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2 uppercase"
              placeholder="AS"
            />
          </Field>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Full name" error={errors.fullName}>
            <input
              value={form.fullName}
              onChange={(event) =>
                setForm((current) => ({ ...current, fullName: event.target.value }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
          </Field>
          <LockedField label="Email" value={dashboard.user.email} />
          <Field label="Register number" error={errors.registerNumber}>
            <input
              value={form.registerNumber}
              onChange={(event) =>
                setForm((current) => ({ ...current, registerNumber: event.target.value }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
          </Field>
          <Field label="Department" error={errors.department}>
            <select
              value={form.department}
              onChange={(event) =>
                setForm((current) => ({ ...current, department: event.target.value as Department }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2"
            >
              {departments.map((department) => (
                <option key={department}>{department}</option>
              ))}
            </select>
          </Field>
          <LockedField
            label="RFID UID"
            value={dashboard.user.rfidId ?? "Not assigned"}
            helper="RFID ID is assigned by admin and cannot be changed."
            mono
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            disabled={isSaving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      {children}
      {error && <span className="text-xs font-semibold text-destructive">{error}</span>}
    </label>
  );
}

function LockedField({
  label,
  value,
  helper,
  mono,
}: {
  label: string;
  value: string;
  helper?: string;
  mono?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <span className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-muted-foreground">
        <Lock className="h-4 w-4" />
        <span className={mono ? "font-mono" : ""}>{value}</span>
      </span>
      {helper && <span className="text-xs font-medium text-muted-foreground">{helper}</span>}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-4">
      <div className="text-xs font-bold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
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
