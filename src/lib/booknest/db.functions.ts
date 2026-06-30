import { createServerFn } from "@tanstack/react-start";
import { randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";

import { departments } from "./data";

const departmentSchema = z.enum(departments as [string, ...string[]]);

function fail(error: unknown): never {
  throw new Error(JSON.stringify(error));
}

async function verifyGoogleCredential(credential: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    fail({ message: "Google sign-in is not configured.", code: "GOOGLE_CONFIG_MISSING" });
  }

  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  const email = payload?.email;
  if (!email || !payload.email_verified) {
    throw new Error("Google account email is not verified.");
  }

  return {
    email,
    fullName: payload.name?.trim() || email.split("@")[0],
  };
}

export const signIn = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), password: z.string().optional() }))
  .handler(async ({ data }) => {
    if (data.email === "admin@gmail.com" && data.password === "admin123") {
      return { role: "admin" as const };
    }

    try {
      const db = await import("./db.server");
      const user = await db.getUserByEmail(data.email);
      return { role: "user" as const, user };
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const signInWithGoogle = createServerFn({ method: "POST" })
  .validator(z.object({ credential: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const { email } = await verifyGoogleCredential(data.credential);

      if (email === "admin@gmail.com") {
        return { role: "admin" as const };
      }

      const db = await import("./db.server");
      const user = await db.getUserByEmail(email);
      return { role: "user" as const, user };
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const signUpWithGoogle = createServerFn({ method: "POST" })
  .validator(z.object({ credential: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const { email, fullName } = await verifyGoogleCredential(data.credential);
      if (email === "admin@gmail.com") {
        return { role: "admin" as const };
      }

      const db = await import("./db.server");
      try {
        const user = await db.getUserByEmail(email);
        return { role: "user" as const, user, created: false };
      } catch (lookupError) {
        if (!String((lookupError as Error).message).includes("User not found")) {
          throw lookupError;
        }
        const user = await db.createUser({
          fullName,
          email,
          registerNumber: `PENDING-${randomUUID().slice(0, 8).toUpperCase()}`,
          department: "CSE" as never,
        });
        return { role: "user" as const, user, created: true };
      }
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const signUp = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fullName: z.string().trim().min(2),
      email: z.string().email(),
      registerNumber: z.string().trim().min(2),
      department: departmentSchema,
    }),
  )
  .handler(async ({ data }) => {
    try {
      const db = await import("./db.server");
      return db.createUser({
        fullName: data.fullName,
        email: data.email,
        registerNumber: data.registerNumber,
        department: data.department as never,
      });
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const getUserDashboard = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const db = await import("./db.server");
      return db.getUserDashboard(data.userId);
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const updateUserProfile = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string().min(1),
      fullName: z.string().trim().min(2),
      registerNumber: z.string().trim().min(2),
      department: departmentSchema,
      photoInitials: z.string().trim().min(1).max(4).optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const db = await import("./db.server");
      return db.updateUserProfile({
        userId: data.userId,
        fullName: data.fullName,
        registerNumber: data.registerNumber,
        department: data.department as never,
        photoInitials: data.photoInitials,
      });
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const startRfidScanSession = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const db = await import("./db.server");
      return db.createRfidScanSessionForUser(data.userId);
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const getRfidScanStatus = createServerFn({ method: "GET" })
  .validator(z.object({ sessionId: z.string().min(1), userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const db = await import("./db.server");
      return db.getRfidScanSessionStatus(data.sessionId, data.userId);
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const cancelRfidScanSession = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().min(1), userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const db = await import("./db.server");
      return db.cancelRfidScanSession(data.sessionId, data.userId);
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const getBookScanAccess = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const db = await import("./db.server");
      return db.getVerifiedRfidBookScanSession(data.userId);
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const updateStudentRfid = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string().min(1),
      rfidId: z.string().trim().max(64),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const db = await import("./db.server");
      return db.updateStudentRfid({
        userId: data.userId,
        rfidId: data.rfidId,
      });
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const verifyRfid = createServerFn({ method: "POST" })
  .validator(z.object({ rfidId: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const db = await import("./db.server");
      return db.verifyRfid(data.rfidId);
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const getBooks = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await import("./db.server");
    return db.getBooks();
  } catch (error) {
    const db = await import("./db.server");
    fail(db.publicError(error));
  }
});

export const getBook = createServerFn({ method: "GET" })
  .validator(z.object({ bookId: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const db = await import("./db.server");
      return db.getBook(data.bookId);
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const scanBook = createServerFn({ method: "POST" })
  .validator(z.object({ qrValue: z.string().min(1), userId: z.string().optional() }))
  .handler(async ({ data }) => {
    try {
      const db = await import("./db.server");
      return db.scanBookByQr(data.qrValue, data.userId);
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const saveBook = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().trim().min(2),
      isbn: z.string().trim().min(2),
      title: z.string().trim().min(2),
      author: z.string().trim().min(2),
      department: departmentSchema,
      status: z.enum(["Available", "Borrowed"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const db = await import("./db.server");
      return db.saveBook({ ...data, department: data.department as never });
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const deleteBook = createServerFn({ method: "POST" })
  .validator(z.object({ bookId: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const db = await import("./db.server");
      await db.deleteBook(data.bookId);
      return { ok: true };
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const recordBookAction = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string().min(1),
      rfidId: z.string().min(1),
      bookId: z.string().min(1),
      action: z.enum(["Borrowed", "Returned"]),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const db = await import("./db.server");
      return db.recordBookAction(data);
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const getAdminDashboard = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await import("./db.server");
    return db.getAdminDashboard();
  } catch (error) {
    const db = await import("./db.server");
    fail(db.publicError(error));
  }
});

export const getUsers = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await import("./db.server");
    return db.getUsers();
  } catch (error) {
    const db = await import("./db.server");
    fail(db.publicError(error));
  }
});

export const getTransactions = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await import("./db.server");
    return db.getTransactions();
  } catch (error) {
    const db = await import("./db.server");
    fail(db.publicError(error));
  }
});

export const getPayments = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    try {
      const db = await import("./db.server");
      return db.getPayments(data?.userId);
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const markPaymentPaid = createServerFn({ method: "POST" })
  .validator(z.object({ paymentId: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const db = await import("./db.server");
      return db.markPaymentPaid(data.paymentId);
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });

export const getFines = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    try {
      const db = await import("./db.server");
      return db.getFines(data?.userId);
    } catch (error) {
      const db = await import("./db.server");
      fail(db.publicError(error));
    }
  });
