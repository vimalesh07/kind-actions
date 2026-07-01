import process from "node:process";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import schemaSql from "./schema.sql?raw";

import type {
  AdminDashboard,
  Book,
  BookStatus,
  BorrowedBook,
  Department,
  Fine,
  Payment,
  RfidVerification,
  Transaction,
  TransactionStatus,
  UserDashboard,
  UserProfile,
} from "./data";

const { Pool } = pg;

type Queryable = {
  query<T>(sql: string, values?: unknown[]): Promise<{ rows: T[] }>;
};

type DbClient = Queryable & {
  release(): void;
};

type DbPool = Queryable & {
  connect(): Promise<DbClient>;
  exec?(sql: string): Promise<unknown>;
};

let pool: DbPool | undefined;
let schemaReady: Promise<void> | undefined;

class AppError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}

function getPool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new AppError(
      "Database connection failed. DATABASE_URL is not configured.",
      "DB_CONFIG_MISSING",
    );
  }

  pool ??= databaseUrl.startsWith("pglite:")
    ? createPglitePool(databaseUrl)
    : new Pool({
        connectionString: stripSslMode(databaseUrl),
        ssl: { rejectUnauthorized: false },
      });

  return pool;
}

function createPglitePool(databaseUrl: string): DbPool {
  const db = new PGlite(getPgliteDataDir(databaseUrl));
  return {
    query: (sql, values) => db.query(sql, values),
    exec: (sql) => db.exec(sql),
    async connect() {
      return {
        query: (sql, values) => db.query(sql, values),
        release() {},
      };
    },
  };
}

function getPgliteDataDir(databaseUrl: string) {
  const rawPath = databaseUrl.replace(/^pglite:\/\//, "");
  if (!rawPath || rawPath === "memory") return "memory://booknest";
  return path.resolve(process.cwd(), rawPath);
}

function stripSslMode(databaseUrl: string) {
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");
  return url.toString();
}

async function ensureSchema() {
  schemaReady ??= (async () => {
    const pool = getPool();
    if (pool.exec) {
      await pool.exec(schemaSql);
    } else {
      await pool.query(schemaSql);
    }
    await seedPrototypeData();
  })();

  return schemaReady;
}

async function query<T>(sql: string, values: unknown[] = []) {
  try {
    await ensureSchema();
    return await getPool().query<T>(sql, values);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      `Database connection failed: ${(error as Error).message}`,
      "DB_CONNECTION_FAILED",
    );
  }
}

export function publicError(error: unknown) {
  if (error instanceof AppError) {
    return { message: error.message, code: error.code };
  }
  return { message: (error as Error).message || "Unexpected server error.", code: "SERVER_ERROR" };
}

export function normalizeRfidUid(uid: string) {
  return uid.toUpperCase().replace(/[^0-9A-F]/g, "");
}

