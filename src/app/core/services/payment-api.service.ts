import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Matches your backend DTOs (strings for enums to avoid mismatch)
export interface PaymentStartRequest {
  bookingId: number;
  paymentMethod: string; // 'CARD' | 'CASH'
  cardNumber?: string;
  cardHolderName?: string;
  expiry?: string; // e.g., '12/28'
  cvv?: string;
}

export interface PaymentResponse {
  paymentId: number;
  bookingId: number;
  amount: number;

  paymentMethod: string;   // matches PaymentMethod
  paymentStatus: string;   // matches PaymentStatus

  message?: string;
  paidAt?: string;         // from LocalDateTime (ISO)
}

export interface PaymentVerifyRequest {
  paymentId: number;
  otp: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentApiService {
  private readonly baseUrl = 'http://localhost:8080/api/payments';

  constructor(private http: HttpClient) {}

  initiatePayment(req: PaymentStartRequest): Observable<PaymentResponse> {
    console.log('[PAYMENT API] initiate →', req, 'URL:', `${this.baseUrl}/initiate`);
    return this.http.post<PaymentResponse>(`${this.baseUrl}/initiate`, req);
  }

  verifyPayment(req: PaymentVerifyRequest): Observable<PaymentResponse> {
    console.log('[PAYMENT API] verify →', req, 'URL:', `${this.baseUrl}/verify`);
    return this.http.post<PaymentResponse>(`${this.baseUrl}/verify`, req);
  }
}

