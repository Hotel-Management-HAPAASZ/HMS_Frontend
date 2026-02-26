import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PrepareBookingResponse {
  // depends on your RoomController.prepareBooking(...) response.
  available?: boolean;
  // add any fields you return from prepareBooking if needed
}

export interface BookingCreateRequest {
  userId: number;
  roomIds: number[];
  checkIn: string;        // 'YYYY-MM-DD' (LocalDate)
  checkOut: string;       // 'YYYY-MM-DD'
  numberOfGuests: number;
  adults: number;
  children: number;
}

export interface BookingCreateResponse {
  bookingId: number;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  status: string;
  rooms: { roomId: number; roomPrice: number }[];
}

export interface PaymentStartRequest {
  bookingId: number;
  amount: number;
  currency?: string;
}

export interface PaymentResponse {
  paymentId: number;
  status: string;         // e.g., INITIATED, SUCCESS, FAILED
  gatewayOrderId?: string;
  gatewayRedirectUrl?: string;
}

export interface PaymentVerifyRequest {
  bookingId: number;
  paymentId: number;
  signature?: string;
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
}

@Injectable({ providedIn: 'root' })
export class BookingCheckoutApiService {
  constructor(private http: HttpClient) {}

  prepareBooking(params: {
    roomId: number;
    checkInDate: string;   // 'YYYY-MM-DD'
    checkOutDate: string;  // 'YYYY-MM-DD'
    adults: number;
    children: number;
  }): Observable<PrepareBookingResponse> {
    const { roomId, ...rest } = params;
    const p = new HttpParams({ fromObject: { ...rest } });
    return this.http.get<PrepareBookingResponse>(`/api/rooms/${roomId}/prepare-booking`, { params: p });
  }

  createBooking(payload: BookingCreateRequest): Observable<BookingCreateResponse> {
    return this.http.post<BookingCreateResponse>('/api/bookings/check', payload);
  }

  initiatePayment(payload: PaymentStartRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>('/api/payments/initiate', payload);
  }

  verifyPayment(payload: PaymentVerifyRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>('/api/payments/verify', payload);
  }
}