export async function createUser(input: {
  fullName: string;
  email: string;
  registerNumber: string;
  department: Department;
}): Promise<UserProfile> {
  const userId = `user-${randomUUID()}`;
  const rfidId = await makeNextRfidId();
  const initials = makeInitials(input.fullName);

  const client = await getPool().connect();
  try {
    await ensureSchema();
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO users (id, full_name, email, register_number, department, rfid_uid, role, photo_initials)
       VALUES ($1, $2, $3, $4, $5, $6, 'student', $7)`,
      [
        userId,
        input.fullName.trim(),
        input.email.trim(),
        input.registerNumber.trim(),
        input.department,
        rfidId,
        initials,
      ],
    );
    await client.query(`INSERT INTO rfid_cards (id, user_id, rfid_id) VALUES ($1, $2, $3)`, [
      `rfid-${randomUUID()}`,
      userId,
      rfidId,
    ]);
    await client.query("COMMIT");
    return getUserByEmail(input.email);
  } catch (error) {
    await client.query("ROLLBACK");
    throw new AppError(`User save failed: ${(error as Error).message}`, "USER_SAVE_FAILED");
  } finally {
    client.release();
  }
}

export async function getUserByEmail(email: string): Promise<UserProfile> {
  const result = await query<UserRow>(
    `SELECT u.*, COALESCE(u.rfid_uid, r.rfid_id) AS rfid_id
     FROM users u
     LEFT JOIN rfid_cards r ON r.user_id = u.id AND r.is_active = TRUE
     WHERE LOWER(u.email) = LOWER($1)
     LIMIT 1`,
    [email],
  );
  const user = result.rows[0];
  if (!user) throw new AppError("User not found.", "USER_NOT_FOUND");
  return mapUser(user);
}

export async function updateUserProfile(input: {
  userId: string;
  fullName: string;
  registerNumber: string;
  department: Department;
  photoInitials?: string;
}): Promise<UserProfile> {
  const photoInitials = (input.photoInitials?.trim() || makeInitials(input.fullName)).toUpperCase();
  const result = await query<UserRow>(
    `UPDATE users
     SET full_name = $2,
         register_number = $3,
         department = $4,
         photo_initials = $5
     WHERE id = $1
     RETURNING id, full_name, email, register_number, department, photo_initials, NULL::text AS rfid_id`,
    [
      input.userId,
      input.fullName.trim(),
      input.registerNumber.trim(),
      input.department,
      photoInitials,
    ],
  );

  if (!result.rows[0]) throw new AppError("User not found.", "USER_NOT_FOUND");
  return getUserById(input.userId);
}

export async function updateStudentRfid(input: {
  userId: string;
  rfidId: string;
}): Promise<UserProfile> {
  const rfidId = input.rfidId.trim();
  const client = await getPool().connect();

  try {
    await ensureSchema();
    await client.query("BEGIN");

    const userResult = await client.query<UserRow>(
      `SELECT u.*, COALESCE(u.rfid_uid, r.rfid_id) AS rfid_id
       FROM users u
       LEFT JOIN rfid_cards r ON r.user_id = u.id AND r.is_active = TRUE
       WHERE u.id = $1
       LIMIT 1`,
      [input.userId],
    );
    if (!userResult.rows[0]) throw new AppError("User not found.", "USER_NOT_FOUND");

    if (!rfidId) {
      await client.query(`UPDATE users SET rfid_uid = NULL WHERE id = $1`, [input.userId]);
      await client.query(`UPDATE rfid_cards SET is_active = FALSE WHERE user_id = $1`, [
        input.userId,
      ]);
      await client.query("COMMIT");
      return getUserById(input.userId);
    }

    const duplicate = await client.query<{ id: string }>(
      `SELECT id
       FROM (
         SELECT u.id, u.rfid_uid AS rfid_id FROM users u WHERE u.rfid_uid IS NOT NULL
         UNION ALL
         SELECT r.user_id AS id, r.rfid_id FROM rfid_cards r WHERE r.is_active = TRUE
       ) assigned
       WHERE LOWER(assigned.rfid_id) = LOWER($1) AND assigned.id <> $2
       LIMIT 1`,
      [rfidId, input.userId],
    );
    if (duplicate.rows[0]) {
      throw new AppError("RFID UID is already assigned to another student.", "RFID_DUPLICATE");
    }

    await client.query(`UPDATE users SET rfid_uid = $2 WHERE id = $1`, [input.userId, rfidId]);
    await client.query(
      `INSERT INTO rfid_cards (id, user_id, rfid_id, is_active)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (user_id) DO UPDATE SET rfid_id = EXCLUDED.rfid_id, is_active = TRUE`,
      [`rfid-${input.userId}`, input.userId, rfidId],
    );

    await client.query("COMMIT");
    return getUserById(input.userId);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof AppError) throw error;
    const message = (error as Error).message;
    if (message.toLowerCase().includes("unique")) {
      throw new AppError("RFID UID is already assigned to another student.", "RFID_DUPLICATE");
    }
    throw new AppError(`RFID update failed: ${message}`, "RFID_UPDATE_FAILED");
  } finally {
    client.release();
  }
}

export async function getUserDashboard(userId: string): Promise<UserDashboard> {
  const user = await getUserById(userId);
  return {
    user,
    borrowedBooks: await getBorrowedBooks(userId),
    payments: await getPayments(userId),
    fines: await getFines(userId),
  };
}

export async function verifyRfid(rfidId: string): Promise<RfidVerification> {
  const normalizedRfid = normalizeRfid(rfidId);
  const result = await query<UserRow>(
    `SELECT u.*, COALESCE(u.rfid_uid, r.rfid_id) AS rfid_id
     FROM rfid_cards r
     INNER JOIN users u ON u.id = r.user_id
     WHERE (
       UPPER(REGEXP_REPLACE(r.rfid_id, '[^0-9A-Fa-f]', '', 'g')) = $1
       OR UPPER(REGEXP_REPLACE(COALESCE(u.rfid_uid, ''), '[^0-9A-Fa-f]', '', 'g')) = $1
     ) AND r.is_active = TRUE
     LIMIT 1`,
    [normalizedRfid],
  );
  const user = result.rows[0];
  await logRfidScan(normalizedRfid, user?.id ?? null, user ? "Verified" : "Rejected");
  if (!user) throw new AppError("RFID card not registered.", "RFID_NOT_MATCHED");
  const profile = mapUser(user);
  return { user: profile, borrowedBooks: await getBorrowedBooks(profile.id) };
}

export async function findUserByRfid(rfidId: string): Promise<UserProfile | null> {
  return findUserByRfidUid(rfidId);
}

export async function findUserByRfidUid(rfidId: string): Promise<UserProfile | null> {
  const normalizedRfid = normalizeRfid(rfidId);
  const result = await query<UserRow>(
    `SELECT u.*, COALESCE(u.rfid_uid, r.rfid_id) AS rfid_id
     FROM users u
     LEFT JOIN rfid_cards r ON r.user_id = u.id AND r.is_active = TRUE
     WHERE (
       UPPER(REGEXP_REPLACE(COALESCE(u.rfid_uid, ''), '[^0-9A-Fa-f]', '', 'g')) = $1
       OR UPPER(REGEXP_REPLACE(COALESCE(r.rfid_id, ''), '[^0-9A-Fa-f]', '', 'g')) = $1
     )
     LIMIT 1`,
    [normalizedRfid],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function createRfidScanSessionForUser(userId: string) {
  const user = await getUserById(userId);
  const normalizedUid = normalizeRfid(user.rfidId ?? "");
  const sessionId = `rfidsession-${randomUUID()}`;

  await query(
    `UPDATE rfid_scan_sessions
     SET status = 'expired',
         message = 'RFID scan expired. Please try again.'
     WHERE user_id = $1 AND status = 'waiting'`,
    [user.id],
  );
  await query(
    `INSERT INTO rfid_scan_sessions
       (id, user_id, expected_uid, normalized_uid, status, message, expires_at)
     VALUES ($1, $2, $3, $4, 'waiting', 'Waiting for RFID card...', NOW() + INTERVAL '60 seconds')`,
    [sessionId, user.id, user.rfidId ?? null, normalizedUid || null],
  );

  return {
    ok: true,
    sessionId,
    status: "waiting" as const,
    message: "Waiting for RFID card...",
  };
}

export async function getRfidScanSessionStatus(sessionId: string, currentUserId: string) {
  await expireWaitingRfidSession(sessionId, currentUserId);
  const result = await query<RfidScanSessionRow>(
    `SELECT *
     FROM rfid_scan_sessions
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [sessionId, currentUserId],
  );
  const session = result.rows[0];
  if (!session) {
    throw new AppError("RFID scan session not found.", "RFID_SESSION_NOT_FOUND");
  }

  return {
    ok: true,
    status: session.status as RfidScanStatus,
    message: session.message,
    openBookScanner: session.status === "verified",
    normalizedUid: session.normalized_uid,
  };
}

