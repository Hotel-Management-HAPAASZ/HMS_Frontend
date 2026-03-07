import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

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

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// Types for UI list items (derived from backend)
type UIStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type SortKey = 'newest' | 'oldest' | 'status';

export type UIComplaint = {
  id: string;               // referenceNumber
  subject: string;          // title
  message: string;          // description
  status: UIStatus;
  category: string;
  priority: string;
  contactPreference: 'CALL' | 'EMAIL';
  assignedTo?: string;
  resolutionNote?: string;
  createdAt: string;
  updatedAt?: string | null;
  serverErrors?: any;
};

@Component({
  standalone: true,
  selector: 'app-track-complaint',
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    MatButtonModule,
    MatSnackBarModule,
    ReactiveFormsModule
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
              <mat-icon class="badge-ico" fontIcon="search"></mat-icon>
              <span class="text-muted small">Tip:</span>
              <span class="small fw-semibold">Use search &amp; filters to find quickly</span>
            </div>
          </div>
        </div>

        <!-- MAIN CARD -->
        <div class="app-card p-3 p-md-4">

          <!-- FILTERS + SUMMARY -->
          <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mb-3">
            <div class="summary-line">
              <h5 class="fw-bold mb-1">Complaint List</h5>
              <div class="text-muted small" style="white-space: nowrap;">
                Showing <span class="fw-semibold">{{ filteredList().length }}</span> result(s)
              </div>
            </div>

            <!-- FIX 1,5: Responsive filter bar with auto-apply status -->
            <div class="filters d-flex flex-wrap gap-2 align-items-center">
              <!-- Search -->
              <mat-form-field appearance="outline" class="filter-field search-field mb-0">
                <mat-label>Search</mat-label>
                <input
                  matInput
                  [value]="query()"
                  (input)="setQuery($any($event.target).value)"
                  placeholder="Subject, message, or ref #"
                  maxlength="60"
                />
                <mat-icon matSuffix style="font-size:18px;width:18px;height:18px;color:rgba(0,0,0,0.35)">search</mat-icon>
              </mat-form-field>

              <!-- Status (auto-applies on change — FIX 5) -->
              <mat-form-field appearance="outline" class="filter-field mb-0">
                <mat-label>Status</mat-label>
                <mat-select [value]="statusFilter()" (selectionChange)="onStatusChange($event.value)">
                  <mat-option value="ALL">All Statuses</mat-option>
                  <mat-option value="OPEN">Open</mat-option>
                  <mat-option value="IN_PROGRESS">In Progress</mat-option>
                  <mat-option value="RESOLVED">Resolved</mat-option>
                  <mat-option value="CLOSED">Closed</mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Sort -->
              <mat-form-field appearance="outline" class="filter-field mb-0">
                <mat-label>Sort</mat-label>
                <mat-select [value]="sortBy()" (selectionChange)="onSortChange($event.value)">
                  <mat-option value="newest">Newest first</mat-option>
                  <mat-option value="oldest">Oldest first</mat-option>
                  <mat-option value="status">By status</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </div>

          <mat-divider class="mb-4"></mat-divider>

          <!-- LOADING / ERROR -->
          <div *ngIf="loading()" class="text-center text-muted small py-4">Loading complaints…</div>
          <div *ngIf="error()" class="text-center text-danger small py-4">{{ error() }}</div>

          <!-- EMPTY STATE — FIX 3 & 4: Contextual messages + Register link -->
          <div *ngIf="!loading() && filteredList().length === 0" class="empty text-center py-5">
            <div class="empty-ico fs-1 mb-3">📝</div>

            <!-- No filters active -->
            <ng-container *ngIf="!hasActiveFilters(); else filteredEmpty">
              <div class="fw-bold fs-5">No complaints yet</div>
              <div class="text-muted small mt-1 mb-3">
                You haven't raised any complaints. If you're experiencing an issue during your stay, let us know.
              </div>
              <a mat-raised-button color="primary" routerLink="/customer/complaint" class="register-btn">
                <mat-icon class="me-1" style="font-size:18px;width:18px;height:18px;">add_circle_outline</mat-icon>
                Register Complaint
              </a>
            </ng-container>

            <!-- Filters are active -->
            <ng-template #filteredEmpty>
              <div class="fw-bold fs-5">No complaints found</div>
              <div class="text-muted small mt-1 mb-3">
                No complaints match your current filters. Try adjusting or clearing them.
              </div>
              <button mat-stroked-button (click)="clearFilters()">
                <mat-icon class="me-1" style="font-size:18px;width:18px;height:18px;">filter_alt_off</mat-icon>
                Clear Filters
              </button>
            </ng-template>
          </div>

          <!-- LIST -->
          <div class="grid gap-3" *ngIf="paginatedList().length > 0">
            <mat-card class="complaint-card app-card p-4 mb-3" *ngFor="let c of paginatedList(); trackBy: trackById">
              <div class="d-flex flex-column flex-md-row justify-content-between gap-3">

                <!-- LEFT CONTENT -->
                <div class="flex-grow-1 min-w-0">
                  <div class="d-flex align-items-center gap-2 mb-2">
                    <span class="title-ico border rounded p-2 bg-light text-primary">
                       <mat-icon style="font-size: 22px; width: 22px; height: 22px;">receipt_long</mat-icon>
                    </span>
                    <h5 class="fw-bold mb-0 text-truncate" style="font-size: 1.15rem;">{{ c.subject || '—' }}</h5>
                    <span class="text-muted ms-2" style="font-size: 0.9rem;">#{{ c.id }}</span>
                  </div>

                  <!-- FIX 6: Category & Priority badges -->
                  <div class="d-flex flex-wrap gap-2 mb-2">
                    <span class="tag" *ngIf="c.category">{{ categoryLabel(c.category) }}</span>
                    <span class="tag" [ngClass]="priorityClass(c.priority)" *ngIf="c.priority">
                      {{ c.priority | titlecase }}
                    </span>
                    <span class="tag tag-contact">
                      {{ c.contactPreference === 'CALL' ? '📞 Call' : '📧 Email' }}
                    </span>
                  </div>

                  <div class="d-flex flex-wrap gap-3 text-muted mb-2" style="font-size: 0.9rem;">
                    <span class="d-flex align-items-center gap-1">
                      <mat-icon style="font-size: 16px; width: 16px; height: 16px;">schedule</mat-icon>
                      Created: {{ formatDate(c.createdAt) }}
                    </span>
                    <span class="d-flex align-items-center gap-1" *ngIf="c.updatedAt">
                      <mat-icon style="font-size: 16px; width: 16px; height: 16px;">update</mat-icon>
                      Updated: {{ formatDate(c.updatedAt) }}
                    </span>
                    <span class="d-flex align-items-center gap-1" *ngIf="c.assignedTo">
                      <mat-icon style="font-size: 16px; width: 16px; height: 16px;">person</mat-icon>
                      Assigned: {{ c.assignedTo }}
                    </span>
                  </div>

                  <div class="complaint-msg bg-light p-3 rounded mt-2 mb-2" *ngIf="editingId() !== c.id">
                    <p class="mb-0 text-secondary" style="font-size: 0.95rem; line-height: 1.6;">{{ c.message || 'No description provided.' }}</p>
                  </div>

                  <!-- FIX 7: Resolution Note (shown for RESOLVED/CLOSED) -->
                  <div class="resolution-note mt-2 p-3 rounded" *ngIf="c.resolutionNote && (c.status === 'RESOLVED' || c.status === 'CLOSED') && editingId() !== c.id">
                    <div class="d-flex align-items-center gap-2 mb-1">
                      <mat-icon style="font-size: 16px; width: 16px; height: 16px; color: #0ca678;">task_alt</mat-icon>
                      <span class="fw-semibold" style="color: #0ca678; font-size: 0.9rem;">Staff Resolution Note</span>
                    </div>
                    <p class="mb-0 text-secondary" style="font-size: 0.9rem; line-height: 1.5;">{{ c.resolutionNote }}</p>
                  </div>

                  <!-- EDIT FORM -->
                  <div class="mt-3 p-3 border rounded bg-light" *ngIf="editingId() === c.id">
                    <form [formGroup]="editForm" (ngSubmit)="saveEdit(c)" class="d-flex flex-column gap-2">
                       <mat-form-field appearance="outline" class="w-100 mb-2">
                        <mat-label>Title</mat-label>
                        <input matInput formControlName="title" minlength="10" maxlength="100">
                        <mat-error *ngIf="editForm.controls['title'].invalid">Title must be between 10-100 chars</mat-error>
                        <mat-error *ngIf="c.serverErrors && c.serverErrors['title']">{{ c.serverErrors['title'] }}</mat-error>
                      </mat-form-field>

                       <mat-form-field appearance="outline" class="w-100 mb-2">
                        <mat-label>Description</mat-label>
                        <textarea matInput formControlName="description" rows="3" minlength="20" maxlength="500"></textarea>
                        <mat-error *ngIf="editForm.controls['description'].invalid">Description must be 20-500 chars</mat-error>
                        <mat-error *ngIf="c.serverErrors && c.serverErrors['description']">{{ c.serverErrors['description'] }}</mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="w-100 mb-2">
                        <mat-label>Contact Preference</mat-label>
                        <mat-select formControlName="contactPreference">
                          <mat-option value="EMAIL">Email</mat-option>
                          <mat-option value="CALL">Call</mat-option>
                        </mat-select>
                      </mat-form-field>

                      <div class="d-flex justify-content-end gap-2 mt-2">
                        <button mat-stroked-button type="button" (click)="cancelEdit()">Cancel</button>
                        <button mat-raised-button color="primary" type="submit" [disabled]="editForm.invalid || submitting()">
                          {{ submitting() ? 'Saving...' : 'Save' }}
                        </button>
                      </div>
                    </form>
                  </div>
                  <!-- END EDIT FORM -->

                </div>

                <!-- RIGHT SIDE (STATUS & ACTIONS) -->
                <div class="d-flex flex-column align-items-end justify-content-between gap-3 text-end" style="min-width: 150px;">
                  <div>
                    <span class="badge rounded-pill px-3 py-2 status-badge shadow-sm" [ngClass]="statusClass(normalizeStatus(c.status))">
                      {{ statusLabel(normalizeStatus(c.status)) }}
                    </span>
                    <div class="text-muted mt-2 fw-medium text-center" style="font-size: 0.85rem;">
                      {{ statusNote(normalizeStatus(c.status)) }}
                    </div>
                  </div>

                  <!-- ACTIONS — FIX 9: Confirmation dialogs, FIX 11: Loading text -->
                  <div class="actions d-flex flex-column gap-2 w-100" *ngIf="editingId() !== c.id">
                     <!-- OPEN status = can edit -->
                     <button mat-stroked-button color="primary" class="w-100" *ngIf="c.status === 'OPEN'" (click)="startEdit(c)">
                       Edit Details
                     </button>

                     <!-- RESOLVED status = can verify or reopen -->
                     <button mat-raised-button color="primary" class="w-100" *ngIf="c.status === 'RESOLVED'"
                       (click)="confirmWithDialog(c.id)" [disabled]="submitting()">
                       {{ confirmingId() === c.id ? 'Closing...' : 'Confirm Resolution' }}
                     </button>
                     <button mat-stroked-button color="warn" class="w-100 mt-1" *ngIf="c.status === 'RESOLVED'"
                       (click)="reopenWithDialog(c.id)" [disabled]="submitting()">
                       {{ reopeningId() === c.id ? 'Reopening...' : 'Reopen' }}
                     </button>

                     <!-- IN_PROGRESS = info only -->
                     <div *ngIf="c.status === 'IN_PROGRESS'" class="text-muted small fw-semibold w-100 text-center border p-2 rounded bg-light">
                       <mat-icon style="font-size: 14px; width: 14px; height: 14px; vertical-align: middle;">hourglass_top</mat-icon> In Progress
                     </div>

                     <!-- CLOSED status = Read ONLY -->
                     <div *ngIf="c.status === 'CLOSED'" class="text-muted small fw-semibold w-100 text-center border p-2 rounded bg-light">
                       <mat-icon style="font-size: 14px; width: 14px; height: 14px; vertical-align: middle;">lock</mat-icon> Read-Only
                     </div>
                  </div>
                </div>

              </div>
            </mat-card>
          </div>

          <!-- PAGINATION -->
          <div class="d-flex justify-content-between align-items-center mt-4 pt-3 border-top" *ngIf="totalPages() > 1">
            <button mat-stroked-button (click)="prevPage()" [disabled]="isFirstPage()">
                <mat-icon>chevron_left</mat-icon> Previous
            </button>
            <div class="small fw-semibold text-muted">
              Page {{ clientPage() + 1 }} of {{ totalPages() }}
            </div>
            <button mat-stroked-button (click)="nextPage()" [disabled]="isLastPage()">
                Next <mat-icon>chevron_right</mat-icon>
            </button>
          </div>

        </div>

      </div>
    </div>

    <!-- FIX 9: Confirmation dialog overlay -->
    <div class="confirm-overlay" *ngIf="dialogAction()">
      <div class="confirm-dialog">
        <div class="d-flex align-items-center gap-2 mb-3">
          <mat-icon [style.color]="dialogAction() === 'confirm' ? '#0ca678' : '#e03131'" style="font-size:24px;width:24px;height:24px;">
            {{ dialogAction() === 'confirm' ? 'check_circle' : 'replay' }}
          </mat-icon>
          <h5 class="fw-bold mb-0">{{ dialogAction() === 'confirm' ? 'Confirm Resolution?' : 'Reopen Complaint?' }}</h5>
        </div>
        <p class="text-muted mb-3">
          {{ dialogAction() === 'confirm'
            ? 'This will close the complaint permanently. You will not be able to reopen it after closing.'
            : 'This will reopen the complaint. The staff team will be notified to look into it again.' }}
        </p>
        <div class="d-flex justify-content-end gap-2">
          <button mat-stroked-button (click)="cancelDialog()">Cancel</button>
          <button mat-raised-button [color]="dialogAction() === 'confirm' ? 'primary' : 'warn'" (click)="executeDialog()">
            {{ dialogAction() === 'confirm' ? 'Yes, Confirm' : 'Yes, Reopen' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .track-bg {
      background: var(--app-bg, #f4f6f8);
      min-height: 100vh;
      padding: 24px;
    }
    .app-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
      border: 1px solid rgba(0,0,0,0.06);
      transition: box-shadow 0.2s ease, transform 0.2s ease;
    }
    .complaint-card:hover {
      box-shadow: 0 6px 24px rgba(0,0,0,0.08);
      transform: translateY(-2px);
    }
    .hero {
      background: linear-gradient(to right, #ffffff, #f8faff);
      border-left: 4px solid var(--app-primary, #3f51b5);
    }
    .kicker {
      font-size: 12px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1px; color: var(--app-primary, #3f51b5); margin-bottom: 4px;
    }
    .hero-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 20px;
      background: linear-gradient(135deg, #f0f4ff, #e6ecfc);
      border: 1px solid #d6e2ff; color: #3f51b5;
      box-shadow: 0 2px 8px rgba(63, 81, 181, 0.1);
    }

    /* FIX 1: Responsive filters with flex-wrap */
    .filters { flex-wrap: wrap; }
    .filter-field { width: 170px; }
    .search-field { width: 240px; }
    ::ng-deep .filter-field .mat-mdc-text-field-wrapper { background-color: white !important; }
    ::ng-deep .filter-field .mat-mdc-form-field-subscript-wrapper { display: none; }

    @media (max-width: 768px) {
      .filter-field, .search-field { width: 100%; }
    }

    /* Tags for category/priority */
    .tag {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600;
      border: 1px solid rgba(0,0,0,0.08); background: rgba(0,0,0,0.03); color: #495057;
    }
    .tag-contact { background: rgba(63,81,181,0.06); border-color: rgba(63,81,181,0.12); color: #3f51b5; }
    .pri-low { background: #e6fcf5; color: #0ca678; border-color: #b2f2bb; }
    .pri-medium { background: #fff8e6; color: #b38600; border-color: #ffeba1; }
    .pri-high { background: #fff4e6; color: #e67700; border-color: #ffd8a8; }
    .pri-urgent { background: #ffe3e3; color: #e03131; border-color: #ffc9c9; }

    /* Resolution note — FIX 7 */
    .resolution-note {
      border: 1px solid rgba(12,166,120,0.20);
      background: rgba(12,166,120,0.04);
    }

    /* Status badges */
    .status-badge { font-size: 12px; font-weight: 600; letter-spacing: 0.5px; border: 1px solid transparent; }
    .st-open { background-color: #fff8e6; color: #b38600; border-color: #ffeba1; }
    .st-progress { background-color: #f1f3f5; color: #495057; border-color: #dee2e6; }
    .st-resolved { background-color: #e6fcf5; color: #0ca678; border-color: #b2f2bb; }
    .st-closed { background-color: #e7f5ff; color: #1971c2; border-color: #a5d8ff; }

    .register-btn { border-radius: 12px; }

    /* FIX 9: Confirmation dialog */
    .confirm-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.45); display: grid; place-items: center;
    }
    .confirm-dialog {
      background: white; border-radius: 16px; padding: 24px; max-width: 420px; width: 90%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }
  `]
})
export class TrackComplaintComponent {
  submitting = signal(false);
  editingId = signal<string | null>(null);
  editForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);

  // FIX 9: Confirmation dialog state
  dialogAction = signal<'confirm' | 'reopen' | null>(null);
  dialogTargetId = signal<string | null>(null);
  confirmingId = signal<string | null>(null);
  reopeningId = signal<string | null>(null);

  constructor(
    private auth: AuthService,
    private complaints: NewComplaintService,
    private snack: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.editForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(500)]],
      contactPreference: ['EMAIL', Validators.required]
    });
    queueMicrotask(() => this.load().catch(() => { }));
  }

  // Filters
  query = signal('');
  statusFilter = signal<'ALL' | UIStatus>('ALL');
  sortBy = signal<SortKey>('newest');

  // FIX 10: Proper server-side pagination
  page = signal(0);
  size = signal(10);
  pageInfo = signal({ totalElements: 0, totalPages: 0, size: 10, number: 0, first: true, last: true });

  // Client-side pagination state
  clientPage = signal(0);
  itemsPerPage = signal(5);

  // Raw items loaded from backend
  allItems = signal<UIComplaint[]>([]);

  // FIX 3: Check if any filters are active
  hasActiveFilters = computed(() => {
    return this.query().trim() !== '' || this.statusFilter() !== 'ALL' || this.sortBy() !== 'newest';
  });

  // FIX 5: Auto-apply status filter (no separate Apply button)
  setQuery(v: string) {
    this.query.set((v ?? '').trim());
    this.clientPage.set(0);
  }

  onStatusChange(v: 'ALL' | UIStatus) {
    this.statusFilter.set(v);
    this.clientPage.set(0);
    this.load(); // Auto-apply on change
  }

  onSortChange(v: SortKey) {
    this.sortBy.set(v);
    this.clientPage.set(0);
  }

  clearFilters() {
    this.query.set('');
    this.statusFilter.set('ALL');
    this.sortBy.set('newest');
    this.clientPage.set(0);
    this.load();
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

      // FIX 10: Fetch ALL matching items with a reasonable limit
      const pageResp = await this.complaints.myComplaints({
        userId: Number(u.id),
        status: status === 'ALL' ? undefined : status,
        page: 0,
        size: 500  // Fetch all, paginate client-side
      });

      this.pageInfo.set({
        totalElements: pageResp.totalElements,
        totalPages: pageResp.totalPages,
        size: pageResp.size,
        number: pageResp.number,
        first: pageResp.first,
        last: pageResp.last
      });

      const parseDate = (val: any) => {
        if (!val) return null;
        if (Array.isArray(val)) {
          const [y, m, d, h = 0, min = 0, s = 0] = val;
          const dt = new Date(y, m - 1, d, h, min, s);
          return Number.isFinite(dt.getTime()) ? dt.toISOString() : null;
        }
        // Try ISO string parsing
        const dt = new Date(String(val));
        return Number.isFinite(dt.getTime()) ? dt.toISOString() : null;
      };

      // FIX 6,7: Map category, priority, resolutionNote, assignedUserName
      const mapped = (pageResp.content ?? []).map((r: any): UIComplaint => {
        return {
          id: String(r.referenceNumber),
          subject: String(r.title ?? ''),
          message: String(r.description ?? ''),
          category: String(r.category ?? ''),
          priority: String(r.priority ?? 'LOW'),
          contactPreference: r.contactPreference as 'CALL' | 'EMAIL',
          status: this.normalizeStatus(r.status),
          assignedTo: r.assignedUserName || undefined,
          resolutionNote: r.resolutionNote || undefined,
          createdAt: String(parseDate(r.createdAt) || ''),
          updatedAt: String(parseDate(r.updatedAt) || '')
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

  // ---------- Action Handlers
  startEdit(c: UIComplaint) {
    this.editingId.set(c.id);
    this.editForm.reset({
      title: c.subject,
      description: c.message,
      contactPreference: c.contactPreference
    });
    c.serverErrors = null;
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editForm.reset();
  }

  async saveEdit(c: UIComplaint) {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const u = this.auth.user();
    if (!u) return;

    this.submitting.set(true);
    c.serverErrors = null;

    try {
      const v = this.editForm.value;
      await this.complaints.update(c.id, Number(u.id), {
        title: v.title,
        description: v.description,
        contactPreference: v.contactPreference
      });
      this.snack.open('Complaint updated successfully', 'OK', { duration: 2000 });
      this.cancelEdit();
      await this.load();
    } catch (err: any) {
      if (err.status === 400 && err.error && typeof err.error === 'object') {
        c.serverErrors = err.error;
        this.snack.open('Please fix the validation errors.', 'OK', { duration: 3000 });
      } else if (err.status === 409) {
        this.snack.open(err.error?.message || 'Cannot edit this complaint right now.', 'OK', { duration: 3000 });
      } else {
        const msg = err?.error?.message || 'Update failed';
        this.snack.open(msg, 'OK', { duration: 3000 });
      }
    } finally {
      this.submitting.set(false);
    }
  }

  // FIX 9: Confirmation dialog flow
  confirmWithDialog(id: string) {
    this.dialogAction.set('confirm');
    this.dialogTargetId.set(id);
  }

  reopenWithDialog(id: string) {
    this.dialogAction.set('reopen');
    this.dialogTargetId.set(id);
  }

  cancelDialog() {
    this.dialogAction.set(null);
    this.dialogTargetId.set(null);
  }

  async executeDialog() {
    const action = this.dialogAction();
    const id = this.dialogTargetId();
    if (!action || !id) return;
    this.cancelDialog();

    if (action === 'confirm') await this.confirm(id);
    else await this.reopen(id);
  }

  async confirm(id: string) {
    const u = this.auth.user();
    if (!u) return;

    this.submitting.set(true);
    this.confirmingId.set(id);
    try {
      await this.complaints.confirmResolution(id, Number(u.id));
      this.snack.open('Resolution confirmed. Complaint closed.', 'OK', { duration: 2500 });
      await this.load();
    } catch (err: any) {
      const msg = err?.error?.message || 'Action failed';
      this.snack.open(msg, 'OK', { duration: 3000 });
    } finally {
      this.submitting.set(false);
      this.confirmingId.set(null);
    }
  }

  async reopen(id: string) {
    const u = this.auth.user();
    if (!u) return;

    this.submitting.set(true);
    this.reopeningId.set(id);
    try {
      await this.complaints.reopen(id, Number(u.id));
      this.snack.open('Complaint reopened successfully.', 'OK', { duration: 2500 });
      await this.load();
    } catch (err: any) {
      const msg = err?.error?.message || 'Action failed';
      this.snack.open(msg, 'OK', { duration: 3000 });
    } finally {
      this.submitting.set(false);
      this.reopeningId.set(null);
    }
  }

  // ---------- Client-side filtering & sorting
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

  // Client-side pagination
  paginatedList = computed(() => {
    const start = this.clientPage() * this.itemsPerPage();
    return this.filteredList().slice(start, start + this.itemsPerPage());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredList().length / this.itemsPerPage())));
  isFirstPage = computed(() => this.clientPage() === 0);
  isLastPage = computed(() => this.clientPage() >= this.totalPages() - 1);

  prevPage() {
    if (!this.isFirstPage()) this.clientPage.set(this.clientPage() - 1);
  }

  nextPage() {
    if (!this.isLastPage()) this.clientPage.set(this.clientPage() + 1);
  }

  trackById = (_: number, c: UIComplaint) => c.id;

  // ---------- Status helpers
  normalizeStatus(status: any): UIStatus {
    const s = String(status ?? '').toUpperCase().trim();
    if (s === 'INPROGRESS' || s === 'IN_PROGRESS') return 'IN_PROGRESS';
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
    if (s === 'OPEN') return 'We\'ll update you soon';
    if (s === 'IN_PROGRESS') return 'Being worked on';
    if (s === 'RESOLVED') return 'Please confirm or reopen';
    return 'Closed';
  }

  statusLabel(s: UIStatus): string {
    const map: Record<string, string> = {
      'OPEN': 'Open',
      'IN_PROGRESS': 'In Progress',
      'RESOLVED': 'Resolved',
      'CLOSED': 'Closed'
    };
    return map[s] || s;
  }

  // FIX 6: Category label mapping
  categoryLabel(cat: string): string {
    const map: Record<string, string> = {
      'ROOM_ISSUE': '🛏️ Room Issue',
      'SERVICE_ISSUE': '🍽️ Service Issue',
      'BILLING_ISSUE': '💳 Billing',
      'OTHER': '📋 Other'
    };
    return map[cat] || cat;
  }

  // FIX 6: Priority color class
  priorityClass(p: string): string {
    const map: Record<string, string> = {
      'LOW': 'pri-low',
      'MEDIUM': 'pri-medium',
      'HIGH': 'pri-high',
      'URGENT': 'pri-urgent'
    };
    return map[p] || '';
  }

  // ---------- Date helpers
  formatDate(value: any): string {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toLocaleString() : '—';
  }
}