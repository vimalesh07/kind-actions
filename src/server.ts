import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type RfidSessionStatus = "waiting" | "verified" | "failed";

type PendingRfidSession = {
  userId: string;
  status: RfidSessionStatus;
  message: string;
  scannedUid: string | null;
  user:
    | {
        id: string;
        name: string;
        email: string;
        register_number: string;
        department: string;
        rfid_uid: string | null;
      }
    | null;
  updatedAt: number;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;
const pendingRfidSessions = new Map<string, PendingRfidSession>();

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const apiResponse = await handleBookNestApi(request);
      if (apiResponse) return apiResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

async function handleBookNestApi(request: Request) {
  const url = new URL(request.url);
  const corsHeaders = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  };

  if (request.method === "OPTIONS" && url.pathname.startsWith("/api/rfid/")) {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === "GET" && url.pathname === "/api/rfid/ping") {
    return Response.json({
      ok: true,
      message: "RFID API reachable",
    }, { headers: corsHeaders });
  }

  if (request.method !== "POST") return null;

  if (url.pathname === "/api/rfid/start") {
    try {
      const body = (await request.json()) as { user_id?: string; userId?: string };
      const userId = body.user_id ?? body.userId ?? "";
      if (!userId.trim()) {
        return Response.json({ success: false, message: "User ID is required" }, { status: 400 });
      }

      const db = await import("./lib/booknest/db.server");
      const dashboard = await db.getUserDashboard(userId.trim());
      const rfidUid = normalizeRfid(dashboard.user.rfidId ?? "");
      pendingRfidSessions.set(dashboard.user.id, {
        userId: dashboard.user.id,
        status: "waiting",
        message: "Waiting for RFID card...",
        scannedUid: null,
        user: {
          id: dashboard.user.id,
          name: dashboard.user.fullName,
          email: dashboard.user.email,
          register_number: dashboard.user.registerNumber,
          department: dashboard.user.department,
          rfid_uid: rfidUid || dashboard.user.rfidId,
        },
        updatedAt: Date.now(),
      });

      return Response.json({
        success: true,
        status: "waiting",
        message: "Waiting for RFID card...",
        expected_rfid_uid: rfidUid,
      });
    } catch (error) {
      return Response.json({ success: false, message: readPublicError(error) }, { status: 400 });
    }
  }

  if (url.pathname === "/api/rfid/status") {
    try {
      const body = (await request.json()) as { user_id?: string; userId?: string };
      const userId = body.user_id ?? body.userId ?? "";
      const session = pendingRfidSessions.get(userId.trim());
      if (!session) {
        return Response.json({
          success: false,
          status: "idle",
          message: "RFID scan has not started.",
        });
      }

      return Response.json({
        success: session.status === "verified",
        status: session.status,
        message: session.message,
        rfid_uid: session.scannedUid,
        user: session.user,
      });
    } catch (error) {
      return Response.json({ success: false, message: readPublicError(error) }, { status: 400 });
    }
  }

  if (url.pathname === "/api/rfid/scan") {
    try {
      const body = (await request.json()) as {
        uid?: string;
        normalizedUid?: string;
        deviceId?: string;
        rfid_uid?: string;
        rfidId?: string;
      };
      console.log("[RFID_SCAN_REQUEST]", {
        uid: body.uid ?? body.rfid_uid ?? body.rfidId ?? "",
        normalizedUid: body.normalizedUid ?? "",
        deviceId: body.deviceId ?? "",
        timestamp: new Date().toISOString(),
      });
      const db = await import("./lib/booknest/db.server");
      const result = await db.receiveHardwareRfidScan({
        uid: body.uid ?? body.rfid_uid ?? body.rfidId,
        normalizedUid: body.normalizedUid,
        deviceId: body.deviceId,
      });
      return Response.json(result, { status: 200, headers: corsHeaders });
    } catch (error) {
      return Response.json(
        { ok: false, status: "error", message: readPublicError(error) },
        { status: 400, headers: corsHeaders },
      );
    }
  }

  if (url.pathname === "/api/rfid/verify") {
    try {
      const body = (await request.json()) as { rfid_uid?: string; rfidId?: string };
      const rfidUid = normalizeRfid(body.rfid_uid ?? body.rfidId ?? "");
      if (!rfidUid) {
        return Response.json({ success: false, message: "RFID UID is required" }, { status: 400 });
      }

      const db = await import("./lib/booknest/db.server");
      const result = await db.verifyRfid(rfidUid);
      return Response.json({
        success: true,
        message: "RFID verified successfully",
        rfid_uid: normalizeRfid(result.user.rfidId ?? rfidUid),
        user: {
          id: result.user.id,
          full_name: result.user.fullName,
          email: result.user.email,
          register_number: result.user.registerNumber,
          department: result.user.department,
          rfid_uid: result.user.rfidId,
        },
      });
    } catch (error) {
      return Response.json({ success: false, message: readPublicError(error) }, { status: 404 });
    }
  }

  if (url.pathname === "/api/books/scan") {
    try {
      const body = (await request.json()) as { qr_value?: string; user_id?: string };
      const qrValue = body.qr_value ?? "";
      if (!qrValue.trim()) {
        return Response.json({ success: false, message: "QR value is required" }, { status: 400 });
      }

      const db = await import("./lib/booknest/db.server");
      const book = await db.scanBookByQr(qrValue.trim(), body.user_id);
      return Response.json({
        success: true,
        book: {
          id: book.id,
          book_id: book.id,
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          department: book.department,
          status: book.status,
          qr_value: book.qrValue,
        },
      });
    } catch (error) {
      return Response.json({ success: false, message: readPublicError(error) }, { status: 404 });
    }
  }

  if (url.pathname === "/api/transactions/borrow" || url.pathname === "/api/transactions/return") {
    try {
      const body = (await request.json()) as {
        user_id?: string;
        rfid_uid?: string;
        book_id?: string;
      };
      if (!body.user_id || !body.rfid_uid || !body.book_id) {
        return Response.json(
          { success: false, message: "user_id, rfid_uid, and book_id are required" },
          { status: 400 },
        );
      }

      const db = await import("./lib/booknest/db.server");
      const transaction = await db.recordBookAction({
        userId: body.user_id,
        rfidId: body.rfid_uid,
        bookId: body.book_id,
        action: url.pathname.endsWith("/borrow") ? "Borrowed" : "Returned",
      });
      return Response.json({ success: true, transaction });
    } catch (error) {
      return Response.json({ success: false, message: readPublicError(error) }, { status: 400 });
    }
  }

  return null;
}

function normalizeRfid(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function readPublicError(error: unknown) {
  try {
    const parsed = JSON.parse((error as Error).message) as { message?: string };
    return parsed.message ?? "Request failed.";
  } catch {
    return (error as Error).message || "Request failed.";
  }
}