export async function cancelRfidScanSession(sessionId: string, currentUserId: string) {
  await query(
    `UPDATE rfid_scan_sessions
     SET status = 'expired',
         message = 'RFID scan cancelled.'
     WHERE id = $1 AND user_id = $2 AND status = 'waiting'`,
    [sessionId, currentUserId],
  );
  return { ok: true, status: "expired" as const, message: "RFID scan cancelled." };
}

export async function getVerifiedRfidBookScanSession(userId: string) {
  const result = await query<RfidScanSessionRow>(
    `SELECT *
     FROM rfid_scan_sessions
     WHERE user_id = $1
       AND status = 'verified'
       AND verified_at IS NOT NULL
       AND verified_at > NOW() - INTERVAL '5 minutes'
     ORDER BY verified_at DESC
     LIMIT 1`,
    [userId],
  );
  const session = result.rows[0];
  if (!session) {
    throw new AppError("Please verify RFID first.", "RFID_VERIFICATION_REQUIRED");
  }

  return {
    ok: true,
    user: await getUserById(userId),
    session: {
      id: session.id,
      normalizedUid: session.normalized_uid,
      verifiedAt: session.verified_at,
    },
  };
}

export async function receiveHardwareRfidScan(input: {
  uid?: string;
  normalizedUid?: string;
  deviceId?: string;
}) {
  const uid = (input.uid || input.normalizedUid || "").trim();
  const normalizedUid = normalizeRfid(input.normalizedUid || uid);
  const deviceId = input.deviceId?.trim() || null;
  if (!normalizedUid) {
    throw new AppError("RFID UID is required.", "RFID_UID_REQUIRED");
  }

  const user = await findUserByRfidUid(normalizedUid);
  if (!user) {
    await insertRfidHardwareLog({
      uid,
      normalizedUid,
      deviceId,
      userId: null,
      result: "unknown_card",
      message: "RFID card not assigned to any student",
    });
    await failLatestWaitingRfidSession(
      "RFID card not assigned to any student",
      normalizedUid,
      deviceId,
    );
    return {
      ok: false,
      status: "unknown_card" as const,
      message: "RFID card not assigned to any student",
      normalizedUid,
    };
  }

  const session = await getLatestWaitingRfidSession(user.id);
  if (session) {
    await query(
      `UPDATE rfid_scan_sessions
       SET status = 'verified',
           verified_at = NOW(),
           message = 'RFID verified',
           device_id = $3,
           normalized_uid = $4
       WHERE id = $1 AND user_id = $2`,
      [session.id, user.id, deviceId, normalizedUid],
    );
    await insertRfidHardwareLog({
      uid,
      normalizedUid,
      deviceId,
      userId: user.id,
      result: "verified",
      message: "RFID verified",
    });
    return {
      ok: true,
      status: "verified" as const,
      message: "RFID verified",
      normalizedUid,
    };
  }

  const mismatchedSession = await getLatestWaitingRfidSessionForOtherUser(user.id);
  if (mismatchedSession) {
    await query(
      `UPDATE rfid_scan_sessions
       SET status = 'failed',
           message = 'RFID card belongs to another student',
           device_id = $2,
           normalized_uid = $3
       WHERE id = $1`,
      [mismatchedSession.id, deviceId, normalizedUid],
    );
  }

  await insertRfidHardwareLog({
    uid,
    normalizedUid,
    deviceId,
    userId: user.id,
    result: "user_found_no_waiting_session",
    message: "RFID user found, but no active scan session",
  });
  return {
    ok: true,
    status: "user_found_no_waiting_session" as const,
    message: "RFID user found, but no active scan session",
    normalizedUid,
  };
}

