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

import { ComplaintService } from '../../../core/services/complaint.service';
import { UserService } from '../../../core/services/user.service';
import { Complaint, ComplaintStatus } from '../../../core/models/models';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type StatusFilter = '' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type PriorityFilter = '' | Priority;

/** Local metadata kept in-memory if backend does not support these fields */
interface ComplaintMeta {
  priority?: Priority;
  category?: string;
  assignedToId?: string | number;
  resolutionNote?: string;
  updatedAt?: string; // iso
}

/** Validator: resolution note is required when status is RESOLVED or CLOSED */
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
  selector: 'app-complaints-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
            <div class="kicker">Admin Portal</div>
            <h2 class="fw-bold mb-1 title">Complaints Overview</h2>
            <p class="text-muted mb-0">
              Track complaints and update status with validation and assignment.
            </p>
          </div>

          <div class="hero-badge">
            <span class="badge-dot"></span>
            <span class="text-muted small">Open:</span>
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
              (click)="clearFilters()"
              [disabled]="!query && !statusFilter && !priorityFilter"
            >
              Clear
            </button>
          </div>
        </div>

        <div class="text-muted small mt-2">
          Showing {{ dataSource.filteredData.length }} of {{ rows.length }} complaints.
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
                  <mat-label>Subject</mat-label>
                  <input matInput formControlName="subject" readonly />
                </mat-form-field>
              </div>

              <div class="col-12 col-md-6">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Customer</mat-label>
                  <input matInput [value]="displayCustomer(editingUserId)" readonly />
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
                  <mat-label>Category (optional)</mat-label>
                  <input matInput formControlName="category" maxlength="48" placeholder="e.g., Housekeeping, Billing" />
                </mat-form-field>
              </div>

              <div class="col-12 col-md-3">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Assign to (optional)</mat-label>
                  <mat-select formControlName="assignedToId">
                    <mat-option [value]="''">Unassigned</mat-option>
                    <mat-option *ngFor="let s of staffOptions" [value]="getUserId(s)">
                      {{ s.fullName || s.email || 'Staff' }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="col-12">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Resolution notes (required for Resolved/Closed)</mat-label>
                  <textarea matInput rows="3" formControlName="resolutionNote" placeholder="What was done to resolve?"></textarea>
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
                <th mat-header-cell *matHeaderCellDef>Customer</th>
                <td mat-cell *matCellDef="let c">
                  <div class="cell-center">
                    <div class="fw-semibold">{{ displayCustomer(c.userId) }}</div>
                  </div>
                </td>
              </ng-container>

              <!-- Subject -->
              <ng-container matColumnDef="subject">
                <th mat-header-cell *matHeaderCellDef>Subject</th>
                <td mat-cell *matCellDef="let c">
                  <div class="fw-semibold">{{ c.subject || '—' }}</div>
                  <div class="small text-muted" *ngIf="hasCategory(c)">{{ metaOf(c.id).category }}</div>
                </td>
              </ng-container>

              <!-- Priority -->
              <ng-container matColumnDef="priority">
                <th mat-header-cell *matHeaderCellDef>Priority</th>
                <td mat-cell *matCellDef="let c">
                  <div class="cell-center">
                    <span class="prio prio-{{ (metaOf(c.id).priority || 'MEDIUM').toLowerCase() }}">
                      {{ (metaOf(c.id).priority || 'MEDIUM') }}
                    </span>
                  </div>
                </td>
              </ng-container>

              <!-- Status (quick change) -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let c">
                  <div class="cell-center">
                    <mat-form-field appearance="outline" class="status-ff">
                      <mat-select [value]="c.status" (selectionChange)="onStatusQuickChange(c, $event.value)">
                        <mat-option value="OPEN">Open</mat-option>
                        <mat-option value="IN_PROGRESS">In Progress</mat-option>
                        <mat-option value="RESOLVED">Resolved</mat-option>
                        <mat-option value="CLOSED">Closed</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                </td>
              </ng-container>

              <!-- Assignee -->
              <ng-container matColumnDef="assignee">
                <th mat-header-cell *matHeaderCellDef>Assignee</th>
                <td mat-cell *matCellDef="let c">
                  <div class="cell-center">{{ displayAssignee(c.id) }}</div>
                </td>
              </ng-container>

              <!-- Updated -->
              <ng-container matColumnDef="updated">
                <th mat-header-cell *matHeaderCellDef>Updated</th>
                <td mat-cell *matCellDef="let c">
                  <div class="cell-center">{{ displayUpdated(c.id) }}</div>
                </td>
              </ng-container>

              <!-- Actions -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let c">
                  <div class="cell-center">
                    <div class="d-grid d-md-block">
                      <button mat-stroked-button class="apply-btn action-btn w-100 w-md-auto" (click)="startEdit(c)">Edit</button>
                    </div>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols; trackBy: trackById"></tr>
            </table>

            <div class="empty" *ngIf="!dataSource.filteredData.length">
              <div class="stat-icon indigo">🎫</div>
              <div class="fw-bold mt-2">No complaints found</div>
              <div class="text-muted small">Adjust filters to see results.</div>
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
      font-size:12px; font-weight:800;
      letter-spacing:.08em; text-transform:uppercase;
      color: rgba(15,23,42,0.55);
      margin-bottom: 6px;
    }
    .title{ letter-spacing:-0.01em; }

    .hero-badge{
      display:inline-flex; align-items:center; gap:8px;
      padding:10px 12px;
      border-radius:999px;
      border:1px solid rgba(15,23,42,0.08);
      background: rgba(15,23,42,0.02);
      white-space:nowrap;
    }
    .badge-dot{
      width:8px; height:8px; border-radius:999px;
      background: var(--app-secondary);
    }
    .pill-badge{
      border-radius:999px;
      padding:6px 10px;
      font-weight:700;
      color: rgba(15,23,42,0.7);
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
      display:grid; place-items:center;
      font-size:18px;
      background: linear-gradient(135deg, rgba(79,70,229,0.10), rgba(6,182,212,0.08));
      border: 1px solid rgba(79,70,229,0.16);
      flex:0 0 42px;
    }
    .action-title{ font-weight:900; line-height:1.1; }
    .action-sub{ font-size:12px; color: rgba(15,23,42,0.60); margin-top:3px; }

    /* ---- Table visibility / responsiveness ---- */
    .table-wrap-scroll{
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .table-wrap{
      border: 1px solid var(--app-border);
      border-radius: 14px;
      overflow: hidden;
      background: #fff;
      min-width: 720px;
    }
    table{ border-collapse: separate; border-spacing: 0; width: 100%; }

    th.mat-mdc-header-cell,
    td.mat-mdc-cell{
      text-align: center;
      vertical-align: middle;
      padding: 14px 16px !important;
    }

    th{
      background: rgba(15,23,42,0.02);
      color: rgba(15,23,42,0.70);
      font-weight: 800;
      letter-spacing: .04em;
      text-transform: uppercase;
      font-size: 12px;
    }
    .mat-mdc-header-row, .mat-mdc-row{
      border-bottom: 1px solid var(--app-border);
    }

    td.mat-mdc-cell .cell-center {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
    }

    .actions{ display:flex; justify-content:center; gap:8px; }

    .status-ff {
      width: 180px;
      margin: 0 auto;
      --mat-form-field-subscript-text-line-height: 0;
    }
    .status-ff .mat-mdc-text-field-wrapper,
    .status-ff .mat-mdc-form-field-flex {
      height: 36px;
      align-items: center;
    }
    .status-ff .mat-mdc-form-field-infix {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
    }
    .status-ff .mat-mdc-select-trigger {
      display: flex;
      align-items: center;
      min-height: 0;
    }
    .status-ff .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }
    .status-ff .mdc-notched-outline__leading,
    .status-ff .mdc-notched-outline__notch,
    .status-ff .mdc-notched-outline__trailing {
      box-shadow: none !important;
    }

    .action-btn {
      height: 36px;
      line-height: 36px;
      padding: 0 14px;
      border-radius: 999px !important;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .empty{
      padding: 36px 16px;
      display:flex; flex-direction:column; align-items:center; text-align:center;
      color: rgba(15,23,42,0.7);
    }
    .stat-icon{
      width:44px; height:44px; border-radius:14px;
      display:grid; place-items:center;
      font-size:18px;
      border:1px solid rgba(15,23,42,0.06);
      background: rgba(15,23,42,0.02);
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
      display:inline-flex; align-items:center;
      padding:4px 8px; border-radius:999px;
      font-size:12px; font-weight:700;
      border:1px solid transparent;
    }
    .prio-low{ background: rgba(34,197,94,0.10); color:#14532d; border-color: rgba(34,197,94,0.18); }
    .prio-medium{ background: rgba(6,182,212,0.10); color:#0e7490; border-color: rgba(6,182,212,0.18); }
    .prio-high{ background: rgba(245,158,11,0.10); color:#92400e; border-color: rgba(245,158,11,0.22); }
    .prio-urgent{ background: rgba(239,68,68,0.10); color:#7f1d1d; border-color: rgba(239,68,68,0.22); }
  `]
})
export class ComplaintsOverviewComponent {
  private fb = inject(NonNullableFormBuilder);
  private cdr = inject(ChangeDetectorRef);

  constructor(private complaints: ComplaintService, private users: UserService) {
    this.initFilterPredicate();
    this.reload();
  }

  // Raw rows from service
  rows: Complaint[] = [];
  // Stable data source for MatTable (prevents hang)
  dataSource = new MatTableDataSource<Complaint>([]);

  // Locally enhanced metadata
  private metas = new Map<string | number, ComplaintMeta>();

  // NEW: cache staff options once (no getter thrash)
  staffOptions: any[] = []; // NEW

  // NEW: tiny user-name cache to avoid repeated byId lookups during CD
  private userNameCache = new Map<string | number, string>(); // NEW

  // Filters
  query = '';
  statusFilter: StatusFilter = '';
  priorityFilter: PriorityFilter = '';

  cols = ['customer', 'subject', 'priority', 'status', 'assignee', 'updated', 'actions'] as const;

  // ---- Edit form ----
  showForm = false;
  editingId: string | number | null = null;
  editingUserId: string | number | null = null;

  editForm: FormGroup<{
    subject: FormControl<string>;
    status: FormControl<ComplaintStatus | ''>;
    priority: FormControl<Priority | ''>;
    category: FormControl<string>;
    assignedToId: FormControl<string | number | ''>;
    resolutionNote: FormControl<string>;
  }> = this.fb.group(
    {
      subject: this.fb.control({ value: '', disabled: false }),
      status: this.fb.control<ComplaintStatus | ''>('', [Validators.required]),
      priority: this.fb.control<Priority | ''>('MEDIUM', [Validators.required]),
      category: this.fb.control(''),
      assignedToId: this.fb.control<string | number | ''>(''),
      resolutionNote: this.fb.control('')
    },
    { validators: [resolutionNoteValidator()] }
  );

  // ---------- lifecycle / data ----------
  reload() { this.refresh(); }

  refresh() {
    this.rows = this.complaints.list();

    // ensure metas have at least updatedAt
    for (const c of this.rows) {
      const m = this.metaOf(c.id);
      if (!m.updatedAt) {
        this.setMeta(c.id, { updatedAt: new Date().toISOString(), priority: m.priority || 'MEDIUM' });
      }
    }

    // NEW: build caches once per refresh
    const allUsers = this.safeArray(this.users.list?.() ?? []);
    this.staffOptions = allUsers.filter((u: any) => {
      const role = String(u?.role ?? '').toUpperCase();
      return role === 'STAFF' || role === 'ADMIN';
    });
    this.userNameCache.clear();
    for (const u of allUsers) {
      const id = this.getUserId(u);
      if (id !== undefined) {
        const name = u?.fullName ?? u?.email ?? String(id);
        this.userNameCache.set(id, name);
      }
    }
    // ---- end caches ----

    this.dataSource.data = this.rows;
    this.applyFilters();
    this.cdr.markForCheck();
  }

  // ---------- filters handlers ----------
  setQuery(v: string) { this.query = v; this.applyFilters(); }
  setStatusFilter(v: StatusFilter) { this.statusFilter = v; this.applyFilters(); }
  setPriorityFilter(v: PriorityFilter) { this.priorityFilter = v; this.applyFilters(); }
  clearFilters() { this.query = ''; this.statusFilter = ''; this.priorityFilter = ''; this.applyFilters(); }

  // ---------- MatTable filtering (stable and fast) ----------
  private initFilterPredicate() {
    this.dataSource.filterPredicate = (c: Complaint, filterJson: string) => {
      const f = JSON.parse(filterJson) as { q: string; status: StatusFilter; priority: PriorityFilter };
      const statusOk = !f.status || c.status === f.status;
      const pr = (this.metaOf(c.id).priority || 'MEDIUM') as Priority;
      const prOk = !f.priority || pr === f.priority;
      if (!statusOk || !prOk) return false;

      const q = (f.q || '').toLowerCase().trim();
      if (!q) return true;

      const subj = (c.subject || '').toLowerCase();
      const cust = this.displayCustomer((c as any).userId).toLowerCase();
      return subj.includes(q) || cust.includes(q);
    };
  }

  private applyFilters() {
    // One stable string changes -> one pass of filter
    this.dataSource.filter = JSON.stringify({ q: this.query, status: this.statusFilter, priority: this.priorityFilter });
    this.cdr.markForCheck();
  }

  // ---------- computed ----------
  get openCount(): number {
    return this.rows.filter(c => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length;
  }

  // ---------- table helpers ----------
  trackById = (_: number, row: Complaint) => row.id;

  displayCustomer(userId: string | number | null | undefined): string {
    if (userId === undefined || userId === null) return 'Customer';
    // NEW: constant-time lookup, no repeated service calls
    return this.userNameCache.get(userId) ?? this.users.byId?.(userId as any)?.fullName ?? 'Customer';
  }

  hasCategory(c: Complaint): boolean { return !!this.metaOf(c.id).category; }

  metaOf(id: string | number): ComplaintMeta {
    return this.metas.get(id) || {};
  }
  setMeta(id: string | number, patch: ComplaintMeta) {
    const cur = this.metas.get(id) || {};
    this.metas.set(id, { ...cur, ...patch });
  }

  displayAssignee(id: string | number): string {
    const assignedId = this.metaOf(id).assignedToId;
    if (!assignedId) return '—';
    // Use cache if available, fall back to service
    return this.userNameCache.get(assignedId) ?? (this.users as any).byId?.(assignedId)?.fullName ?? String(assignedId);
  }

  displayUpdated(id: string | number): string {
    const ts = this.metaOf(id).updatedAt;
    if (!ts) return '—';
    const d = this.toDate(ts);
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d);
    } catch {
      return d.toISOString().slice(0,10);
    }
  }

  // Quick status change from table select
  onStatusQuickChange(c: Complaint, newStatus: ComplaintStatus) {
    if ((newStatus === 'RESOLVED' || newStatus === 'CLOSED') && !(this.metaOf(c.id).resolutionNote || '').trim()) {
      this.startEdit(c);
      this.editForm.controls.status.setValue(newStatus, { emitEvent: false }); // NEW: no emissions
      return;
    }
    this.setStatus(c, newStatus);
  }

  // ---------- edit flow ----------
  startEdit(c: Complaint) {
    this.editingId = c.id;
    this.editingUserId = (c as any).userId ?? null;

    const m = this.metaOf(c.id);
    // NEW: suppress value/status emissions while initializing the form
    this.editForm.reset({
      subject: c.subject || '',
      status: c.status as ComplaintStatus,
      priority: (m.priority || 'MEDIUM') as Priority,
      category: m.category || '',
      assignedToId: (m.assignedToId ?? '') as any,
      resolutionNote: m.resolutionNote || ''
    }, { emitEvent: false }); // NEW

    this.showForm = true;
    this.cdr.markForCheck();
  }

  cancelEdit() {
    this.showForm = false;
    this.editingId = null;
    this.editingUserId = null;
    this.cdr.markForCheck();
  }

  saveEdit() {
    if (this.editForm.invalid || this.editingId === null) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.editForm.getRawValue();

    if (v.status) {
      this.complaints.setStatus(this.editingId as any, v.status as ComplaintStatus);
    }

    this.setMeta(this.editingId, {
      priority: (v.priority || 'MEDIUM') as Priority,
      category: (v.category || '').trim() || undefined,
      assignedToId: v.assignedToId || undefined,
      resolutionNote: (v.resolutionNote || '').trim() || undefined,
      updatedAt: new Date().toISOString()
    });

    this.rows = this.complaints.list();
    this.dataSource.data = this.rows;
    this.applyFilters();
    this.cancelEdit();
  }

  setStatus(c: Complaint, status: ComplaintStatus) {
    this.complaints.setStatus(c.id, status);
    this.setMeta(c.id, { updatedAt: new Date().toISOString() });
    this.rows = this.complaints.list();
    this.dataSource.data = this.rows;
    this.applyFilters();
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