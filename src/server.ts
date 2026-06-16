import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

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
  if (request.method !== "POST") return null;

  if (url.pathname === "/api/rfid/verify") {
    try {
      const body = (await request.json()) as { rfid_uid?: string; rfidId?: string };
      const rfidUid = body.rfid_uid ?? body.rfidId ?? "";
      if (!rfidUid.trim()) {
        return Response.json({ success: false, message: "RFID UID is required" }, { status: 400 });
      }

      const db = await import("./lib/booknest/db.server");
      const result = await db.verifyRfid(rfidUid.trim());
      return Response.json({
        success: true,
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

function readPublicError(error: unknown) {
  try {
    const parsed = JSON.parse((error as Error).message) as { message?: string };
    return parsed.message ?? "Request failed.";
  } catch {
    return (error as Error).message || "Request failed.";
  }
}