export async function getBooks(): Promise<Book[]> {
  const result = await query<BookRow>(`SELECT * FROM books ORDER BY created_at DESC, title ASC`);
  return result.rows.map(mapBook);
}

export async function getBook(bookId: string): Promise<Book> {
  const result = await query<BookRow>(
    `SELECT * FROM books WHERE id = $1 OR qr_value = $1 LIMIT 1`,
    [bookId],
  );
  const book = result.rows[0];
  if (!book) throw new AppError("Book not found.", "BOOK_NOT_FOUND");
  return mapBook(book);
}

export async function scanBookByQr(qrValue: string, userId?: string): Promise<Book> {
  const book = await getBook(qrValue);
  await query(
    `INSERT INTO qr_logs (id, qr_value, book_id, user_id)
     VALUES ($1, $2, $3, $4)`,
    [`qrlog-${randomUUID()}`, qrValue, book.id, userId ?? null],
  );
  return book;
}

export async function saveBook(input: {
  id: string;
  isbn: string;
  title: string;
  author: string;
  department: Department;
  status?: BookStatus;
}) {
  const qrValue = `BN-QR-${input.id}`;
  await query(
    `INSERT INTO books (id, book_id, isbn, title, author, department, status, qr_value)
     VALUES ($1, $1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       book_id = EXCLUDED.book_id,
       isbn = EXCLUDED.isbn,
       title = EXCLUDED.title,
       author = EXCLUDED.author,
       department = EXCLUDED.department,
       status = EXCLUDED.status,
       qr_value = EXCLUDED.qr_value`,
    [
      input.id,
      input.isbn,
      input.title,
      input.author,
      input.department,
      input.status ?? "Available",
      qrValue,
    ],
  );
  return getBook(input.id);
}

export async function deleteBook(bookId: string) {
  await query(`DELETE FROM books WHERE id = $1`, [bookId]);
}

