import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/services/auth.service';
import { NewComplaintService } from '../../../core/services/new-complaint.service';

// Types for UI list items (derived from backend)
type UIStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type SortKey = 'newest' | 'oldest' | 'status';

type UIComplaint = {
  id: string;               // complaintId (CMP-xxx) or fallback to numeric id
  subject: string;          // title if provided by backend; otherwise derived
  message: string;          // description
  status: UIStatus;
  createdAt: string;
  updatedAt?: string | null;
};

@Component({
  standalone: true,
  selector: 'app-track-complaint',
  imports: [
    CommonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  template: `
    <div class="track-bg">
      <div class="container-fluid p-0">

        <!-- HERO HEADER -->
        <div class="app-card p-3 p-md-4 mb-4 hero">
          <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
            <div>
              <div class="kicker">Customer Portal</div>
              <h2 class="fw-bold mb-1 title">Track Complaints</h2>
              <p class="text-muted mb-0">
                View your complaints and track their current status.
              </p>
            </div>

            <div class="hero-badge">
              <span class="badge-dot"></span>
              <span class="text-muted small">Tip:</span>
              <span class="small fw-semibold">Use search &amp; filters to find quickly</span>
            </div>
          </div>
        </div>

        <!-- MAIN CARD -->
        <div class="app-card p-3 p-md-4">

          <!-- FILTERS + SUMMARY -->
          <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mb-3">
            <div>
              <h5 class="fw-bold mb-1">Complaint List</h5>
              <div class="text-muted small">
                Showing <span class="fw-semibold">{{ filteredList().length }}</span> result(s)
              </div>
            </div>

            <div class="filters d-flex flex-column flex-md-row gap-2">
              <!-- Search (client-side filter on current page) -->
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Search</mat-label>
                <input
                  matInput
                  [value]="query()"
                  (input)="setQuery($any($event.target).value)"
                  placeholder="Search by subject or message…"
                  maxlength="60"
                />
                <mat-hint align="end">{{ (query() || '').length }}/60</mat-hint>
              </mat-form-field>

              <!-- Status (server-side filter applied only on Apply) -->
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Status</mat-label>
                <mat-select [value]="statusFilter()" (selectionChange)="onStatusChange($event.value)">
                  <mat-option value="ALL">All</mat-option>
                  <mat-option value="OPEN">Open</mat-option>
                  <mat-option value="IN_PROGRESS">In Progress</mat-option>
                  <mat-option value="RESOLVED">Resolved</mat-option>
                  <mat-option value="CLOSED">Closed</mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Sort (client-side sort on current page) -->
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Sort</mat-label>
                <mat-select [value]="sortBy()" (selectionChange)="sortBy.set($event.value)">
                  <mat-option value="newest">Newest first</mat-option>
                  <mat-option value="oldest">Oldest first</mat-option>
                  <mat-option value="status">By status</mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Apply button (explicit API call) -->
              <div class="d-flex align-items-end">
                <button mat-stroked-button class="apply-btn" (click)="applyFilters()" [disabled]="loading()">
                  Apply
                </button>
              </div>
            </div>
          </div>

          <mat-divider class="mb-3"></mat-divider>

          <!-- LOADING / ERROR -->
          <div *ngIf="loading()" class="text-muted small mb-2">Loading complaints…</div>
          <div *ngIf="error()" class="text-danger small mb-2">{{ error() }}</div>

          <!-- EMPTY STATE -->
          <div *ngIf="!loading() && filteredList().length === 0" class="empty">
            <div class="empty-ico">📝</div>
            <div class="fw-bold">No complaints found</div>
            <div class="text-muted small">
              Try clearing filters or register a new complaint if needed.
            </div>
          </div>

          <!-- LIST -->
          <div class="grid gap-3" *ngIf="filteredList().length > 0">
            <mat-card class="complaint-card app-card p-3" *ngFor="let c of filteredList(); trackBy: trackById">

              <div class="row-wrap">
                <!-- LEFT -->
                <div class="left">
                  <div class="head">
                    <div class="title-ico">🎫</div>
                    <div class="min-w-0">
                      <div class="complaint-title text-truncate">
                        {{ c.subject || '—' }}
                      </div>

                      <div class="meta text-muted small mt-1">
                        <span class="me-2">
                          <mat-icon class="meta-ico">schedule</mat-icon>
                          Created: {{ formatDate(c.createdAt) }}
                        </span>

                        <span class="me-2" *ngIf="c.updatedAt">
                          <mat-icon class="meta-ico">update</mat-icon>
                          Updated: {{ formatDate(c.updatedAt) }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="complaint-msg mt-2">
                    {{ c.message || '—' }}
                  </div>
                </div>

                <!-- RIGHT -->
                <div class="right">
                  <mat-chip class="status-chip" [ngClass]="statusClass(normalizeStatus(c.status))">
                    {{ normalizeStatus(c.status) }}
                  </mat-chip>

                  <div class="right-note text-muted small">
                    {{ statusNote(normalizeStatus(c.status)) }}
                  </div>
                </div>
              </div>

            </mat-card>
          </div>

          <!-- PAGINATION (backend) -->
          <div class="d-flex justify-content-between align-items-center mt-3" *ngIf="pageInfo().totalPages > 1">
            <button mat-stroked-button (click)="prevPage()" [disabled]="pageInfo().first || loading()">Prev</button>
            <div class="small text-muted">
              Page <b>{{ pageInfo().number + 1 }}</b> of <b>{{ pageInfo().totalPages }}</b>
            </div>
            <button mat-stroked-button (click)="nextPage()" [disabled]="pageInfo().last || loading()">Next</button>
          </div>

        </div>

        <div class="text-center mt-4 small text-muted">
          © 2026 Hotel Booking System
        </div>

      </div>
    </div>
  `,
  styles: [/* keep your existing CSS exactly as you posted */]
})
export class TrackComplaintComponent {
  constructor(
    private auth: AuthService,
    private complaints: NewComplaintService,
    private snack: MatSnackBar
  ) {
    // Initial first load: show ALL complaints of the user (no filter)
    queueMicrotask(() => this.load().catch(() => { }));
  }

  // ---------- UI state (signals)
  loading = signal(false);
  error = signal<string | null>(null);

  // Filters
  query = signal('');
  statusFilter = signal<'ALL' | UIStatus>('ALL');
  sortBy = signal<SortKey>('newest');

  // Pagination
  page = signal(0);
  size = signal(5);
  pageInfo = signal({
    totalElements: 0,
    totalPages: 0,
    size: 5,
    number: 0,
    first: true,
    last: true
  });

  // Raw items loaded from backend (mapped to UIComplaint)
  allItems = signal<UIComplaint[]>([]);

  // ---------------- FILTER HANDLERS ----------------
  setQuery(v: string) {
    this.query.set((v ?? '').trim());
  }

  onStatusChange(v: 'ALL' | UIStatus) {
    this.statusFilter.set(v);
    // Do NOT auto-load. User clicks Apply to fetch.
  }

  async applyFilters() {
    this.page.set(0);
    await this.load();
  }

  // ---------------- DATA LOADING ----------------
  async load() {
    const u = this.auth.user();
    if (!u) {
      this.error.set('Please login to view your complaints.');
      this.allItems.set([]);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const status = this.statusFilter();
      // Debug (optional): console.log('Loading complaints', { userId: u.id, status, page: this.page(), size: this.size() });

      const pageResp = await this.complaints.myComplaints({
        userId: Number(u.id),
        status: status === 'ALL' ? undefined : status,
        page: this.page(),
        size: this.size()
      });

      // Map backend page info
      this.pageInfo.set({
        totalElements: pageResp.totalElements,
        totalPages: pageResp.totalPages,
        size: pageResp.size,
        number: pageResp.number,
        first: pageResp.first,
        last: pageResp.last
      });

      // Map backend items to your UI model
      const mapped = (pageResp.content ?? []).map((r: any): UIComplaint => {
        const subject =
          (r.title as string) ??
          (r.subject as string) ??
          `[${r.category ?? 'Complaint'}] ${r.complaintId ?? r.id}`;

        return {
          id: String(r.complaintId ?? r.id),
          subject,
          message: String(r.description ?? ''),
          status: this.normalizeStatus(r.status),
          createdAt: String(r.createdAt ?? r.submissionDate ?? new Date().toISOString()),
          updatedAt: String(r.updatedAt ?? r.submissionDate ?? '') || null
        };
      });

      this.allItems.set(mapped);
    } catch (err: any) {
      const msg = NewComplaintService.parseHttpError(err, 'Failed to load complaints');
      this.error.set(msg);
      this.snack.open(msg, 'OK', { duration: 2500 });
      this.allItems.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  // ---------- Client-side filtering & sorting (on already loaded page)
  list = computed(() => this.allItems());

  filteredList = computed(() => {
    const q = this.query().toLowerCase();
    const sort = this.sortBy();

    let arr = [...this.list()];

    if (q) {
      arr = arr.filter(c => {
        const id = (c.id ?? '').toLowerCase();
        const subject = (c.subject ?? '').toLowerCase();
        const message = (c.message ?? '').toLowerCase();
        return id.includes(q) || subject.includes(q) || message.includes(q);
      });
    }

    const getTime = (x: any) => {
      const t = new Date(x?.createdAt ?? 0).getTime();
      return Number.isFinite(t) ? t : 0;
    };

    if (sort === 'newest') arr.sort((a, b) => getTime(b) - getTime(a));
    if (sort === 'oldest') arr.sort((a, b) => getTime(a) - getTime(b));
    if (sort === 'status') {
      const order: Record<string, number> = { OPEN: 1, IN_PROGRESS: 2, RESOLVED: 3, CLOSED: 4 };
      arr.sort((a, b) => (order[this.normalizeStatus(a.status)] ?? 99) - (order[this.normalizeStatus(b.status)] ?? 99));
    }

    return arr;
  });

  // ---------- Pagination handlers (call backend)
  async prevPage() {
    if (!this.pageInfo().first) {
      this.page.set(Math.max(0, this.page() - 1));
      await this.load();
    }
  }
  async nextPage() {
    if (!this.pageInfo().last) {
      this.page.set(this.page() + 1);
      await this.load();
    }
  }

  // ---------- TrackBy
  trackById = (_: number, c: UIComplaint) => c.id;

  // ---------- Status helpers
  normalizeStatus(status: any): UIStatus {
    const s = String(status ?? '').toUpperCase().trim();
    if (s === 'INPROGRESS') return 'IN_PROGRESS';
    if (s === 'IN_PROGRESS') return 'IN_PROGRESS';
    if (s === 'RESOLVED') return 'RESOLVED';
    if (s === 'CLOSED') return 'CLOSED';
    return 'OPEN';
  }

  statusClass(s: string) {
    switch (s) {
      case 'OPEN': return 'st-open';
      case 'IN_PROGRESS': return 'st-progress';
      case 'RESOLVED': return 'st-resolved';
      case 'CLOSED': return 'st-closed';
      default: return 'st-open';
    }
  }

  statusNote(s: UIStatus) {
    if (s === 'OPEN') return `We’ll update you soon`;
    if (s === 'IN_PROGRESS') return `Being worked on`;
    return `Completed`;
  }

  // ---------- Date helpers
  formatDate(value: any): string {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toLocaleString() : '—';
  }

  // ---------- Optional: quick track by complaintId (GET /track)
  async quickTrack(complaintId: string) {
    const u = this.auth.user();
    if (!u) {
      this.snack.open('Please login to track a complaint.', 'OK', { duration: 2000 });
      return;
    }
    try {
      const res = await this.complaints.track(complaintId, Number(u.id));
      this.snack.open(`Status for ${res.complaintId}: ${res.status}`, 'OK', { duration: 2500 });
    } catch (err) {
      const msg = NewComplaintService.parseHttpError(err, 'Failed to track complaint');
      this.snack.open(msg, 'OK', { duration: 2500 });
    }
  }
}