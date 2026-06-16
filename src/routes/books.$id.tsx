import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QrCodeImage } from "@/components/booknest/QrCode";
import { Card, StatusBadge, UserShell } from "@/components/booknest/PrototypeShell";
import { getBook } from "@/lib/booknest/db.functions";
import type { Book } from "@/lib/booknest/data";

export const Route = createFileRoute("/books/$id")({
  validateSearch: (search: Record<string, unknown>) => ({ userId: String(search.userId ?? "") }),
  head: () => ({ meta: [{ title: "Book Details - Book Nest" }] }),
  component: BookDetailsPage,
});

function BookDetailsPage() {
  const { id } = Route.useParams();
  const { userId } = Route.useSearch();
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getBook({ data: { bookId: id } })
      .then(setBook)
      .catch((caught) => setError(readError(caught)));
  }, [id]);

  return (
    <UserShell
      title="Book details"
      subtitle="QR value identifies the book in the scanner flow."
      userId={userId}
    >
      {error ? (
        <Card className="text-destructive">{error}</Card>
      ) : !book ? (
        <Card>Loading book...</Card>
      ) : (
        <Card>
          <div className="grid gap-6 md:grid-cols-[1fr_260px]">
            <div>
              <div className="mb-3">
                <StatusBadge status={book.status} />
              </div>
              <h2 className="text-3xl font-bold">{book.title}</h2>
              <p className="mt-2 text-muted-foreground">{book.author}</p>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <Detail label="Book ID" value={book.id} mono />
                <Detail label="Department" value={book.department} />
                <Detail label="QR code value" value={book.qrValue} mono />
                <Detail label="Borrowed by" value={book.borrowedBy ?? "Not borrowed"} />
                <Detail label="Due date" value={book.dueDate ?? "Not assigned"} />
              </dl>
            </div>
            <div className="grid place-items-center rounded-lg border border-border bg-background p-4">
              <QrCodeImage
                size={220}
                payload={{ bookId: book.id, title: book.title, qrValue: book.qrValue }}
              />
            </div>
          </div>
        </Card>
      )}
    </UserShell>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`${mono ? "font-mono text-sm" : ""} font-bold`}>{value}</dd>
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
