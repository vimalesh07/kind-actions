import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, IndianRupee, Receipt, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Logo } from "@/components/booknest/Logo";
import { QrCodeImage } from "@/components/booknest/QrCode";
import { findBook, students, transactions } from "@/lib/booknest/data";

const MONTHLY_LIBRARY_FEE = 30;
const UPI_ID = "sankarganesh9361@okicici";
const PAYEE_NAME = "Sankar Ganesh.R";

export const Route = createFileRoute("/user")({
  head: () => ({ meta: [{ title: "User Payment · Book Nest" }] }),
  component: UserPaymentPage,
});

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function makeBillNo(studentCode: string) {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `BN-${studentCode}-${stamp}`;
}

function UserPaymentPage() {
  const [studentId, setStudentId] = useState(students[1]?.id ?? students[0]?.id ?? "");
  const student = students.find((s) => s.id === studentId) ?? students[0];
  const [billNo, setBillNo] = useState(() => makeBillNo(student?.studentCode ?? "USER"));

  const unpaidFines = useMemo(
    () => transactions.filter((t) => t.studentId === student?.id && t.fineAmount > 0 && !t.finePaid),
    [student?.id],
  );
  const fineTotal = unpaidFines.reduce((total, t) => total + t.fineAmount, 0);
  const totalAmount = fineTotal + MONTHLY_LIBRARY_FEE;
  const upiPayload = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`Book Nest bill ${billNo}`)}`;

  const refreshBill = () => {
    setBillNo(`${makeBillNo(student.studentCode)}-${Math.floor(100 + Math.random() * 900)}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <section>
          <div className="mb-5">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">User section</div>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Generate bill and pay</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Select your student account. Book Nest calculates pending fines and the monthly library fee automatically.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="student">
              Student
            </label>
            <select
              id="student"
              value={student.id}
              onChange={(event) => {
                const nextStudent = students.find((s) => s.id === event.target.value);
                setStudentId(event.target.value);
                setBillNo(makeBillNo(nextStudent?.studentCode ?? "USER"));
              }}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.studentCode}
                </option>
              ))}
            </select>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-muted p-4">
                <div className="text-xs text-muted-foreground">Department</div>
                <div className="mt-1 font-bold">{student.department} · Year {student.year}</div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <div className="text-xs text-muted-foreground">Wallet balance</div>
                <div className="mt-1 font-bold">{money(student.walletBalance)}</div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Generated bill</div>
                <div className="mt-1 font-mono text-sm font-bold">{billNo}</div>
              </div>
              <button
                onClick={refreshBill}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-accent"
              >
                <RefreshCw className="h-4 w-4" /> Generate bill
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                <span className="inline-flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Pending fines</span>
                <strong>{money(fineTotal)}</strong>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Monthly library fee</span>
                <strong>{money(MONTHLY_LIBRARY_FEE)}</strong>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-primary px-4 py-4 text-primary-foreground">
                <span className="inline-flex items-center gap-2 font-bold"><IndianRupee className="h-4 w-4" /> Auto amount</span>
                <strong className="text-2xl">{money(totalAmount)}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start">
            <div className="rounded-xl border border-border bg-white p-4">
              <QrCodeImage payload={upiPayload} size={280} />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Scan to pay</div>
              <h2 className="mt-3 text-2xl font-extrabold">{PAYEE_NAME}</h2>
              <div className="mt-2 font-mono text-sm text-muted-foreground">UPI ID: {UPI_ID}</div>
              <div className="mt-5 rounded-lg bg-muted p-4">
                <div className="text-xs text-muted-foreground">Amount in QR</div>
                <div className="mt-1 text-3xl font-extrabold text-primary">{money(totalAmount)}</div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                The QR includes the generated bill number and exact amount, so any UPI app can open it with the payment filled in.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Book</th>
                  <th className="px-4 py-3 text-left font-semibold">Due date</th>
                  <th className="px-4 py-3 text-right font-semibold">Fine</th>
                </tr>
              </thead>
              <tbody>
                {unpaidFines.length ? (
                  unpaidFines.map((fine) => (
                    <tr key={fine.id} className="border-t border-border">
                      <td className="px-4 py-3 font-semibold">{findBook(fine.bookId)?.title ?? "Library item"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{fine.dueDate}</td>
                      <td className="px-4 py-3 text-right font-bold text-destructive">{money(fine.fineAmount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                      No unpaid fines. Only the monthly library fee is included.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
