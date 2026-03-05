export type Role = 'CUSTOMER' | 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role: Role;
  active: boolean;
}

export interface Room {
  id: string;
  roomNumber:string;
  name: string;
  type: 'STANDARD' | 'DELUXE' | 'SUITE';
  pricePerNight: number;
  floor:number;
  maxGuests: number;
  amenities: string[];
  active: boolean;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'PAID';

export interface Booking {
  id: string;
  userId: string;
  roomId: string;
  fromDate: string; // ISO
  toDate: string;   // ISO
  guests: number;
  nights: number;
  totalAmount: number;
  status: BookingStatus;
  createdAt: string; // ISO
}

export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface Complaint {
  id?: number | string;
  referenceNumber: string;
  bookingId?: number;
  title: string;
  description: string;
  category: 'ROOM_ISSUE' | 'SERVICE_ISSUE' | 'BILLING_ISSUE' | 'OTHER';
  contactPreference: 'CALL' | 'EMAIL';
  status: ComplaintStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  expectedResolutionDate?: string;
  createdAt: string;
  updatedAt: string;
}
export interface Invoice {
  invoiceNo: string;
  bookingId: string;
  customerName: string;
  email: string;
  roomName: string;
  fromDate: string;
  toDate: string;
  nights: number;
  amount: number;
  issuedAt: string;
}



export interface HousekeepingTask {
  id: string;
  title: string;
  description: string;
  assignedToUserId?: string; // staff id
  status: 'OPEN' | 'DONE';
  createdAt: string;
}
export interface AdminBookingRow {
  id: number;
  userId?: number;
  roomId?: number;
  roomName?: string;
  customerName?: string;

  checkInDate?: string;   // ISO date (yyyy-MM-dd)
  checkOutDate?: string;  // ISO date (yyyy-MM-dd)

  numberOfGuests?: number;
  totalAmount?: number;

  status?: 'CREATED' | 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'CHECKED_IN' | 'CHECKED_OUT';

  createdAt?: string;     // ISO timestamp
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;       // 1-based (your backend returns 1-based)
  size: number;
  total: number;      // total elements
}
``