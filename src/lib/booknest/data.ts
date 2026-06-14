export type Department = "CSE" | "IT" | "AIDS" | "ECE" | "EEE" | "Mechanical" | "Civil";
export type ShelfSection = "A" | "B" | "C" | "D" | "E";
export type BookStatus = "available" | "borrowed" | "lost" | "maintenance";
export type TxnStatus = "borrowed" | "returned" | "overdue";

export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  department: Department;
  shelfSection: ShelfSection;
  shelfRow: number;
  shelfPosition: number;
  totalCopies: number;
  availableCopies: number;
  status: BookStatus;
  coverUrl?: string;
}

export interface Student {
  id: string;
  rfidUid: string;
  studentCode: string;
  name: string;
  department: Department;
  year: number;
  email: string;
  phone: string;
  walletBalance: number;
  autoPay: boolean;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  studentId: string;
  bookId: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  fineAmount: number;
  finePaid: boolean;
  status: TxnStatus;
}

export const books: Book[] = [
  { id: "b1", isbn: "978-81-203-4962-5", title: "Introduction to Computing", author: "V. Rajaraman", publisher: "PHI Learning", department: "CSE", shelfSection: "B", shelfRow: 3, shelfPosition: 12, totalCopies: 5, availableCopies: 3, status: "available" },
  { id: "b2", isbn: "978-0-13-468599-1", title: "Operating System Concepts", author: "Silberschatz, Galvin, Gagne", publisher: "Wiley", department: "CSE", shelfSection: "B", shelfRow: 1, shelfPosition: 4, totalCopies: 4, availableCopies: 0, status: "borrowed" },
  { id: "b3", isbn: "978-0-262-03384-8", title: "Introduction to Algorithms", author: "Cormen, Leiserson, Rivest, Stein", publisher: "MIT Press", department: "CSE", shelfSection: "A", shelfRow: 2, shelfPosition: 7, totalCopies: 6, availableCopies: 2, status: "available" },
  { id: "b4", isbn: "978-93-5260-352-2", title: "Digital Logic Design", author: "Morris Mano", publisher: "Pearson", department: "ECE", shelfSection: "C", shelfRow: 4, shelfPosition: 1, totalCopies: 3, availableCopies: 1, status: "available" },
  { id: "b5", isbn: "978-0-07-352332-3", title: "Power Electronics", author: "Muhammad H. Rashid", publisher: "Pearson", department: "EEE", shelfSection: "D", shelfRow: 2, shelfPosition: 9, totalCopies: 2, availableCopies: 0, status: "borrowed" },
  { id: "b6", isbn: "978-0-13-707018-9", title: "Engineering Mechanics", author: "R. C. Hibbeler", publisher: "Pearson", department: "Mechanical", shelfSection: "E", shelfRow: 1, shelfPosition: 3, totalCopies: 4, availableCopies: 4, status: "available" },
  { id: "b7", isbn: "978-1-491-91205-8", title: "Hands-On Machine Learning", author: "Aurélien Géron", publisher: "O'Reilly", department: "AIDS", shelfSection: "A", shelfRow: 5, shelfPosition: 2, totalCopies: 5, availableCopies: 2, status: "available" },
  { id: "b8", isbn: "978-0-13-468599-2", title: "Computer Networks", author: "Andrew S. Tanenbaum", publisher: "Pearson", department: "IT", shelfSection: "B", shelfRow: 2, shelfPosition: 8, totalCopies: 3, availableCopies: 1, status: "available" },
  { id: "b9", isbn: "978-93-5260-555-7", title: "Surveying and Levelling", author: "N. N. Basak", publisher: "McGraw Hill", department: "Civil", shelfSection: "E", shelfRow: 3, shelfPosition: 11, totalCopies: 2, availableCopies: 2, status: "available" },
  { id: "b10", isbn: "978-0-13-235088-4", title: "Clean Code", author: "Robert C. Martin", publisher: "Prentice Hall", department: "CSE", shelfSection: "A", shelfRow: 1, shelfPosition: 1, totalCopies: 4, availableCopies: 0, status: "borrowed" },
];