export async function recordBookAction(input: {
  userId: string;
  rfidId: string;
  bookId: string;
  action: Exclude<TransactionStatus, "Overdue">;
}) {
  const user = await getUserById(input.userId);
  if (normalizeRfid(user.rfidId ?? "") !== normalizeRfid(input.rfidId)) {
    throw new AppError("RFID not matched.", "RFID_NOT_MATCHED");
  }
  const book = await getBook(input.bookId);
  const id = `txn-${randomUUID()}`;
  const dueDate = input.action === "Borrowed" ? addDays(new Date(), 14) : null;
  const fineAmount = input.action === "Returned" && book.dueDate ? calculateFine(book.dueDate) : 0;

  if (input.action === "Borrowed" && book.status !== "Available") {
    throw new AppError("Book is not available.", "BOOK_NOT_AVAILABLE");
  }
  if (input.action === "Returned" && book.borrowedBy !== user.id) {
    throw new AppError("Book is not borrowed by this student.", "BOOK_RETURN_NOT_ALLOWED");
  }

  const client = await getPool().connect();
  try {
    await ensureSchema();
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO transactions
         (id, user_id, rfid_id, book_id, transaction_type, status, due_date, return_date, fine_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        user.id,
        input.rfidId,
        book.id,
        input.action === "Borrowed" ? "borrow" : "return",
        input.action,
        dueDate,
        input.action === "Returned" ? toDateOnly(new Date()) : null,
        fineAmount,
      ],
    );
    await client.query(
      `UPDATE books
       SET status = $1, borrowed_by = $2, due_date = $3
       WHERE id = $4`,
      [
        input.action === "Borrowed" ? "Borrowed" : "Available",
        input.action === "Borrowed" ? user.id : null,
        input.action === "Borrowed" ? dueDate : null,
        book.id,
      ],
    );
    if (fineAmount > 0) {
      await client.query(
        `INSERT INTO fines (id, user_id, transaction_id, amount, reason, status)
         VALUES ($1, $2, $3, $4, $5, 'Pending')`,
        [`fine-${randomUUID()}`, user.id, id, fineAmount, "Overdue return"],
      );
      await client.query(
        `INSERT INTO payments (id, user_id, label, amount, status)
         VALUES ($1, $2, $3, $4, 'Pending')`,
        [`pay-${randomUUID()}`, user.id, `Overdue fine for ${book.title}`, fineAmount],
      );
    }
    await client.query(
      `INSERT INTO qr_logs (id, qr_value, book_id, user_id)
       VALUES ($1, $2, $3, $4)`,
      [`qrlog-${randomUUID()}`, book.qrValue, book.id, user.id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw new AppError(
      `Transaction save failed: ${(error as Error).message}`,
      "TRANSACTION_SAVE_FAILED",
    );
  } finally {
    client.release();
  }

  return getTransaction(id);
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const [books, users, transactions] = await Promise.all([
    query<{ total: string; available: string; borrowed: string }>(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'Available') AS available,
              COUNT(*) FILTER (WHERE status = 'Borrowed') AS borrowed
       FROM books`,
    ),
    query<{ total: string }>(`SELECT COUNT(*) AS total FROM users`),
    query<{ total: string; overdue: string; pending_fines: string; paid_amount: string }>(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'Overdue' OR (due_date < CURRENT_DATE AND return_date IS NULL)) AS overdue,
              COALESCE((SELECT SUM(amount) FROM fines WHERE status = 'Pending'), 0) AS pending_fines,
              COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'Paid'), 0) AS paid_amount
       FROM transactions`,
    ),
  ]);
  const recent = await getTransactions();
  return {
    totalBooks: Number(books.rows[0]?.total ?? 0),
    availableBooks: Number(books.rows[0]?.available ?? 0),
    borrowedBooks: Number(books.rows[0]?.borrowed ?? 0),
    overdueBooks: Number(transactions.rows[0]?.overdue ?? 0),
    totalUsers: Number(users.rows[0]?.total ?? 0),
    totalTransactions: Number(transactions.rows[0]?.total ?? 0),
    pendingFines: Number(transactions.rows[0]?.pending_fines ?? 0),
    paidAmount: Number(transactions.rows[0]?.paid_amount ?? 0),
    recentRfidScans: recent.slice(0, 5),
    recentBookScans: recent.slice(0, 5),
    recentTransactions: recent.slice(0, 5),
  };
}

