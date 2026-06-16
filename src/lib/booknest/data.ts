export type Department = "CSE" | "IT" | "AIDS" | "ECE" | "EEE" | "Mechanical" | "Civil";
export type BookStatus = "Available" | "Borrowed";
export type TransactionStatus = "Borrowed" | "Returned" | "Overdue";
export type PaymentStatus = "Paid" | "Pending";
export type FineStatus = "Paid" | "Pending";

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  registerNumber: string;
  department: Department;
  photoInitials: string;
  rfidId: string | null;
}

export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  department: Department;
  status: BookStatus;
  qrValue: string;
  borrowedBy?: string | null;
  dueDate?: string | null;
}

export interface BorrowedBook {
  bookId: string;
  title: string;
  author: string;
  department: Department;
  borrowedDate: string;
  dueDate: string;
  fineAmount: number;
}

export interface Payment {
  id: string;
  userId: string;
  label: string;
  amount: number;
  date: string;
  status: PaymentStatus;
}

export interface Fine {
  id: string;
  userId: string;
  transactionId: string | null;
  amount: number;
  reason: string;
  status: FineStatus;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  rfidId: string;
  bookId: string;
  bookTitle: string;
  status: TransactionStatus;
  scanDateTime: string;
  dueDate?: string | null;
  returnDate?: string | null;
}

export interface RfidVerification {
  user: UserProfile;
  borrowedBooks: BorrowedBook[];
}

export interface UserDashboard {
  user: UserProfile;
  borrowedBooks: BorrowedBook[];
  payments: Payment[];
  fines: Fine[];
}

export interface AdminDashboard {
  totalBooks: number;
  availableBooks: number;
  borrowedBooks: number;
  overdueBooks: number;
  totalUsers: number;
  totalTransactions: number;
  pendingFines: number;
  paidAmount: number;
  recentRfidScans: Transaction[];
  recentBookScans: Transaction[];
  recentTransactions: Transaction[];
}

export const departments: Department[] = ["CSE", "IT", "AIDS", "ECE", "EEE", "Mechanical", "Civil"];
