import { createFileRoute } from "@tanstack/react-router";
import { Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { QrCodeImage } from "@/components/booknest/QrCode";
import { AdminPrototypeShell, Card, StatusBadge } from "@/components/booknest/PrototypeShell";
import { deleteBook, getBooks, saveBook } from "@/lib/booknest/db.functions";
import { departments, type Book, type Department } from "@/lib/booknest/data";

export const Route = createFileRoute("/admin/books")({
  head: () => ({ meta: [{ title: "Books - Book Nest Admin" }] }),
  component: AdminBooksPage,
});

function AdminBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("All");
  const [editing, setEditing] = useState<Book | null>(null);
  const [qrBook, setQrBook] = useState<Book | null>(null);
  const [error, setError] = useState("");

  const refresh = () =>
    getBooks()
      .then(setBooks)
      .catch((caught) => setError(readError(caught)));

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return books.filter((book) => {
      const matchesSearch =
        !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.id.toLowerCase().includes(q);
      const matchesDept = dept === "All" || book.department === dept;
      return matchesSearch && matchesDept;
    });
  }, [books, query, dept]);

  return (
    <AdminPrototypeShell
      title="Books"
      subtitle="Manage PostgreSQL book records and QR values."
      actions={
        <button
          onClick={() => setEditing(emptyBook())}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Add new book
        </button>
      }
    >
      {error && <Card className="mb-5 text-destructive">{error}</Card>}
      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, author, or book ID"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={dept}
            onChange={(event) => setDept(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {["All", ...departments].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        <Table headers={["Book", "Author", "Department", "Status", "QR value", "Actions"]}>
          {filtered.map((book) => (
            <tr key={book.id} className="border-t border-border">
              <td className="px-4 py-3">
                <div className="font-semibold">{book.title}</div>
                <div className="font-mono text-xs text-muted-foreground">
                  {book.id} - {book.isbn}
                </div>
              </td>
              <td className="px-4 py-3">{book.author}</td>
              <td className="px-4 py-3">{book.department}</td>
              <td className="px-4 py-3">
                <StatusBadge status={book.status} />
              </td>
              <td className="px-4 py-3 font-mono text-xs">{book.qrValue}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <IconButton
                    label="QR"
                    onClick={() => setQrBook(book)}
                    icon={<Download className="h-4 w-4" />}
                  />
                  <IconButton
                    label="Edit"
                    onClick={() => setEditing(book)}
                    icon={<Pencil className="h-4 w-4" />}
                  />
                  <IconButton
                    label="Delete"
                    onClick={async () => {
                      await deleteBook({ data: { bookId: book.id } });
                      await refresh();
                    }}
                    icon={<Trash2 className="h-4 w-4" />}
                  />
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      {editing && <BookForm book={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {qrBook && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => setQrBook(null)}
        >
          <div
            className="rounded-lg bg-card p-6 shadow-elevated"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-bold">{qrBook.title}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{qrBook.qrValue}</p>
            <QrCodeImage
              size={240}
              payload={{ bookId: qrBook.id, title: qrBook.title, qrValue: qrBook.qrValue }}
            />
            <button className="mt-5 w-full rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              Print / Download QR
            </button>
          </div>
        </div>
      )}
    </AdminPrototypeShell>
  );
}

function BookForm({
  book,
  onClose,
  onSaved,
}: {
  book: Book;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<Book>(book);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await saveBook({ data: form });
      await onSaved();
      onClose();
    } catch (caught) {
      setError(readError(caught));
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <form onSubmit={submit} className="w-full max-w-xl rounded-lg bg-card p-6 shadow-elevated">
        <h2 className="text-xl font-bold">{book.qrValue ? "Edit book" : "Add new book"}</h2>
        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            {error}
          </div>
        )}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input
            label="Book ID"
            value={form.id}
            onChange={(value) => setForm({ ...form, id: value })}
          />
          <Input
            label="ISBN"
            value={form.isbn}
            onChange={(value) => setForm({ ...form, isbn: value })}
          />
          <Input
            label="Title"
            value={form.title}
            onChange={(value) => setForm({ ...form, title: value })}
          />
          <Input
            label="Author"
            value={form.author}
            onChange={(value) => setForm({ ...form, author: value })}
          />
          <label className="grid gap-2 text-sm font-semibold">
            Department
            <select
              value={form.department}
              onChange={(event) =>
                setForm({ ...form, department: event.target.value as Department })
              }
              className="rounded-lg border border-border bg-background px-3 py-2"
            >
              {departments.map((department) => (
                <option key={department}>{department}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Status
            <select
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as Book["status"] })
              }
              className="rounded-lg border border-border bg-background px-3 py-2"
            >
              <option>Available</option>
              <option>Borrowed</option>
            </select>
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
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function emptyBook(): Book {
  return {
    id: "",
    isbn: "",
    title: "",
    author: "",
    department: "CSE",
    status: "Available",
    qrValue: "",
  };
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <input
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2"
      />
    </label>
  );
}

function IconButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-accent"
    >
      {icon}
    </button>
  );
}

function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
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
