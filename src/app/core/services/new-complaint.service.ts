// core/services/new-complaint.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// If you also use your app-level Complaint model elsewhere, you can keep these imports.
// Here, we return either a frontend Complaint (for create) or the API shape for list/track.
import { Complaint, ComplaintStatus } from '../models/models';

/** Backend / UI types */
export type BackendStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type UiPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type ApiPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/** Request payload for Spring createComplaint */
export interface ComplaintRequest {
  bookingId?: number;
  category: 'ROOM_ISSUE' | 'SERVICE_ISSUE' | 'BILLING_ISSUE' | 'OTHER';
  title: string;
  description: string;
  contactPreference: 'CALL' | 'EMAIL';
  priority: ApiPriority;
}

export interface UpdateComplaintRequest {
  title: string;
  description: string;
  contactPreference: 'CALL' | 'EMAIL';
}

export interface StaffActionRequest {
  complaintId: number;
  staffId: number;
  status: BackendStatus;
  actionNote: string;
}

/** Spring Data Page wrapper */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;   // 0-based
  first: boolean;
  last: boolean;
}

@Injectable({ providedIn: 'root' })
export class NewComplaintService {
  private http = inject(HttpClient);

  // Use environment in real apps; hard-coded is OK for local dev
  private readonly baseUrl = 'http://localhost:8080/api/complaint';

  /**
   * Create a complaint
   * POST /api/complaint/create/{userId}
   */
  async create(userId: number, request: ComplaintRequest): Promise<Complaint> {
    const url = `${this.baseUrl}/create/${encodeURIComponent(String(userId))}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return await firstValueFrom(this.http.post<Complaint>(url, request, { headers }));
  }

  /**
   * Update a complaint
   * PUT /api/complaint/update/{reference}?userId={userId}
   */
  async update(reference: string, userId: number, request: UpdateComplaintRequest): Promise<Complaint> {
    const url = `${this.baseUrl}/update/${encodeURIComponent(reference)}`;
    const params = new HttpParams().set('userId', String(userId));
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return await firstValueFrom(this.http.put<Complaint>(url, request, { headers, params }));
  }

  /**
   * Track complaint (single)
   * GET /api/complaint/track/{reference}?userId=
   */
  async track(reference: string, userId: number): Promise<Complaint> {
    const params = new HttpParams().set('userId', String(userId));
    return await firstValueFrom(
      this.http.get<Complaint>(
        `${this.baseUrl}/track/${encodeURIComponent(reference)}`,
        { params }
      )
    );
  }

  /**
   * Paged list of my complaints (optional status)
   * GET /api/complaint/my?userId=&status=&page=&size=
   */
  async myComplaints(options: {
    userId: number;
    status?: BackendStatus;
    page?: number;
    size?: number;
  }): Promise<PageResponse<Complaint>> {
    let params = new HttpParams()
      .set('userId', String(options.userId))
      .set('page', String(options.page ?? 0))
      .set('size', String(options.size ?? 5));

    if (options.status) {
      params = params.set('status', options.status);
    }

    return await firstValueFrom(
      this.http.get<PageResponse<Complaint>>(`${this.baseUrl}/my`, { params })
    );
  }

  /**
   * Confirm Resolution (Closes the complaint)
   * PUT /api/complaint/{reference}/confirm?userId=
   */
  async confirmResolution(reference: string, userId: number): Promise<Complaint> {
    const url = `${this.baseUrl}/${encodeURIComponent(reference)}/confirm`;
    const params = new HttpParams().set('userId', String(userId));
    return await firstValueFrom(this.http.put<Complaint>(url, {}, { params }));
  }

  /**
   * Reopen a Resolved Complaint
   * PUT /api/complaint/{reference}/reopen?userId=
   */
  async reopen(reference: string, userId: number): Promise<Complaint> {
    const url = `${this.baseUrl}/${encodeURIComponent(reference)}/reopen`;
    const params = new HttpParams().set('userId', String(userId));
    return await firstValueFrom(this.http.put<Complaint>(url, {}, { params }));
  }

  // ---------------- Staff/Admin Endpoints ----------------

  /**
   * Fetch All Complaints (Staff Dashboard)
   * GET /api/complaint/all?page=0&size=10&status=OPEN
   */
  async getAllComplaints(options: {
    status?: BackendStatus;
    page?: number;
    size?: number;
  }): Promise<PageResponse<Complaint>> {
    let params = new HttpParams()
      .set('page', String(options.page ?? 0))
      .set('size', String(options.size ?? 10));

    if (options.status) {
      params = params.set('status', options.status);
    }

    return await firstValueFrom(
      this.http.get<PageResponse<Complaint>>(`${this.baseUrl}/all`, { params })
    );
  }

  /**
   * Staff Takes Action / Changes Status
   * POST /api/complaint/action
   */
  async staffAction(request: StaffActionRequest): Promise<Complaint> {
    const url = `${this.baseUrl}/action`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return await firstValueFrom(this.http.post<Complaint>(url, request, { headers }));
  }

  // ---------------- Internals ----------------

  private mapPriority(p: UiPriority): ApiPriority {
    switch (p) {
      case 'Low': return 'LOW';
      case 'Medium': return 'MEDIUM';
      case 'High': return 'HIGH';
      case 'Urgent': return 'URGENT';
      default: return 'LOW';
    }
  }



  /** Normalize errors for snackbars */
  static parseHttpError(err: any, fallback = 'Something went wrong') {
    return (
      err?.error?.message ||
      err?.error?.detail ||
      err?.error?.error?.message ||
      err?.message ||
      fallback
    );
  }
}