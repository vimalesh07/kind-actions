import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { AdminShell } from "@/components/booknest/AdminShell";
import { students } from "@/lib/booknest/data";

export const Route = createFileRoute("/admin/students")({
  head: () => ({ meta: [{ title: "Students · Book Nest Admin" }] }),
  component: StudentsPage,
});

function StudentsPage() {
  const [q, setQ] = useState("");
  const filtered = students.filter(
    (s) =>
      !q ||
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.studentCode.toLowerCase().includes(q.toLowerCase()) ||
      s.rfidUid.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AdminShell
      title="Students"
      subtitle={`${students.length} registered`}
      actions={
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-[var(--color-primary-dark)]">
          <Plus className="h-4 w-4" /> Register student
        </button>
      }
    >
      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, ID, RFID UID…"
          className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Student</th>
              <th className="text-left px-4 py-3 font-semibold">ID</th>
              <th className="text-left px-4 py-3 font-semibold">Dept · Year</th>
              <th className="text-left px-4 py-3 font-semibold">RFID UID</th>
              <th className="text-left px-4 py-3 font-semibold">Wallet</th>
              <th className="text-left px-4 py-3 font-semibold">Auto-pay</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id} className={i % 2 ? "bg-[color-mix(in_oklch,var(--color-primary)_3%,var(--color-card))]" : ""}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                      {s.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{s.studentCode}</td>
                <td className="px-4 py-3">{s.department} · Y{s.year}</td>
                <td className="px-4 py-3 font-mono text-xs">{s.rfidUid}</td>
                <td className="px-4 py-3 font-semibold">
                  <span className={s.walletBalance < 30 ? "text-destructive" : "text-foreground"}>₹{s.walletBalance}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex h-5 w-9 items-center rounded-full px-0.5 ${s.autoPay ? "bg-primary" : "bg-muted"}`}>
                    <span className={`h-4 w-4 rounded-full bg-white transition-transform ${s.autoPay ? "translate-x-4" : ""}`} />
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="bn-status-available inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase">Active</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
