import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Plus, Search } from "lucide-react";
import { useState } from "react";
import { AdminShell, StatusPill } from "@/components/booknest/AdminShell";
import { QrCodeImage } from "@/components/booknest/QrCode";
import { books, type Book } from "@/lib/booknest/data";

export const Route = createFileRoute("/admin/books")({
  head: () => ({ meta: [{ title: "Books · Book Nest Admin" }] }),
  component: BooksPage,
});

function BooksPage() {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("All");
  const [open, setOpen] = useState<Book | null>(null);

  const filtered = books.filter((b) => {
    const q = query.toLowerCase();
    const matches = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn.includes(q);
    const matchesDept = dept === "All" || b.department === dept;
    return matches && matchesDept;
  });

  return (
    <AdminShell
      title="Books"
      subtitle={`${books.length} titles · ${books.reduce((n, b) => n + b.totalCopies, 0)} copies`}
      actions={
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-[var(--color-primary-dark)]">
          <Plus className="h-4 w-4" /> Add book
        </button>
      }
    >
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, ISBN…"
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium"
        >
          {["All", "CSE", "IT", "AIDS", "ECE", "EEE", "Mechanical", "Civil"].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Title</th>
              <th className="text-left px-4 py-3 font-semibold">Author</th>
              <th className="text-left px-4 py-3 font-semibold">Dept</th>
              <th className="text-left px-4 py-3 font-semibold">Shelf</th>
              <th className="text-left px-4 py-3 font-semibold">Copies</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b, i) => (
              <tr key={b.id} className={i % 2 ? "bg-[color-mix(in_oklch,var(--color-primary)_3%,var(--color-card))]" : ""}>
                <td className="px-4 py-3">
                  <div className="font-semibold">{b.title}</div>
                  <div className="text-xs text-muted-foreground font-mono">{b.isbn}</div>
                </td>
                <td className="px-4 py-3">{b.author}</td>
                <td className="px-4 py-3"><span className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">{b.department}</span></td>
                <td className="px-4 py-3 font-mono text-xs">{b.shelfSection}-{b.shelfRow}-{b.shelfPosition}</td>
                <td className="px-4 py-3 font-semibold">{b.availableCopies}<span className="text-muted-foreground">/{b.totalCopies}</span></td>
                <td className="px-4 py-3"><StatusPill status={b.status === "borrowed" || b.availableCopies === 0 ? "borrowed" : "available"} /></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setOpen(b)} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent">View QR</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setOpen(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-[var(--shadow-elevated)]" onClick={(e) => e.stopPropagation()}>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Book QR · Printable Label</div>
            <div className="mt-1 text-lg font-bold leading-tight">{open.title}</div>
            <div className="text-sm text-muted-foreground">{open.author}</div>
            <div className="my-5 grid place-items-center">
              <QrCodeImage
                size={240}
                payload={{
                  bookId: open.id,
                  bookName: open.title,
                  author: open.author,
                  department: open.department,
                  shelfSection: open.shelfSection,
                  shelfRow: open.shelfRow,
                  shelfPosition: open.shelfPosition,
                  isbn: open.isbn,
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md bg-muted px-2 py-1.5"><div className="text-muted-foreground">Shelf</div><div className="font-bold font-mono">{open.shelfSection}-{open.shelfRow}-{open.shelfPosition}</div></div>
              <div className="rounded-md bg-muted px-2 py-1.5"><div className="text-muted-foreground">Dept</div><div className="font-bold">{open.department}</div></div>
              <div className="rounded-md bg-muted px-2 py-1.5"><div className="text-muted-foreground">Copies</div><div className="font-bold">{open.totalCopies}</div></div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpen(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">Close</button>
              <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-[var(--color-primary-dark)]">
                <Download className="h-4 w-4" /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
