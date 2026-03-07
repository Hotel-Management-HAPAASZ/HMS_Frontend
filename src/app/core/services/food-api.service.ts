import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../app.config';

export interface FoodMenuItem {
  id: number;
  name: string;
  description?: string;
  category?: string;
  price: number;
  available: boolean;
  imageUrl?: string;
}

export interface FoodOrderItemRequest {
  foodItemId: number;
  quantity: number;
}

export interface CheckedInBooking {
  bookingId: number;
  roomNumbers: string[];
  checkInDate: string;
  checkOutDate: string;
}

export interface CreateFoodOrderRequest {
  userId: number;
  items: FoodOrderItemRequest[];
  paymentMethod: 'CARD'; // pay-now MVP
  bookingId?: number; // Optional: if multiple checked-in rooms, customer selects one
}

export interface FoodPaymentResponse {
  paymentId: number;
  orderId: number;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  paidAt?: string;
  message?: string;
}

export interface FoodPaymentVerifyRequest {
  paymentId: number;
  otp: string;
}

export interface FoodOrderLine {
  foodItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface FoodOrder {
  orderId: number;
  bookingId?: number;
  roomNumbers?: string[];
  status: string;
  totalAmount: number;
  expectedDeliveryAt?: string;
  createdAt: string;
  items: FoodOrderLine[];
}

@Injectable({ providedIn: 'root' })
export class FoodApiService {
  constructor(
    private http: HttpClient,
    @Inject(API_BASE_URL) private apiBaseUrl: string
  ) {}

  getMenu(): Observable<FoodMenuItem[]> {
    return this.http.get<FoodMenuItem[]>(`${this.apiBaseUrl}/food/menu`);
  }

  getCheckedInBookings(userId: number): Observable<CheckedInBooking[]> {
    return this.http.get<CheckedInBooking[]>(`${this.apiBaseUrl}/food/checked-in-bookings`, {
      params: { userId }
    });
  }

  createOrder(req: CreateFoodOrderRequest): Observable<FoodPaymentResponse> {
    return this.http.post<FoodPaymentResponse>(`${this.apiBaseUrl}/food/orders`, req);
  }

  verifyPayment(req: FoodPaymentVerifyRequest): Observable<FoodPaymentResponse> {
    return this.http.post<FoodPaymentResponse>(`${this.apiBaseUrl}/food/payments/verify`, req);
  }

  myOrders(userId: number): Observable<FoodOrder[]> {
    return this.http.get<FoodOrder[]>(`${this.apiBaseUrl}/food/orders/my`, { params: { userId } });
  }

  // Menu management (FOOD_STAFF / ADMIN)
  createMenuItem(item: FoodMenuItem): Observable<FoodMenuItem> {
    return this.http.post<FoodMenuItem>(`${this.apiBaseUrl}/food/menu`, item);
  }

  updateMenuItem(id: number, item: FoodMenuItem): Observable<FoodMenuItem> {
    return this.http.put<FoodMenuItem>(`${this.apiBaseUrl}/food/menu/${id}`, item);
  }

  deleteMenuItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/food/menu/${id}`);
  }

  // Food staff: pending orders
  getPendingOrders(): Observable<FoodOrder[]> {
    return this.http.get<FoodOrder[]>(`${this.apiBaseUrl}/food/orders/pending`);
  }

  // Food staff: update order status
  updateOrderStatus(orderId: number, status: string): Observable<FoodOrder> {
    return this.http.patch<FoodOrder>(`${this.apiBaseUrl}/food/orders/${orderId}/status`, null, {
      params: { status }
    });
  }
}


