import { useState } from "react";
import { Camera, CheckCircle2, X } from "lucide-react";
import { StatusBadge } from "./PrototypeShell";
import { recordBookAction, scanBook } from "@/lib/booknest/db.functions";
import type { Book, UserProfile } from "@/lib/booknest/data";

export function ScannerModal({
  user,
  books,
  onClose,
  onSaved,
}: {
  user: UserProfile;
  books: Book[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedBookId, setSelectedBookId] = useState(books[0]?.id ?? "");
  const [manualQr, setManualQr] = useState(books[0]?.qrValue ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const selectedBook = books.find((book) => book.id === selectedBookId);
  const canReturn = selectedBook?.borrowedBy === user.id;
  const canBorrow = selectedBook?.status === "Available";

  const confirm = async (action: "Borrowed" | "Returned") => {
    if (!selectedBook || !user.rfidId) return;
    setError("");
    setIsSaving(true);
    try {
      await recordBookAction({
        data: {
          userId: user.id,
          rfidId: user.rfidId,
          bookId: selectedBook.id,
          action,
        },
      });
      onSaved();
      onClose();
    } catch (caught) {
      setError(readError(caught));
    } finally {
      setIsSaving(false);
    }
  };

  const scanManualQr = async () => {
    setError("");
    setIsScanning(true);
    try {
      const book = await scanBook({ data: { qrValue: manualQr, userId: user.id } });
      setSelectedBookId(book.id);
    } catch (caught) {
      setError(readError(caught));
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-card p-5 shadow-elevated">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Phone camera scanner
            </div>
            <h2 className="mt-1 text-xl font-bold">Scan the book QR code</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-[1fr_1.1fr]">
          <div className="grid aspect-[3/4] place-items-center rounded-lg border border-dashed border-primary/50 bg-muted">
            <div className="text-center">
              <Camera className="mx-auto h-10 w-10 text-primary" />
              <div className="mt-3 text-sm font-semibold">Scanner simulation</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Choose a database book QR below.
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="grid gap-2 text-sm font-semibold">
              Sample book QR
              <select
                value={selectedBookId}
                onChange={(event) => {
                  const book = books.find((item) => item.id === event.target.value);
                  setSelectedBookId(event.target.value);
                  setManualQr(book?.qrValue ?? "");
                }}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.id} - {book.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold">
              Manual QR value
              <div className="flex gap-2">
                <input
                  value={manualQr}
                  onChange={(event) => setManualQr(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
                />
                <button
                  type="button"
                  disabled={isScanning || !manualQr.trim()}
                  onClick={() => void scanManualQr()}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-bold hover:bg-accent disabled:opacity-50"
                >
                  {isScanning ? "Scanning..." : "Scan"}
                </button>
              </div>
            </label>

            {selectedBook && (
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="font-mono text-xs text-muted-foreground">{selectedBook.id}</div>
                  <StatusBadge status={selectedBook.status} />
                </div>
                <div className="text-lg font-bold">{selectedBook.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{selectedBook.author}</div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Department</dt>
                    <dd className="font-semibold">{selectedBook.department}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">QR value</dt>
                    <dd className="font-mono text-xs font-semibold">{selectedBook.qrValue}</dd>
                  </div>
                </dl>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={!canReturn || isSaving}
                onClick={() => void confirm("Returned")}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Return book
              </button>
              <button
                disabled={!canBorrow || isSaving}
                onClick={() => void confirm("Borrowed")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isSaving ? "Saving..." : "Borrow book"}
              </button>
            </div>
          </div>
        </div>
      </div>
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
