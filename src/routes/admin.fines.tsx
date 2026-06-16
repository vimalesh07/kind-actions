import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/fines")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/payments" });
  },
});