export async function getUsers() {
  const result = await query<UserRow>(
    `SELECT u.*, COALESCE(u.rfid_uid, r.rfid_id) AS rfid_id
     FROM users u
     LEFT JOIN rfid_cards r ON r.user_id = u.id AND r.is_active = TRUE
     ORDER BY u.created_at DESC`,
  );
  return Promise.all(
    result.rows.map(async (row) => ({
      ...mapUser(row),
      borrowedBooks: await getBorrowedBooks(row.id),
      fineTotal: (await getFines(row.id)).reduce((sum, fine) => sum + fine.amount, 0),
    })),
  );
}

export async function getTransactions(): Promise<Transaction[]> {
  const result = await query<TransactionRow>(
    `SELECT t.*, u.full_name, u.email, b.title
     FROM transactions t
     INNER JOIN users u ON u.id = t.user_id
     INNER JOIN books b ON b.id = t.book_id
     ORDER BY t.scan_date_time DESC`,
  );
  return result.rows.map(mapTransaction);
}

export async function getPayments(userId?: string): Promise<Payment[]> {
  const result = await query<PaymentRow>(
    `SELECT * FROM payments ${userId ? "WHERE user_id = $1" : ""} ORDER BY payment_date DESC, created_at DESC`,
    userId ? [userId] : [],
  );
  return result.rows.map(mapPayment);
}

export async function markPaymentPaid(paymentId: string) {
  const result = await query<PaymentRow>(
    `UPDATE payments
     SET status = 'Paid', payment_date = CURRENT_DATE
     WHERE id = $1
     RETURNING *`,
    [paymentId],
  );
  const payment = result.rows[0];
  if (!payment) throw new AppError("Payment not found.", "PAYMENT_NOT_FOUND");

  await query(
    `UPDATE fines
     SET status = 'Paid'
     WHERE user_id = $1 AND amount = $2 AND status = 'Pending'`,
    [payment.user_id, payment.amount],
  );
  return mapPayment(payment);
}

export async function getFines(userId?: string): Promise<Fine[]> {
  const result = await query<FineRow>(
    `SELECT * FROM fines ${userId ? "WHERE user_id = $1" : ""} ORDER BY created_at DESC`,
    userId ? [userId] : [],
  );
  return result.rows.map(mapFine);
}

async function getUserById(userId: string): Promise<UserProfile> {
  const result = await query<UserRow>(
    `SELECT u.*, COALESCE(u.rfid_uid, r.rfid_id) AS rfid_id
     FROM users u
     LEFT JOIN rfid_cards r ON r.user_id = u.id AND r.is_active = TRUE
     WHERE u.id = $1
     LIMIT 1`,
    [userId],
  );
  const user = result.rows[0];
  if (!user) throw new AppError("User not found.", "USER_NOT_FOUND");
  return mapUser(user);
}

async function getBorrowedBooks(userId: string): Promise<BorrowedBook[]> {
  const result = await query<BorrowedBookRow>(
    `SELECT b.id AS book_id, b.title, b.author, b.department, t.scan_date_time::date AS borrowed_date,
            COALESCE(b.due_date, t.due_date) AS due_date,
            COALESCE(SUM(f.amount) FILTER (WHERE f.status = 'Pending'), 0) AS fine_amount
     FROM books b
     INNER JOIN transactions t ON t.book_id = b.id AND t.user_id = $1
     LEFT JOIN fines f ON f.transaction_id = t.id
     WHERE b.borrowed_by = $1 AND b.status = 'Borrowed'
     GROUP BY b.id, b.title, b.author, b.department, t.scan_date_time, b.due_date, t.due_date
     ORDER BY COALESCE(b.due_date, t.due_date) ASC`,
    [userId],
  );
  return result.rows.map((row) => ({
    bookId: row.book_id,
    title: row.title,
    author: row.author,
    department: row.department as Department,
    borrowedDate: formatDate(row.borrowed_date),
    dueDate: formatDate(row.due_date),
    fineAmount: Number(row.fine_amount),
  }));
}

async function getTransaction(id: string): Promise<Transaction> {
  const result = await query<TransactionRow>(
    `SELECT t.*, u.full_name, u.email, b.title
     FROM transactions t
     INNER JOIN users u ON u.id = t.user_id
     INNER JOIN books b ON b.id = t.book_id
     WHERE t.id = $1`,
    [id],
  );
  const transaction = result.rows[0];
  if (!transaction) throw new AppError("Transaction save failed.", "TRANSACTION_SAVE_FAILED");
  return mapTransaction(transaction);
}