export const students: Student[] = [
  { id: "s1", rfidUid: "04A2B1C3D4", studentCode: "22CSE001", name: "Ananya Sharma", department: "CSE", year: 3, email: "ananya@college.edu", phone: "+91 98765 43210", walletBalance: 120, autoPay: true, isActive: true },
  { id: "s2", rfidUid: "04A2B1C3D5", studentCode: "22AID014", name: "Rohan Mehta", department: "AIDS", year: 2, email: "rohan@college.edu", phone: "+91 98123 45678", walletBalance: 45, autoPay: true, isActive: true },
  { id: "s3", rfidUid: "04A2B1C3D6", studentCode: "21ECE022", name: "Priya Iyer", department: "ECE", year: 4, email: "priya@college.edu", phone: "+91 90123 88899", walletBalance: 8, autoPay: false, isActive: true },
  { id: "s4", rfidUid: "04A2B1C3D7", studentCode: "23MEC005", name: "Karan Patel", department: "Mechanical", year: 1, email: "karan@college.edu", phone: "+91 99887 11223", walletBalance: 200, autoPay: true, isActive: true },
  { id: "s5", rfidUid: "04A2B1C3D8", studentCode: "22IT017", name: "Meera Nair", department: "IT", year: 3, email: "meera@college.edu", phone: "+91 90909 12121", walletBalance: 60, autoPay: false, isActive: true },
  { id: "s6", rfidUid: "04A2B1C3D9", studentCode: "21EEE009", name: "Vikram Singh", department: "EEE", year: 4, email: "vikram@college.edu", phone: "+91 98989 33445", walletBalance: 0, autoPay: false, isActive: true },
];

const today = new Date();
const d = (offset: number) => {
  const x = new Date(today);
  x.setDate(x.getDate() + offset);
  return x.toISOString().slice(0, 10);
};

export const transactions: Transaction[] = [
  { id: "t1", studentId: "s1", bookId: "b2", borrowDate: d(-12), dueDate: d(18), fineAmount: 0, finePaid: false, status: "borrowed" },
  { id: "t2", studentId: "s2", bookId: "b10", borrowDate: d(-35), dueDate: d(-5), fineAmount: 5, finePaid: false, status: "overdue" },
  { id: "t3", studentId: "s3", bookId: "b5", borrowDate: d(-40), dueDate: d(-10), fineAmount: 10, finePaid: false, status: "overdue" },
  { id: "t4", studentId: "s4", bookId: "b3", borrowDate: d(-60), dueDate: d(-30), returnDate: d(-28), fineAmount: 2, finePaid: true, status: "returned" },
  { id: "t5", studentId: "s5", bookId: "b8", borrowDate: d(-5), dueDate: d(25), fineAmount: 0, finePaid: false, status: "borrowed" },
  { id: "t6", studentId: "s1", bookId: "b7", borrowDate: d(-90), dueDate: d(-60), returnDate: d(-62), fineAmount: 0, finePaid: true, status: "returned" },
  { id: "t7", studentId: "s6", bookId: "b2", borrowDate: d(-20), dueDate: d(10), fineAmount: 0, finePaid: false, status: "borrowed" },
  { id: "t8", studentId: "s2", bookId: "b1", borrowDate: d(-3), dueDate: d(27), fineAmount: 0, finePaid: false, status: "borrowed" },
];

export const stats = () => {
  const totalBooks = books.reduce((n, b) => n + b.totalCopies, 0);
  const available = books.reduce((n, b) => n + b.availableCopies, 0);
  const borrowed = totalBooks - available;
  const overdue = transactions.filter(t => t.status === "overdue").length;
  return { totalBooks, available, borrowed, overdue, students: students.length };
};

export const monthlyBorrows = [
  { month: "Jan", borrows: 142 },
  { month: "Feb", borrows: 168 },
  { month: "Mar", borrows: 201 },
  { month: "Apr", borrows: 178 },
  { month: "May", borrows: 89 },
  { month: "Jun", borrows: 235 },
];

export const deptBorrows = [
  { dept: "CSE", borrows: 312 },
  { dept: "IT", borrows: 198 },
  { dept: "AIDS", borrows: 174 },
  { dept: "ECE", borrows: 142 },
  { dept: "EEE", borrows: 88 },
  { dept: "Mech", borrows: 76 },
  { dept: "Civil", borrows: 41 },
];

export const findBook = (id: string) => books.find(b => b.id === id);
export const findStudent = (id: string) => students.find(s => s.id === id);
