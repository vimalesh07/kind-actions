import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminPrototypeShell, Card, StatusBadge } from "@/components/booknest/PrototypeShell";
import { getUsers } from "@/lib/booknest/db.functions";
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

  useEffect(() => {
    getUsers()
      .then((data) => setStudents(data as AdminUser[]))
      .catch((caught) => setError(readError(caught)));
  }, []);

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
                <button className="text-sm font-bold text-primary">View profile details</button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </AdminPrototypeShell>
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