async function makeNextRfidId() {
  const result = await query<{ count: string }>(`SELECT COUNT(*) AS count FROM rfid_cards`);
  return `RFID-${String(Number(result.rows[0]?.count ?? 0) + 1).padStart(3, "0")}`;
}

async function logRfidScan(rfidId: string, userId: string | null, status: string) {
  const normalizedUid = normalizeRfid(rfidId);
  await query(
    `INSERT INTO rfid_logs
       (id, rfid_uid, uid, normalized_uid, user_id, status, result, message)
     VALUES ($1, $2, $3, $4, $5, $6, $6, $6)`,
    [`rfidlog-${randomUUID()}`, normalizedUid || rfidId, rfidId, normalizedUid, userId, status],
  );
}

function normalizeRfid(value: string) {
  return normalizeRfidUid(value);
}

async function expireWaitingRfidSession(sessionId: string, currentUserId: string) {
  await query(
    `UPDATE rfid_scan_sessions
     SET status = 'expired',
         message = 'RFID scan expired. Please try again.'
     WHERE id = $1
       AND user_id = $2
       AND status = 'waiting'
       AND expires_at <= NOW()`,
    [sessionId, currentUserId],
  );
}

async function getLatestWaitingRfidSession(userId: string) {
  const result = await query<RfidScanSessionRow>(
    `SELECT *
     FROM rfid_scan_sessions
     WHERE user_id = $1
       AND status = 'waiting'
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

async function getLatestWaitingRfidSessionForOtherUser(userId: string) {
  const result = await query<RfidScanSessionRow>(
    `SELECT *
     FROM rfid_scan_sessions
     WHERE user_id <> $1
       AND status = 'waiting'
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

async function failLatestWaitingRfidSession(
  message: string,
  normalizedUid: string,
  deviceId: string | null,
) {
  const result = await query<RfidScanSessionRow>(
    `SELECT *
     FROM rfid_scan_sessions
     WHERE status = 'waiting'
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
  );
  const session = result.rows[0];
  if (!session) return;

  await query(
    `UPDATE rfid_scan_sessions
     SET status = 'failed',
         message = $2,
         normalized_uid = $3,
         device_id = $4
     WHERE id = $1`,
    [session.id, message, normalizedUid, deviceId],
  );
}

async function insertRfidHardwareLog(input: {
  uid: string;
  normalizedUid: string;
  deviceId: string | null;
  userId: string | null;
  result: string;
  message: string;
}) {
  await query(
    `INSERT INTO rfid_logs
       (id, rfid_uid, uid, normalized_uid, device_id, user_id, status, result, message)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)`,
    [
      `rfidlog-${randomUUID()}`,
      input.normalizedUid,
      input.uid || input.normalizedUid,
      input.normalizedUid,
      input.deviceId,
      input.userId,
      input.result,
      input.message,
    ],
  );
}

async function seedPrototypeData() {
  const pool = getPool();
  const userCount = await pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM users`);
  if (Number(userCount.rows[0]?.count ?? 0) === 0) {
    const users = [
      ["user-rfid-001", "Ananya Sharma", "ananya@booknest.edu", "BN-CSE-001", "CSE", "RFID-001"],
      ["user-rfid-002", "Rahul Nair", "rahul@booknest.edu", "BN-IT-002", "IT", "RFID-002"],
      ["user-rfid-003", "Meera Joseph", "meera@booknest.edu", "BN-AIDS-003", "AIDS", "RFID-003"],
      ["user-rfid-004", "Kavin Raj", "kavin@booknest.edu", "BN-ECE-004", "ECE", "RFID-004"],
    ] as const;

    for (const [id, fullName, email, registerNumber, department, rfidId] of users) {
      await pool.query(
        `INSERT INTO users
           (id, full_name, email, register_number, department, rfid_uid, role, photo_initials)
         VALUES ($1, $2, $3, $4, $5, $6, 'student', $7)
         ON CONFLICT (id) DO NOTHING`,
        [id, fullName, email, registerNumber, department, rfidId, makeInitials(fullName)],
      );
      await pool.query(
        `INSERT INTO rfid_cards (id, user_id, rfid_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET rfid_id = EXCLUDED.rfid_id, is_active = TRUE`,
        [`rfid-${id}`, id, rfidId],
      );
    }
  }

  const bookCount = await pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM books`);
  if (Number(bookCount.rows[0]?.count ?? 0) === 0) {
    const books = [
      ["BOOK-001", "9781119800361", "Operating System Concepts", "Silberschatz", "CSE"],
      ["BOOK-002", "9780132350884", "Clean Code", "Robert C. Martin", "IT"],
      ["BOOK-003", "9780262046305", "Deep Learning", "Ian Goodfellow", "AIDS"],
      ["BOOK-004", "9780131103627", "The C Programming Language", "Kernighan and Ritchie", "ECE"],
    ] as const;

    for (const [id, isbn, title, author, department] of books) {
      await pool.query(
        `INSERT INTO books (id, book_id, isbn, title, author, department, status, qr_value)
         VALUES ($1, $1, $2, $3, $4, $5, 'Available', $6)
         ON CONFLICT (id) DO NOTHING`,
        [id, isbn, title, author, department, `BN-QR-${id}`],
      );
    }
  }
}

function mapUser(row: UserRow): UserProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    registerNumber: row.register_number,
    department: row.department as Department,
    photoInitials: row.photo_initials,
    rfidId: row.rfid_id,
  };
}

function mapBook(row: BookRow): Book {
  return {
    id: row.id,
    isbn: row.isbn,
    title: row.title,
    author: row.author,
    department: row.department as Department,
    status: row.status as BookStatus,
    qrValue: row.qr_value,
    borrowedBy: row.borrowed_by,
    dueDate: row.due_date ? formatDate(row.due_date) : null,
  };
}

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    studentName: row.full_name,
    studentEmail: row.email,
    rfidId: row.rfid_id,
    bookId: row.book_id,
    bookTitle: row.title,
    status: row.status as TransactionStatus,
    scanDateTime: formatDateTime(row.scan_date_time),
    dueDate: row.due_date ? formatDate(row.due_date) : null,
    returnDate: row.return_date ? formatDate(row.return_date) : null,
  };
}

function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    amount: Number(row.amount),
    date: formatDate(row.payment_date),
    status: row.status as Payment["status"],
  };
}

function mapFine(row: FineRow): Fine {
  return {
    id: row.id,
    userId: row.user_id,
    transactionId: row.transaction_id,
    amount: Number(row.amount),
    reason: row.reason,
    status: row.status as Fine["status"],
    createdAt: formatDateTime(row.created_at),
  };
}

function makeInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "S").concat(parts[1]?.[0] ?? "").toUpperCase();
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return toDateOnly(value);
}

function calculateFine(dueDate: string) {
  const due = new Date(`${dueDate}T00:00:00.000Z`);
  const today = new Date(`${toDateOnly(new Date())}T00:00:00.000Z`);
  const overdueDays = Math.max(
    0,
    Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)),
  );
  return overdueDays;
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value: Date | string | null) {
  if (!value) return "";
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function formatDateTime(value: Date | string) {
  if (value instanceof Date) return value.toISOString().slice(0, 16).replace("T", " ");
  return String(value).replace("T", " ").slice(0, 16);
}

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  register_number: string;
  department: string;
  photo_initials: string;
  rfid_id: string | null;
};

type BookRow = {
  id: string;
  isbn: string;
  title: string;
  author: string;
  department: string;
  status: string;
  qr_value: string;
  borrowed_by: string | null;
  due_date: Date | string | null;
};

type TransactionRow = {
  id: string;
  user_id: string;
  rfid_id: string;
  book_id: string;
  status: string;
  scan_date_time: Date | string;
  due_date: Date | string | null;
  return_date: Date | string | null;
  full_name: string;
  email: string;
  title: string;
};

type PaymentRow = {
  id: string;
  user_id: string;
  label: string;
  amount: string;
  payment_date: Date | string;
  status: string;
};

type FineRow = {
  id: string;
  user_id: string;
  transaction_id: string | null;
  amount: string;
  reason: string;
  status: string;
  created_at: Date | string;
};

type BorrowedBookRow = {
  book_id: string;
  title: string;
  author: string;
  department: string;
  borrowed_date: Date | string;
  due_date: Date | string;
  fine_amount: string;
};

type RfidScanStatus = "waiting" | "verified" | "failed" | "expired";

type RfidScanSessionRow = {
  id: string;
  user_id: string;
  expected_uid: string | null;
  normalized_uid: string | null;
  status: string;
  message: string;
  device_id: string | null;
  created_at: Date | string;
  expires_at: Date | string;
  verified_at: Date | string | null;
};
