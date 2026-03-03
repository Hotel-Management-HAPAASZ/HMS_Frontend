import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  Validators,
  FormGroup,
  FormControl,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../../core/services/auth.service';
import { NewComplaintService } from '../../../core/services/new-complaint.service';
import { Complaint, ComplaintStatus } from '../../../core/models/models';
import { MatSnackBar } from '@angular/material/snack-bar';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type StatusFilter = '' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type PriorityFilter = '' | Priority;


function resolutionNoteValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const status = group.get('status')?.value as ComplaintStatus | null;
    const note = (group.get('resolutionNote')?.value as string | undefined)?.trim() ?? '';
    if (!status) return null;
    if (status === 'RESOLVED' || status === 'CLOSED') {
      return note ? null : { resolutionRequired: true };
    }
    return null;
  };
}

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-staff-complaints',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTooltipModule
  ],
  template: `
  <div class="dash-bg">
    <div class="container-fluid p-0">

      <!-- HERO -->
      <div class="app-card p-3 p-md-4 mb-4 hero">
        <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <div>
            <div class="kicker">Staff Portal</div>
            <h2 class="fw-bold mb-1 title">Complaints Queue</h2>
            <p class="text-muted mb-0">
              Review customer complaints, update status, and add resolution notes.
            </p>
          </div>

          <div class="hero-badge">
            <span class="badge-dot"></span>
            <span class="text-muted small">Open/In Progress:</span>
            <span class="small fw-semibold">{{ openCount }}</span>
          </div>
        </div>
      </div>

      <!-- FILTERS -->
      <div class="app-card p-3 p-md-4 mb-4">
        <div class="d-flex flex-wrap align-items-center justify-content-between mb-2 gap-2">
          <h5 class="fw-bold mb-0">Quick Filters</h5>
          <span class="badge text-bg-light border pill-badge">Interactive</span>
        </div>

        <div class="row g-3 align-items-end">
          <div class="col-12 col-md-5">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Search (subject/customer)</mat-label>
              <input matInput #q [value]="query" (input)="setQuery(q.value)" placeholder="Type to search…" />
              <button *ngIf="query" matSuffix mat-icon-button aria-label="Clear" (click)="setQuery('')">
                <span aria-hidden="true">✕</span>
              </button>
            </mat-form-field>
          </div>

          <div class="col-6 col-md-3">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Status</mat-label>
              <mat-select [value]="statusFilter" (selectionChange)="setStatusFilter($event.value)">
                <mat-option value="">All</mat-option>
                <mat-option value="OPEN">Open</mat-option>
                <mat-option value="IN_PROGRESS">In Progress</mat-option>
                <mat-option value="RESOLVED">Resolved</mat-option>
                <mat-option value="CLOSED">Closed</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="col-6 col-md-3">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Priority</mat-label>
              <mat-select [value]="priorityFilter" (selectionChange)="setPriorityFilter($event.value)">
                <mat-option value="">All</mat-option>
                <mat-option value="LOW">Low</mat-option>
                <mat-option value="MEDIUM">Medium</mat-option>
                <mat-option value="HIGH">High</mat-option>
                <mat-option value="URGENT">Urgent</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="col-12 col-md-1 d-grid d-md-block">
            <button
              mat-stroked-button
              type="button"
              class="apply-btn w-100 w-md-auto"
              (click)="applyFilters()"
            >
              Apply
            </button>
            <button
              mat-stroked-button
              type="button"
              class="w-100 w-md-auto mt-2"
              (click)="clearFilters()"
            >
              Clear
            </button>
          </div>
        </div>

        <div class="text-muted small mt-2 d-flex justify-content-between">
          <span>Showing page {{ pageInfo.number + 1 }} of {{ pageInfo.totalPages }} (Total: {{ pageInfo.totalElements }})</span>
          <div class="d-flex gap-2">
            <button mat-stroked-button class="apply-btn p-0 px-2" (click)="prevPage()" [disabled]="pageInfo.first">Prev</button>
            <button mat-stroked-button class="apply-btn p-0 px-2" (click)="nextPage()" [disabled]="pageInfo.last">Next</button>
          </div>
        </div>
      </div>

      <!-- MAIN CARD: Edit form + Table -->
      <div class="app-card p-3 p-md-4">

        <div class="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
          <h5 class="fw-bold mb-0">Complaints</h5>
          <div class="d-grid d-md-block">
            <button mat-stroked-button class="apply-btn w-100 w-md-auto" type="button" (click)="reload()">Reload</button>
          </div>
        </div>

        <!-- EDIT FORM -->
        <div class="mb-3" *ngIf="showForm">
          <div class="form-card">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <div class="d-flex align-items-center gap-2">
                <div class="action-ico">🎫</div>
                <div>
                  <div class="action-title">Update Complaint</div>
                  <div class="action-sub">Fields marked required must be provided</div>
                </div>
              </div>
              <div class="d-grid d-md-block">
                <button type="button" mat-stroked-button (click)="cancelEdit()" class="apply-btn w-100 w-md-auto">Close</button>
              </div>
            </div>

            <form [formGroup]="editForm" (ngSubmit)="saveEdit()" class="row g-3">
              <div class="col-12 col-md-6">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Title</mat-label>
                  <input matInput formControlName="subject" readonly />
                </mat-form-field>
              </div>

              <div class="col-12 col-md-6">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Customer ID</mat-label>
                  <input matInput [value]="editingUserId" readonly />
                </mat-form-field>
              </div>

              <div class="col-12 col-md-3">
                <mat-form-field appearance="outline" class="w-100 status-field">
                  <mat-label>Status</mat-label>
                  <mat-select formControlName="status" required>
                    <mat-option value="OPEN">Open</mat-option>
                    <mat-option value="IN_PROGRESS">In Progress</mat-option>
                    <mat-option value="RESOLVED">Resolved</mat-option>
                    <mat-option value="CLOSED">Closed</mat-option>
                  </mat-select>
                  <mat-error *ngIf="editForm.controls.status.hasError('required')">Status is required</mat-error>
                </mat-form-field>
              </div>

              <div class="col-12 col-md-3">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Priority</mat-label>
                  <mat-select formControlName="priority" required>
                    <mat-option value="LOW">Low</mat-option>
                    <mat-option value="MEDIUM">Medium</mat-option>
                    <mat-option value="HIGH">High</mat-option>
                    <mat-option value="URGENT">Urgent</mat-option>
                  </mat-select>
                  <mat-error *ngIf="editForm.controls.priority.hasError('required')">Priority is required</mat-error>
                </mat-form-field>
              </div>

              <div class="col-12 col-md-3">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Expected Resolution Date</mat-label>
                  <input matInput type="date" formControlName="expectedResolutionDate" />
                </mat-form-field>
              </div>

              <div class="col-12">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Resolution notes (required for Resolved/Closed)</mat-label>
                  <textarea
                    matInput
                    rows="3"
                    formControlName="resolutionNote"
                    placeholder="What was done to resolve?"
                  ></textarea>
                  <mat-error *ngIf="editForm.hasError('resolutionRequired')">
                    Add resolution notes to mark as Resolved/Closed
                  </mat-error>
                </mat-form-field>
              </div>

              <div class="col-12 d-flex flex-wrap justify-content-end gap-2">
                <button mat-stroked-button type="button" (click)="cancelEdit()">Cancel</button>
                <button mat-raised-button color="primary" class="btn-app" type="submit" [disabled]="editForm.invalid">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- TABLE -->
        <div class="table-wrap-scroll">
          <div class="table-wrap">
            <table mat-table [dataSource]="dataSource" class="w-100 table-center">

              <!-- Customer -->
              <ng-container matColumnDef="customer">
                <th mat-header-cell *matHeaderCellDef>User ID</th>
                <td mat-cell *matCellDef="let c">
                  <div class="cell-center">
                    <div class="fw-semibold">{{ c.userId || c.customerId || 'Sys' }}</div>
                  </div>
                </td>
              </ng-container>

              <!-- Subject / Message -->
              <ng-container matColumnDef="subject">
                <th mat-header-cell *matHeaderCellDef>Title/Desc</th>
                <td mat-cell *matCellDef="let c">
                  <div class="fw-semibold">{{ c.title || c.subject || '—' }}</div>
                  <div
                    class="small text-muted ellipsis"
                    [matTooltip]="c.description || c.message || ''"
                    matTooltipPosition="above"
                  >
                    {{ c.description || c.message || '' }}
                  </div>
                  <div class="small text-muted" *ngIf="c.category">#{{ c.category }}</div>
                </td>
              </ng-container>

              <!-- Priority -->
              <ng-container matColumnDef="priority">
                <th mat-header-cell *matHeaderCellDef>Priority</th>
                <td mat-cell *matCellDef="let c">
                  <div class="cell-center">
                    <span class="prio prio-{{ (c.priority || 'LOW').toLowerCase() }}">
                      {{ (c.priority || 'LOW') }}
                    </span>
                  </div>
                </td>
              </ng-container>

              <!-- Status -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let c">
                  <div class="cell-center fw-semibold status-txt">
                     {{ c.status }}
                  </div>
                </td>
              </ng-container>

              <!-- Ref ID -->
              <ng-container matColumnDef="assignee">
                <th mat-header-cell *matHeaderCellDef>Ref. Number</th>
                <td mat-cell *matCellDef="let c">
                  <div class="cell-center text-muted small">{{ c.referenceNumber }}</div>
                </td>
              </ng-container>

              <!-- Created -->
              <ng-container matColumnDef="updated">
                <th mat-header-cell *matHeaderCellDef>Created</th>
                <td mat-cell *matCellDef="let c">
                  <div class="cell-center text-muted small">{{ displayUpdated(c.createdAt) }}</div>
                </td>
              </ng-container>

              <!-- Actions -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let c">
                  <div class="cell-center">
                    <div class="d-grid d-md-block">
                      <button mat-stroked-button color="primary" class="apply-btn action-btn w-100 w-md-auto" (click)="startEdit(c)">
                        Action
                      </button>
                    </div>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols; trackBy: trackById"></tr>
            </table>

            <div class="empty" *ngIf="!dataSource.data.length && !loading">
              <div class="stat-icon indigo">🎫</div>
              <div class="fw-bold mt-2">No complaints found</div>
              <div class="text-muted small">Adjust filters to see results.</div>
            </div>
            <div class="p-4 text-center text-muted small" *ngIf="loading">
              Loading complaints data...
            </div>
          </div>
        </div>
      </div>

      <div class="text-center mt-4 small text-muted">
        © 2026 Hotel Booking System
      </div>
    </div>
  </div>
  `,
  styles: [`
    .dash-bg{
      background:
        radial-gradient(1000px 500px at 10% 10%, rgba(79, 70, 229, 0.08), transparent 60%),
        radial-gradient(900px 450px at 90% 20%, rgba(6, 182, 212, 0.08), transparent 55%),
        radial-gradient(700px 400px at 50% 100%, rgba(34, 197, 94, 0.05), transparent 55%),
        var(--app-bg);
      padding-bottom: 16px;
      border-radius: 18px;
      min-height: calc(100vh - 64px);
    }

    .hero{
      background: #fff !important;
      border: 1px solid var(--app-border);
      border-radius: 18px;
      box-shadow: 0 10px 25px rgba(2, 8, 23, 0.08);
      position: relative;
      overflow: hidden;
    }
    .hero::before, .hero::after{ content:none !important; display:none !important; }
    .kicker{
      display:inline-flex; align-items:center; gap:8px;
      font-size:12px; font-weight:800; letter-spacing:.08em; text-transform:uppercase;
      color: rgba(15,23,42,0.55); margin-bottom: 6px;
    }
    .title{ letter-spacing:-0.01em; }
    .hero-badge{
      display:inline-flex; align-items:center; gap:8px;
      padding:10px 12px; border-radius:999px;
      border:1px solid rgba(15,23,42,0.08);
      background: rgba(15,23,42,0.02); white-space:nowrap;
    }
    .badge-dot{ width:8px; height:8px; border-radius:999px; background: var(--app-secondary); }
    .pill-badge{
      border-radius:999px; padding:6px 10px; font-weight:700; color: rgba(15,23,42,0.7);
    }
    .apply-btn{
      border-color: rgba(79,70,229,0.35) !important;
      color: var(--app-primary) !important;
      border-radius: 999px !important;
      height: 40px;
    }
    .form-card{
      border: 1px solid var(--app-border);
      border-radius: 14px;
      background: #fff;
      padding: 12px;
    }
    .action-ico{
      width:42px; height:42px; border-radius:14px;
      display:grid; place-items:center; font-size:18px;
      background: linear-gradient(135deg, rgba(79,70,229,0.10), rgba(6,182,212,0.08));
      border: 1px solid rgba(79,70,229,0.16);
      flex:0 0 42px;
    }
    .action-title{ font-weight:900; line-height:1.1; }
    .action-sub{ font-size:12px; color: rgba(15,23,42,0.60); margin-top:3px; }

    .table-wrap-scroll{ width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .table-wrap{
      border: 1px solid var(--app-border); border-radius: 14px; overflow: hidden; background: #fff;
      min-width: 720px;
    }
    table{ border-collapse: separate; border-spacing: 0; width: 100%; }

    th.mat-mdc-header-cell, td.mat-mdc-cell{
      text-align: center; vertical-align: middle; padding: 14px 16px !important;
    }
    th{
      background: rgba(15,23,42,0.02); color: rgba(15,23,42,0.70);
      font-weight: 800; letter-spacing: .04em; text-transform: uppercase; font-size: 12px;
    }
    .mat-mdc-header-row, .mat-mdc-row{ border-bottom: 1px solid var(--app-border); }

    td.mat-mdc-cell .cell-center { display: flex; align-items: center; justify-content: center; width: 100%; }

    .actions{ display:flex; justify-content:center; gap:8px; }

    .status-ff { width: 180px; margin: 0 auto; --mat-form-field-subscript-text-line-height: 0; }
    .status-ff .mat-mdc-text-field-wrapper, .status-ff .mat-mdc-form-field-flex { height: 36px; align-items: center; }
    .status-ff .mat-mdc-form-field-infix { padding-top: 0 !important; padding-bottom: 0 !important; }
    .status-ff .mat-mdc-select-trigger { display: flex; align-items: center; min-height: 0; }
    .status-ff .mat-mdc-form-field-subscript-wrapper { display: none; }
    .status-ff .mdc-notched-outline__leading, .status-ff .mdc-notched-outline__notch, .status-ff .mdc-notched-outline__trailing {
      box-shadow: none !important;
    }

    .action-btn { height: 36px; line-height: 36px; padding: 0 14px; border-radius: 999px !important;
      display: inline-flex; align-items: center; justify-content: center; }

    .empty{
      padding: 36px 16px; display:flex; flex-direction:column; align-items:center; text-align:center;
      color: rgba(15,23,42,0.7);
    }
    .stat-icon{
      width:44px; height:44px; border-radius:14px; display:grid; place-items:center; font-size:18px;
      border:1px solid rgba(15,23,42,0.06); background: rgba(15,23,42,0.02);
    }
    .stat-icon.indigo{ background: rgba(79,70,229,0.10); border-color: rgba(79,70,229,0.18); }

    .d-grid{ display: grid; }
    .d-md-block{ display: block; }
    @media (min-width: 768px){
      .d-md-block{ display: inline-block; }
      .w-md-auto{ width: auto; }
    }
    .w-100{ width: 100%; }

    .prio{
      display:inline-flex; align-items:center; padding:4px 8px; border-radius:999px;
      font-size:12px; font-weight:700; border:1px solid transparent;
    }
    .prio-low{ background: rgba(34,197,94,0.10); color:#14532d; border-color: rgba(34,197,94,0.18); }
    .prio-medium{ background: rgba(6,182,212,0.10); color:#0e7490; border-color: rgba(6,182,212,0.18); }
    .prio-high{ background: rgba(245,158,11,0.10); color:#92400e; border-color: rgba(245,158,11,0.22); }
    .prio-urgent{ background: rgba(239,68,68,0.10); color:#7f1d1d; border-color: rgba(239,68,68,0.22); }

    /* helper: clamp message preview to one line */
    .ellipsis{
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    /* --- Responsive enhancements for the Edit form (no layout changes) --- */

/* Ensure form fields naturally take available width */
.form-card mat-form-field { width: 100%; }

/* Compact selects inside the inline Status field remain tidy */
.status-field .mat-mdc-text-field-wrapper,
.status-field .mat-mdc-form-field-flex {
  align-items: center;
}

/* Make the inline status field selectable width-friendly */
@media (max-width: 992px) {
  .status-ff { width: 100%; } /* In table quick-change select */
}

/* Small screens: stack form columns to full width and make actions tap-friendly */
@media (max-width: 768px) {
  /* Force all columns inside the form to span full width */
  .form-card .col-12,
  .form-card .col-md-3,
  .form-card .col-md-6 {
    flex: 0 0 100%;
    max-width: 100%;
  }

  /* Close/Reload/etc. buttons become full width on small screens */
  .form-card .d-md-block { display: grid !important; }
  .form-card .w-md-auto { width: 100% !important; }
  .apply-btn { width: 100%; }

  /* Form action buttons (Cancel/Save) stack and fill width nicely */
  .form-card .d-flex.justify-content-end.gap-2 {
    gap: 8px;
  }
  .form-card .d-flex.justify-content-end.gap-2 > button {
    width: 100%;
  }

  /* Status field inside the form stays readable */
  .status-field .mat-mdc-form-field-infix {
    padding-top: 8px !important;
    padding-bottom: 8px !important;
  }

  /* Give textarea a comfortable min height on mobile */
  .form-card textarea[matInput] {
    min-height: 120px;
  }
}

/* Slightly larger breakpoint to avoid awkward mid-width wrapping */
@media (max-width: 576px) {
  .hero-badge { width: 100%; justify-content: center; }
}

  `]
})
export class StaffComplaintsComponent {
  loading = false;

