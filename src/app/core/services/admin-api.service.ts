import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';

// ---- DTOs ----

export interface AdminDashboardResponse {
  totalRooms?: number;
  activeRooms?: number;
  totalBookings?: number;
  confirmedBookings?: number;
  cancelledBookings?: number;
  openComplaints?: number;
  totalCustomers?: number;
  totalStaff?: number;
  occupancyRate?: number;
  revenue?: number;
  todayCheckins?: number;
  [key: string]: any; // allow extra fields from the backend
}

export interface BillResponse {
  id: number;
  userId: number;
  bookingId?: number;
  amount: number;
  status?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface CreateBillRequest {
  userId: number;
  bookingId?: number;
  amount: number;
  description?: string;
  [key: string]: any;
}

export interface UpdateBillRequest {
  amount?: number;
  status?: string;
  description?: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly base = 'http://localhost:8080/api/admin';

  constructor(private http: HttpClient) {}

  // ---- Dashboard ----

  /** GET /api/admin/dashboard */
  getDashboard(): Observable<AdminDashboardResponse> {
    return this.http.get<AdminDashboardResponse>(`${this.base}/dashboard`);
  }

  // ---- Bills ----

  /** GET /api/admin/bills */
  getAllBills(): Observable<BillResponse[]> {
    return this.http.get<BillResponse[]>(`${this.base}/bills`);
  }

  /** GET /api/admin/bills/search?userId= */
  searchBills(userId?: number): Observable<BillResponse[]> {
    let params = new HttpParams();
    if (userId !== undefined) params = params.set('userId', String(userId));
    return this.http.get<BillResponse[]>(`${this.base}/bills/search`, { params });
  }

  /** POST /api/admin/bills */
  createBill(body: CreateBillRequest): Observable<BillResponse> {
    return this.http.post<BillResponse>(`${this.base}/bills`, body);
  }

  /** PUT /api/admin/bills/{billId} */
  updateBill(billId: number, body: UpdateBillRequest): Observable<BillResponse> {
    return this.http.put<BillResponse>(`${this.base}/bills/${billId}`, body);
  }

  // ---- Complaint Management ----

  /**
   * PUT /api/admin/complaints/{complaintId}/assign?staffId=
   * Assigns a complaint to a staff member.
   */
  assignComplaint(complaintId: number, staffId: number): Observable<string> {
    const params = new HttpParams().set('staffId', String(staffId));
    return this.http.put<string>(
      `${this.base}/complaints/${complaintId}/assign`,
      null,
      { params, responseType: 'text' as 'json' }
    );
  }

  /**
   * PUT /api/admin/complaints/{complaintId}/status?status=
   * Updates complaint status (admin override).
   */
  updateComplaintStatus(
    complaintId: number,
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  ): Observable<string> {
    const params = new HttpParams().set('status', status);
    return this.http.put<string>(
      `${this.base}/complaints/${complaintId}/status`,
      null,
      { params, responseType: 'text' as 'json' }
    );
  }
}
