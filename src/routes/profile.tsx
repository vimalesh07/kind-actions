import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Card, UserShell } from "@/components/booknest/PrototypeShell";
import { getUserDashboard, updateUserProfile } from "@/lib/booknest/db.functions";
import { departments, type Department, type UserDashboard } from "@/lib/booknest/data";

export const Route = createFileRoute("/profile")({
  validateSearch: (search: Record<string, unknown>) => ({ userId: String(search.userId ?? "") }),
  head: () => ({ meta: [{ title: "Profile - Book Nest" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { userId } = Route.useSearch();
  const [dashboard, setDashboard] = useState<UserDashboard | null>(null);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);

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

  return (
    <UserShell
      title="Profile"
      subtitle="Student profile linked with a unique RFID UID."
      userId={userId}
    >
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
          <button
            onClick={() => setEditOpen(true)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-accent"
          >
            Edit profile
          </button>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Register number", dashboard.user.registerNumber],
            ["Department", dashboard.user.department],
            ["RFID UID", dashboard.user.rfidId ?? "Not assigned"],
            ["Fine status", `Rs. ${fineTotal}`],
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

      {editOpen && (
        <EditProfileDialog
          dashboard={dashboard}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            refresh();
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
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    fullName: dashboard.user.fullName,
    email: dashboard.user.email,
    registerNumber: dashboard.user.registerNumber,
    department: dashboard.user.department,
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      await updateUserProfile({
        data: {
          userId: dashboard.user.id,
          fullName: form.fullName,
          email: form.email,
          registerNumber: form.registerNumber,
          department: form.department,
        },
      });
      onSaved();
    } catch (caught) {
      setError(readError(caught));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <form onSubmit={submit} className="w-full max-w-xl rounded-lg bg-card p-6 shadow-elevated">
        <h2 className="text-xl font-bold">Edit profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your PostgreSQL student profile.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            {error}
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input
              required
              value={form.fullName}
              onChange={(event) =>
                setForm((current) => ({ ...current, fullName: event.target.value }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
          </Field>
          <Field label="Email">
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
          </Field>
          <Field label="Register number">
            <input
              required
              value={form.registerNumber}
              onChange={(event) =>
                setForm((current) => ({ ...current, registerNumber: event.target.value }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
          </Field>
          <Field label="Department">
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
            {isSaving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      {children}
    </label>
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