  constructor(
    private complaints: NewComplaintService,
    private fb: NonNullableFormBuilder,
    private cdr: ChangeDetectorRef,
    private snack: MatSnackBar,
    private auth: AuthService
  ) {
    this.reload();
  }

  // Raw rows
  dataSource = new MatTableDataSource<Complaint>([]);

  // Pagination
  page = 0;
  size = 10;
  pageInfo = {
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: 10,
    first: true,
    last: true
  };

  // Filters
  query = '';
  statusFilter: StatusFilter = 'OPEN';
  priorityFilter: PriorityFilter = '';

  cols = ['customer', 'subject', 'priority', 'status', 'assignee', 'updated', 'actions'] as const;

  // Edit form
  showForm = false;
  editingId: string | number | null = null;
  editingUserId: string | number | null = null;

  editForm = this.fb.group({
      subject: this.fb.control({ value: '', disabled: true }),
      status: this.fb.control<ComplaintStatus | ''>('', [Validators.required]),
      priority: this.fb.control<Priority | ''>('MEDIUM', [Validators.required]),
      expectedResolutionDate: this.fb.control(''),
      resolutionNote: this.fb.control('', [Validators.required])
  });

  reload() {
    this.page = 0;
    this.fetchData();
  }

  async fetchData() {
    this.loading = true;
    this.cdr.markForCheck();
    try {
      const resp = await this.complaints.getAllComplaints({
        page: this.page,
        size: this.size,
        status: this.statusFilter || undefined
      });

      this.dataSource.data = resp.content || [];
      this.pageInfo = {
        totalElements: resp.totalElements,
        totalPages: resp.totalPages,
        number: resp.number,
        size: resp.size,
        first: resp.first,
        last: resp.last
      };
    } catch (err: any) {
      this.snack.open(err.error?.message || 'Failed to load complaints', 'OK', { duration: 3000 });
      this.dataSource.data = [];
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  applyFilters() { this.reload(); }

  setQuery(v: string)              { this.query        = v; this.reload(); }
  setStatusFilter(v: StatusFilter) { this.statusFilter = v; this.reload(); }
  setPriorityFilter(v: PriorityFilter) { this.priorityFilter = v; this.reload(); }
  clearFilters()                   { this.query = ''; this.statusFilter = 'OPEN'; this.priorityFilter = ''; this.reload(); }


  prevPage() {
    if (!this.pageInfo.first) {
      this.page--;
      this.fetchData();
    }
  }

  nextPage() {
    if (!this.pageInfo.last) {
      this.page++;
      this.fetchData();
    }
  }

  // ---------- computed ----------
  get openCount(): number {
    return this.pageInfo.totalElements; // Approximate since backend does the count if filtered to OPEN
  }

  // ---------- table helpers ----------
  trackById = (_: number, row: Complaint) => (row as any).referenceNumber;

  userIdOf(row: any): string | number | null {
    return row.userId || row.customerId || 'SYS';
  }

  displayUpdated(ts: any): string {
    if (!ts) return '—';
    const d = new Date(ts);
    if (!d || isNaN(d.getTime())) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d);
    } catch {
      return d.toISOString().slice(0,10);
    }
  }

