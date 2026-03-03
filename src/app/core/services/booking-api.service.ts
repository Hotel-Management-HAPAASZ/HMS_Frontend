// src/app/core/services/booking-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
/** ===== Types aligned with your Spring controller ===== */

export type BookingStatus = '' | 'CONFIRMED' | 'PENDING' | 'CANCELLED';

export interface BookingRequest {
  userId: number;
  roomIds: number[];
  checkIn: string;       // 'YYYY-MM-DD'
  checkOut: string;      // 'YYYY-MM-DD'
  numberOfGuests: number;
  adults: number;
  children: number;
}

export interface BookingResponse {
  bookingId: number;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  status: string;
  rooms: { roomId: number; roomPrice: number }[];
}

export interface AdminBookingRow {
  id: number;
  userId: number;
  roomId?: number;         // or nested: (row as any).room?.id
  status: BookingStatus | string;
  checkInDate?: string;    // ISO or 'YYYY-MM-DD'
  checkOutDate?: string;
  createdAt?: string;
  totalAmount?: number;
  guests?: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  page: number;            // 0-based
  size: number;
  totalElements: number;
  totalPages: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface StatusUpdateRequest {
  status: BookingStatus;
}
export interface StatusUpdateResponse {
  id: number;
  status: string;
}

export interface ModifyBookingRequest {
  checkIn?: string;        // 'YYYY-MM-DD'
  checkOut?: string;       // 'YYYY-MM-DD'
  numberOfGuests?: number;
  roomIds?: number[];
}
export interface ModifyBookingResponse {
  id: number;
  status: string;
  updatedFields?: string[];
}

export interface UserBookingHistoryResponse {
  bookingId: number;
  userName: string;
  roomName: string;
  status: string;
  checkIn: string;
  CheckOut: string;
  amount: number;
}

/** ===== Service ===== */

@Injectable({ providedIn: 'root' })
export class BookingApiService {
  private readonly baseUrl = 'http://localhost:8080/api/bookings'; // Spring Boot port

  constructor(private http: HttpClient) {}

  /** POST /api/bookings/check */
  createBooking(req: BookingRequest): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.baseUrl}/check`, req);
  }

  /** GET /api/bookings/{id} */
  getOne(bookingId: number): Observable<AdminBookingRow> {
    return this.http.get<AdminBookingRow>(`${this.baseUrl}/${bookingId}`);
  }

  /** GET /api/bookings?query&status&from&to&page&pageSize&sortBy&sortDir */

list(params: {
  query?: string;
  status?: BookingStatus;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}): Observable<PaginatedResponse<AdminBookingRow>> {
  let hp = new HttpParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== '') hp = hp.set(k, String(v));
  });

  return this.http.get<any>(this.baseUrl, { params: hp }).pipe(
    map(res => {
      // Case A: Backend returns expected shape (content/totalElements etc.)
      if (Array.isArray(res?.content)) {
        return res as PaginatedResponse<AdminBookingRow>;
      }

      // Case B: Backend returns { data, page, pageSize, total }
      if (Array.isArray(res?.data)) {
        const page = Number(res.page ?? 0);            // looks 1-based in your sample
        const size = Number(res.pageSize ?? 10);
        const total = Number(res.total ?? res.totalElements ?? res.count ?? res.length ?? 0);

        return {
          content: res.data as AdminBookingRow[],
          page: Math.max(0, page - 1),                 // convert to 0-based
          size,
          totalElements: total,
          totalPages: size > 0 ? Math.ceil(total / size) : 0,
          sortBy: (res as any).sortBy,
          sortDir: (res as any).sortDir
        } as PaginatedResponse<AdminBookingRow>;
      }

      // Fallback: try to coerce if server returns raw array
      if (Array.isArray(res)) {
        return {
          content: res as AdminBookingRow[],
          page: 0,
          size: res.length,
          totalElements: res.length,
          totalPages: 1
        } as PaginatedResponse<AdminBookingRow>;
      }

      // Unknown shape
      return {
        content: [],
        page: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0
      } as PaginatedResponse<AdminBookingRow>;
    })
  );
}


  /** PATCH /api/bookings/{id}/status */
  setStatus(bookingId: number, status: BookingStatus) {
    const body: StatusUpdateRequest = { status };
    return this.http.patch<StatusUpdateResponse>(`${this.baseUrl}/${bookingId}/status`, body);
  }

  /** DELETE /api/bookings/{id}/cancel */
  cancel(bookingId: number) {
    return this.http.delete(`${this.baseUrl}/${bookingId}/cancel`, { responseType: 'text' });
  }

  /** PATCH /api/bookings/{id}/modify */
  modify(bookingId: number, patch: ModifyBookingRequest) {
    return this.http.patch<ModifyBookingResponse>(`${this.baseUrl}/${bookingId}/modify`, patch);
  }

  /** GET /api/bookings/user/{userId}/history */
  userHistory(userId: number) {
    return this.http.get<UserBookingHistoryResponse[]>(`${this.baseUrl}/user/${userId}/history`);
  }

  /** GET /api/bookings/admin/history */
  adminHistory() {
    return this.http.get<UserBookingHistoryResponse[]>(`${this.baseUrl}/admin/history`);
  }
}

/** ===== Utilities ===== */
export function toDateOnly(isoLike: string): string {
  if (!isoLike) throw new Error('Invalid date: ' + isoLike);
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoLike)) return isoLike;
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date: ' + isoLike);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}