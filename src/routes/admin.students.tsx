import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Edit3, Search } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AdminPrototypeShell, Card, StatusBadge } from "@/components/booknest/PrototypeShell";
import { getUsers, updateStudentRfid } from "@/lib/booknest/db.functions";
import type { BorrowedBook, Department, UserProfile } from "@/lib/booknest/data";

type AdminUser = UserProfile & { borrowedBooks: BorrowedBook[]; fineTotal: number };

export const Route = createFileRoute("/admin/students")({
  head: () => ({ meta: [{ title: "Students - Book Nest Admin" }] }),
  component: AdminStudentsPage,
});

function AdminStudentsPage() {
  const [students, setStudents] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingStudent, setEditingStudent] = useState<AdminUser | null>(null);

  const refresh = useCallback(() => {
    getUsers()
      .then((data) => setStudents(data as AdminUser[]))
      .catch((caught) => setError(readError(caught)));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const q = query.toLowerCase();
  const filtered = students.filter(
    (student) =>
      !q ||
      student.fullName.toLowerCase().includes(q) ||
      student.registerNumber.toLowerCase().includes(q) ||
      student.email.toLowerCase().includes(q) ||
      student.department.toLowerCase().includes(q) ||
      (student.rfidId ?? "").toLowerCase().includes(q),
  );

  return (
    <AdminPrototypeShell title="Students" subtitle="Students and RFID UIDs loaded from PostgreSQL.">
      {error && <Card className="mb-5 text-destructive">{error}</Card>}
      {success && (
        <Card className="mb-5 border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        </Card>
      )}
      <Card>
        <div className="relative mb-4 max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, register number, department, or RFID UID"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((student) => (
            <div key={student.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary font-bold text-primary-foreground">
                  {student.photoInitials}
                </div>
                <div>
                  <div className="font-bold">{student.fullName}</div>
                  <div className="text-sm text-muted-foreground">{student.email}</div>
                </div>
              </div>
              <dl className="mt-4 grid gap-2 text-sm">
                <Row label="Register number" value={student.registerNumber} />
                <Row label="Department" value={student.department as Department} />
                <Row label="RFID UID" value={student.rfidId ?? "Not assigned"} mono />
                <Row label="Fine status" value={`Rs. ${student.fineTotal}`} />
              </dl>
              <div className="mt-4">
                <div className="mb-2 text-sm font-bold">Borrowed books</div>
                {student.borrowedBooks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                    No borrowed books.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {student.borrowedBooks.map((book) => (
                      <div key={book.bookId} className="rounded-lg bg-muted p-3 text-sm">
                        <div className="font-semibold">{book.title}</div>
                        <div className="text-muted-foreground">
                          Due {book.dueDate} - Fine Rs. {book.fineAmount}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-between">
                <StatusBadge status={student.fineTotal > 0 ? "Pending" : "Paid"} />
                <button
                  onClick={() => setEditingStudent(student)}
                  className="inline-flex items-center gap-2 text-sm font-bold text-primary"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit RFID UID
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {editingStudent && (
        <EditRfidDialog
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSaved={() => {
            setEditingStudent(null);
            setSuccess("RFID UID updated successfully.");
            window.setTimeout(() => setSuccess(""), 3500);
            refresh();
          }}
        />
      )}
    </AdminPrototypeShell>
  );
}

function EditRfidDialog({
  student,
  onClose,
  onSaved,
}: {
  student: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rfidId, setRfidId] = useState(student.rfidId ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      await updateStudentRfid({ data: { userId: student.id, rfidId } });
      onSaved();
    } catch (caught) {
      setError(readError(caught));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-lg bg-card p-6 shadow-elevated">
        <h2 className="text-xl font-bold">Edit RFID UID</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin-only RFID assignment for {student.fullName}.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            {error}
          </div>
        )}

        <div className="mt-5 grid gap-4">
          <div className="rounded-lg bg-muted p-4 text-sm">
            <div className="font-bold">{student.fullName}</div>
            <div className="mt-1 text-muted-foreground">{student.email}</div>
            <div className="mt-1 font-mono text-xs">{student.registerNumber}</div>
          </div>
          <label className="grid gap-2 text-sm font-semibold">
            RFID UID
            <input
              value={rfidId}
              onChange={(event) => setRfidId(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 font-mono"
              placeholder="RFID-001"
            />
            <span className="text-xs font-medium text-muted-foreground">
              RFID UID must be unique. Leave blank only when this student has no assigned card.
            </span>
          </label>
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