  // ---------- edit flow ----------
  startEdit(c: any) {
    this.editingId = c.referenceNumber;
    this.editingUserId = this.userIdOf(c);

    this.editForm.reset({
      subject: c.title || c.subject || '',
      status: c.status as ComplaintStatus,
      priority: (c.priority || 'MEDIUM') as Priority,
      expectedResolutionDate: c.expectedResolutionDate || '',
      resolutionNote: ''
    }, { emitEvent: false });

    this.showForm = true;
    this.cdr.markForCheck();
  }

  cancelEdit() {
    this.showForm = false;
    this.editingId = null;
    this.editingUserId = null;
    this.cdr.markForCheck();
  }

  async saveEdit() {
    if (this.editForm.invalid || this.editingId === null) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.editForm.getRawValue();
    this.loading = true;

    try {
      if (v.status) {
        const currentUser = this.auth.user();
        const staffId = currentUser ? Number(currentUser.id) : 1;

        await this.complaints.staffAction({
           complaintId: Number(this.editingId),
           staffId: staffId,
           status: v.status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED',
           actionNote: v.resolutionNote || 'Status Updated'
        });
      }
      this.snack.open('Complaint updated', 'OK', { duration: 2500 });
      this.cancelEdit();
      await this.fetchData();
    } catch (err: any) {
      this.snack.open(err.error?.message || 'Update failed', 'OK', { duration: 3000 });
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  // ---------- utils ----------
  getUserId(u: any): string | number | undefined { return u?.id ?? u?._id ?? u?.userId ?? u?.uid; }
  private safeArray(v: any): any[] { return Array.isArray(v) ? v : []; }

  private toDate(v: any): Date | undefined {
    if (v === null || v === undefined || v === '') return undefined;
    if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
    if (typeof v === 'number') { const d = new Date(v); return isNaN(d.getTime()) ? undefined : d; }
    if (typeof v === 'string') {
      const n = Number(v);
      if (Number.isFinite(n) && v.trim() !== '') { const d = new Date(n); if (!isNaN(d.getTime())) return d; }
      const d = new Date(v); return isNaN(d.getTime()) ? undefined : d;
    }
    const d = new Date(v); return isNaN(d.getTime()) ? undefined : d;
  }
}
