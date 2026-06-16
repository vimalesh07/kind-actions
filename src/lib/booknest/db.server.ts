import process from "node:process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";

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

let pool: pg.Pool | undefined;
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

  pool ??= new Pool({
    connectionString: stripSslMode(databaseUrl),
    ssl: { rejectUnauthorized: false },
  });

  return pool;
}

function stripSslMode(databaseUrl: string) {
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");
  return url.toString();
}

async function ensureSchema() {
  schemaReady ??= (async () => {
    const schema = await readFile(
      path.join(process.cwd(), "src", "lib", "booknest", "schema.sql"),
      "utf8",
    );
    await getPool().query(schema);
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
  email: string;
  registerNumber: string;
  department: Department;
}): Promise<UserProfile> {
  const result = await query<UserRow>(
    `UPDATE users
     SET full_name = $2,
         email = $3,
         register_number = $4,
         department = $5,
         photo_initials = $6
     WHERE id = $1
     RETURNING id, full_name, email, register_number, department, photo_initials, NULL::text AS rfid_id`,
    [
      input.userId,
      input.fullName.trim(),
      input.email.trim(),
      input.registerNumber.trim(),
      input.department,
      makeInitials(input.fullName),
    ],
  );

  if (!result.rows[0]) throw new AppError("User not found.", "USER_NOT_FOUND");
  return getUserById(input.userId);
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
  const result = await query<UserRow>(
    `SELECT u.*, COALESCE(u.rfid_uid, r.rfid_id) AS rfid_id
     FROM rfid_cards r
     INNER JOIN users u ON u.id = r.user_id
     WHERE (r.rfid_id = $1 OR u.rfid_uid = $1) AND r.is_active = TRUE
     LIMIT 1`,
    [rfidId],
  );
  const user = result.rows[0];
  await logRfidScan(rfidId, user?.id ?? null, user ? "Verified" : "Rejected");
  if (!user) throw new AppError("RFID card not registered.", "RFID_NOT_MATCHED");
  const profile = mapUser(user);
  return { user: profile, borrowedBooks: await getBorrowedBooks(profile.id) };
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
  if (user.rfidId !== input.rfidId) throw new AppError("RFID not matched.", "RFID_NOT_MATCHED");
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
  await query(
    `INSERT INTO rfid_logs (id, rfid_uid, user_id, status)
     VALUES ($1, $2, $3, $4)`,
    [`rfidlog-${randomUUID()}`, rfidId, userId, status],
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
