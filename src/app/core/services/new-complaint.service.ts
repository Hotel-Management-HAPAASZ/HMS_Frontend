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
interface ComplaintRequest {
  title: string;            // backend accepts 'title' (you map subject -> title)
  description: string;      // message/meta
  category: 'ROOM_ISSUE' | 'SERVICE_ISSUE' | 'BILLING_ISSUE' | 'OTHER';
  priority: ApiPriority;
  bookingId: number;
  contactMethod?: 'Email' | 'Phone';
  email?: string;
  phone?: string;
}

/** Response payload (ComplaintResponse) from Spring */
export interface ComplaintApiResponse {
  id: number;
  complaintId: string;
  title?: string;
  subject?: string;                // (you set subject=title server-side for convenience)
  description?: string;
  status: BackendStatus | string;
  category?: string;
  priority?: string;
  createdAt?: string;              // ISO
  updatedAt?: string | null;       // ISO
  submissionDate?: string;         // optional older field
  expectedResolutionDate?: string; // optional older field
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
  async create(
    userId: number,
    subject: string,
    message: string,
    extras: {
      category: string;                 // UI value; will be mapped to backend enum
      priority: UiPriority;             // UI casing; will be mapped to API enum
      bookingId: number;
      contactMethod?: 'Email' | 'Phone';
      email?: string;
      phone?: string;
    }
  ): Promise<Complaint> {
    if (!extras?.category) throw new Error('category is required');
    if (!extras?.priority) throw new Error('priority is required');
    if (typeof extras.bookingId !== 'number') {
      throw new Error('bookingId is required to create a complaint.');
    }

    const req: ComplaintRequest = {
      title: (subject ?? '').trim() || 'Complaint',
      description: (message ?? '').trim(),
      category: this.mapCategory(extras.category),
      priority: this.mapPriority(extras.priority),
      bookingId: Number(extras.bookingId),
      contactMethod: extras.contactMethod,
      email: extras.contactMethod === 'Email' ? (extras.email || undefined) : undefined,
      phone: extras.contactMethod === 'Phone' ? (extras.phone || undefined) : undefined,
    };

    const resp = await this.postCreate(userId, req);
    return this.mapBackendToFrontend(resp, userId, subject, message);
  }

  /**
   * Track complaint (single)
   * GET /api/complaint/track/{complaintId}?userId=
   */
  async track(complaintId: string, userId: number): Promise<ComplaintApiResponse> {
    const params = new HttpParams().set('userId', String(userId));
    return await firstValueFrom(
      this.http.get<ComplaintApiResponse>(
        `${this.baseUrl}/track/${encodeURIComponent(complaintId)}`,
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
  }): Promise<PageResponse<ComplaintApiResponse>> {
    let params = new HttpParams()
      .set('userId', String(options.userId))
      .set('page', String(options.page ?? 0))
      .set('size', String(options.size ?? 5));

    if (options.status) {
      params = params.set('status', options.status);
    }

    return await firstValueFrom(
      this.http.get<PageResponse<ComplaintApiResponse>>(`${this.baseUrl}/my`, { params })
    );
  }

  // ---------------- Internals ----------------

  private async postCreate(userId: number, req: ComplaintRequest): Promise<ComplaintApiResponse> {
    const url = `${this.baseUrl}/create/${encodeURIComponent(String(userId))}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return await firstValueFrom(this.http.post<ComplaintApiResponse>(url, req, { headers }));
  }

  private mapPriority(p: UiPriority): ApiPriority {
    switch (p) {
      case 'Low': return 'LOW';
      case 'Medium': return 'MEDIUM';
      case 'High': return 'HIGH';
      case 'Urgent': return 'URGENT';
      default: return 'LOW';
    }
  }

  /**
   * Map UI labels -> backend enum values.
   * If your form already sends enum codes (e.g., ROOM_ISSUE), you can return as-is.
   */
  private mapCategory(c: string): ComplaintRequest['category'] {
    const map: Record<string, ComplaintRequest['category']> = {
      // UI labels you used earlier:
      'Housekeeping': 'ROOM_ISSUE',
      'Maintenance': 'ROOM_ISSUE',
      'Billing': 'BILLING_ISSUE',
      'Food & Beverage': 'SERVICE_ISSUE',
      'Reservation': 'SERVICE_ISSUE',
      'Other': 'OTHER',

      // If UI already sends enum codes, keep them:
      'ROOM_ISSUE': 'ROOM_ISSUE',
      'SERVICE_ISSUE': 'SERVICE_ISSUE',
      'BILLING_ISSUE': 'BILLING_ISSUE',
      'OTHER': 'OTHER',
    };
    return map[c] ?? 'OTHER';
  }

  /**
   * Map backend ComplaintResponse -> your frontend Complaint model (models.ts)
   * Used by RegisterComplaintComponent to show a quick success toast.
   */
  private mapBackendToFrontend(
    r: ComplaintApiResponse,
    userId: number,
    subject: string,
    message: string
  ): Complaint {
    const created =
      r.createdAt ?? r.submissionDate ?? new Date().toISOString();
    const updated =
      (r.updatedAt ?? r.submissionDate ?? created) || created;

    return {
      id: r.complaintId ?? String(r.id),            // prefer human-readable tracking id
      userId: String(userId),
      subject,
      message,
      status: (String(r.status || 'OPEN').toUpperCase() as ComplaintStatus) ?? 'OPEN',
      createdAt: created,
      updatedAt: updated,
    };
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