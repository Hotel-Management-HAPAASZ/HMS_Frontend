// src/app/core/services/invoice.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

export interface InvoiceResponse {
  invoiceNumber: string | null;
  bookingId: number;
  hotelName: string;
  hotelAddress: string;
  hotelEmail: string;
  hotelSupportNumber: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  checkInDate: string;    // ISO date (yyyy-MM-dd)
  checkOutDate: string;   // ISO date (yyyy-MM-dd)
  roomTypes: string[];
  numberOfGuests: number;
  adults: number;
  children: number;
  baseAmount: number;
  taxAmount: number;
  serviceCharges: number;
  totalAmount: number;
  paymentMethod: string;
  transactionId: string | null;
  paidAt: string | null;  // ISO datetime, nullable
  rooms: Array<{
    roomId: number;
    roomPrice: number;
    roomType: string;
    maxGuest: number;
  }>;
}

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api/invoices';

  /**
   * Matches your backend: GET /api/invoices/booking/{bookingId}
   */
  getInvoice(bookingId: string | number): Observable<InvoiceResponse> {
    return this.http.get<InvoiceResponse>(`${this.baseUrl}/booking/${bookingId}`);
  }

  /**
   * TEMP-ONLY: Your app references createInvoice in some places.
   * Keep this stub so TypeScript doesn't complain about 'unknown'.
   * Replace with real POST when you have that endpoint.
   */
  createInvoice(body: any): Observable<any> {
    // Example for later:
    // return this.http.post<any>(`${this.baseUrl}`, body);
    return of(body);
  }
}
