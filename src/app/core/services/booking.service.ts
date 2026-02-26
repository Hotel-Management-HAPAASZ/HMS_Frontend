// src/app/core/services/booking.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const API_BASE = 'http://localhost:8080/api/bookings';

export type BookingRow = {
  id: number | string;
  roomId: string | number | null;
  fromDate: string;
  toDate: string;
  totalAmount: number;
  status: string;
  guests?: number;
};

export type ModifyBookingRequestDto = {
  roomIds: number[];
  checkIn: string;
  checkOut: string;
  numberOfGuests: number;
  adults: number;
  children: number;
};

export type ModifyBookingResponseDto = {
  message: string;
  amountDifference: number | null;
  paymentId: number | null;
};

@Injectable({ providedIn: 'root' })
export class BookingService {
  private userBookings = signal<BookingRow[]>([]);
  private oneById = signal<Record<string, BookingRow>>({});

  constructor(private http: HttpClient) {}

  /** Normalize id to non-empty string, or return '' if invalid */
  private normId(id: string | number | null | undefined): string {
    const s = id == null ? '' : String(id).trim();
    return s;
  }

  /* ----------------- History ----------------- */

  loadForUser(userId: number | string | null) {
    const idStr = this.normId(userId);
    if (!idStr) return;
    this.http.get<any[]>(`${API_BASE}/user/${idStr}/history`)
      .subscribe({
        next: (res) => {
          const mapped = (res ?? []).map((b: any) => this.mapHistoryItem(b));
          this.userBookings.set(mapped);
        },
        error: (e) => {
          console.error('[BookingService] loadForUser failed', e);
          this.userBookings.set([]);
        }
      });
  }

  listByUser(userId: number | string | null) {
    if (this.userBookings().length === 0) {
      this.loadForUser(userId);
    }
    return this.userBookings();
  }

  /* ----------------- Single booking ----------------- */

  loadOne(bookingId: string | number | null) {
    const idStr = this.normId(bookingId);
    if (!idStr) return;
    this.http.get<any>(`${API_BASE}/${idStr}`).subscribe({
      next: (row) => {
        const mapped: BookingRow = {
          id: row.id,
          roomId: row.roomId ?? null,
          fromDate: row.checkInDate,
          toDate: row.checkOutDate,
          totalAmount: row.totalAmount,
          status: row.status,
          guests: row.numberOfGuests
        };
        this.oneById.set({ ...this.oneById(), [idStr]: mapped });

        const patched = this.userBookings().map(b =>
          String(b.id) === idStr ? { ...b, ...mapped } : b
        );
        this.userBookings.set(patched);
      },
      error: (e) => console.error('[BookingService] loadOne failed', e)
    });
  }

  byId(bookingId: string | number | null): BookingRow | undefined {
    const idStr = this.normId(bookingId);
    if (!idStr) return undefined;
    return this.oneById()[idStr];
  }

  /* ----------------- Modify (PATCH) ----------------- */

  modifyBooking(bookingId: string | number | null, body: ModifyBookingRequestDto) {
    const idStr = this.normId(bookingId);
    if (!idStr) throw new Error('Invalid bookingId');
    return this.http.patch<ModifyBookingResponseDto>(`${API_BASE}/${idStr}/modify`, body);
  }

  /* ----------------- Cancel (DELETE) ----------------- */

  cancelBooking(bookingId: string | number | null) {
    const idStr = this.normId(bookingId);
    if (!idStr) throw new Error('Invalid bookingId');
    return this.http.delete(`${API_BASE}/${idStr}/cancel`, {
      responseType: 'text'
    });
  }
  
list(): BookingRow[] {
  return this.userBookings();
}


  markCancelledLocally(bookingId: string | number | null) {
    const idStr = this.normId(bookingId);
    if (!idStr) return;

    const single = this.oneById()[idStr];
    if (single) {
      this.oneById.set({ ...this.oneById(), [idStr]: { ...single, status: 'CANCELLED' } });
    }

    const updated = this.userBookings().map(b =>
      String(b.id) === idStr ? { ...b, status: 'CANCELLED' } : b
    );
    this.userBookings.set(updated);
  }

  /* ----------------- Utilities ----------------- */

  calcNights(fromISO: string, toISO: string): number {
    if (!fromISO || !toISO) return 0;
    const from = new Date(fromISO);
    const to = new Date(toISO);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0;

    const fromUTC = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
    const toUTC   = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
    const msPerDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.ceil((toUTC - fromUTC) / msPerDay);
    return Math.max(0, diffDays);
  }

  toDateOnly(input: Date | string): string {
    const d = (input instanceof Date) ? input : new Date(input);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /* ----------------- Mapper ----------------- */
  private mapHistoryItem(b: any): BookingRow {
    return {
      id: b.bookingId,
      roomId: b.roomId ?? b.roomTypes?.[0] ?? '',
      fromDate: b.checkIn,
      toDate: b.checkOut,
      totalAmount: b.totalAmount,
      status: b.bookingStatus
    };
  }
}
