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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

// Optional – mirrors how you show names in other screens
import { UserService } from '../../../core/services/user.service';

type HKStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';
type HKPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface Task {
  id: string | number;
  title: string;
  description?: string;
  status: HKStatus;
}

type StatusFilter = '' | HKStatus;
type PriorityFilter = '' | HKPriority;

/** Local metadata for tasks (kept in-memory to avoid backend coupling) */
interface TaskMeta {
  priority?: HKPriority;
  room?: string;
  dueAt?: string;            // ISO string
  assignedToId?: string | number;
  completionNote?: string;   // required when DONE
  updatedAt?: string;        // ISO string
}

/** Validation: completion note required when DONE; due not in past for OPEN/IN_PROGRESS */
function taskEditValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const status = group.get('status')?.value as HKStatus | null;
    const completion = (group.get('completionNote')?.value as string | '')?.trim();
    const due = group.get('dueAt')?.value as Date | string | null;

    // Completion note rule
    if (status === 'DONE' && !completion) {
      return { completionRequired: true };
    }

    // Due date rule (ignore if no due)
    if (due && (status === 'OPEN' || status === 'IN_PROGRESS')) {
      const dueDate = toDate(due);
      const today = new Date();
      // normalize to start of day (no time stringency)
      if (dueDate) {
        const d0 = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (d0.getTime() < t0.getTime()) {
          return { dueInPast: true };
        }
      }
    }

    return null;
  };
}

/** Utility: safe toDate for the validator above */
function toDate(v: any): Date | undefined {
  if (v == null || v === '') return undefined;
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
  if (typeof v === 'number') { const d = new Date(v); return isNaN(d.getTime()) ? undefined : d; }
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n) && v.trim() !== '') { const d = new Date(n); if (!isNaN(d.getTime())) return d; }
    const d = new Date(v); return isNaN(d.getTime()) ? undefined : d;
  }
  const d = new Date(v); return isNaN(d.getTime()) ? undefined : d;
}

@Component({
  standalone: true,
  selector: 'app-housekeeping-tasks',
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
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
  <div class="dash-bg">
    <div class="container-fluid p-0">

      <!-- HERO -->
      <div class="app-card p-3 p-md-4 mb-4 hero">
        <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <div>
            <div class="kicker">Staff Portal</div>
            <h2 class="fw-bold mb-1 title">Housekeeping Tasks</h2>
            <p class="text-muted mb-0">
              Plan, assign, and track room tasks with priorities and due dates.
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
              <mat-label>Search (title/room)</mat-label>
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
                <mat-option value="DONE">Done</mat-option>
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
          Showing {{ dataSource.filteredData.length }} of {{ rows.length }} tasks.
        </div>
      </div>

      <!-- MAIN CARD: Edit form + Table -->
      <div class="app-card p-3 p-md-4">

        <div class="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
          <h5 class="fw-bold mb-0">Tasks</h5>
          <div class="d-grid d-md-block">
            <button mat-stroked-button class="apply-btn w-100 w-md-auto" type="button" (click)="reload()">Reload</button>
          </div>
        </div>

        <!-- EDIT FORM -->
        <div class="mb-3" *ngIf="showForm">
          <div class="form-card">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <div class="d-flex align-items-center gap-2">
                <div class="action-ico">🧹</div>
                <div>
                  <div class="action-title">Update Task</div>
                  <div class="action-sub">Provide required details to change status</div>
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
                  <input matInput formControlName="title" maxlength="80" />
                  <mat-error *ngIf="editForm.controls.title.hasError('required')">Title is required</mat-error>
                  <mat-error *ngIf="editForm.controls.title.hasError('minlength')">Title is too short</mat-error>
                </mat-form-field>
              </div>

              <div class="col-12 col-md-6">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Room</mat-label>
                  <input matInput formControlName="room" maxlength="16" placeholder="e.g., 101 or B2-12" />
                </mat-form-field>
              </div>

              <div class="col-12">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Description</mat-label>
                  <textarea matInput rows="3" formControlName="description" maxlength="300" placeholder="Optional details"></textarea>
                </mat-form-field>
              </div>

              <div class="col-12 col-md-3">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Status</mat-label>
                  <mat-select formControlName="status" required>
                    <mat-option value="OPEN">Open</mat-option>
                    <mat-option value="IN_PROGRESS">In Progress</mat-option>
                    <mat-option value="DONE">Done</mat-option>
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
                  <mat-label>Due date</mat-label>
                  <input matInput [matDatepicker]="picker" formControlName="dueAt" placeholder="Select a date" />
                  <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                  <mat-datepicker #picker></mat-datepicker>
                  <mat-error *ngIf="editForm.hasError('dueInPast')">Due date cannot be in the past</mat-error>
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
                  <mat-label>Completion notes (required when Done)</mat-label>
                  <textarea matInput rows="3" formControlName="completionNote" placeholder="What was done?"></textarea>
                  <mat-error *ngIf="editForm.hasError('completionRequired')">
                    Add completion notes to mark as Done
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

              <!-- Room -->
              <ng-container matColumnDef="room">
                <th mat-header-cell *matHeaderCellDef>Room</th>
                <td mat-cell *matCellDef="let t">
                  <div class="cell-center">{{ metaOf(t.id).room || '—' }}</div>
                </td>
              </ng-container>

              <!-- Title / Description -->
              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef>Task</th>
                <td mat-cell *matCellDef="let t">
                  <div class="fw-semibold">{{ t.title || '—' }}</div>
                  <div
                    class="small text-muted ellipsis"
                    [matTooltip]="t.description || ''"
                    matTooltipPosition="above"
                  >
                    {{ t.description || '' }}
                  </div>
                </td>
              </ng-container>

              <!-- Priority -->
              <ng-container matColumnDef="priority">
                <th mat-header-cell *matHeaderCellDef>Priority</th>
                <td mat-cell *matCellDef="let t">
                  <div class="cell-center">
                    <span class="prio prio-{{ (metaOf(t.id).priority || 'MEDIUM').toLowerCase() }}">
                      {{ (metaOf(t.id).priority || 'MEDIUM') }}
                    </span>
                  </div>
                </td>
              </ng-container>

              <!-- Status (quick change) -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let t">
                  <div class="cell-center">
                    <mat-form-field appearance="outline" class="status-ff">
                      <mat-select [value]="t.status" (selectionChange)="onStatusQuickChange(t, $event.value)">
                        <mat-option value="OPEN">Open</mat-option>
                        <mat-option value="IN_PROGRESS">In Progress</mat-option>
                        <mat-option value="DONE">Done</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                </td>
              </ng-container>

              <!-- Assignee -->
              <ng-container matColumnDef="assignee">
                <th mat-header-cell *matHeaderCellDef>Assignee</th>
                <td mat-cell *matCellDef="let t">
                  <div class="cell-center">{{ displayAssignee(t.id) }}</div>
                </td>
              </ng-container>

              <!-- Due -->
              <ng-container matColumnDef="due">
                <th mat-header-cell *matHeaderCellDef>Due</th>
                <td mat-cell *matCellDef="let t">
                  <div class="cell-center">{{ displayDue(t.id) }}</div>
                </td>
              </ng-container>

              <!-- Updated -->
              <ng-container matColumnDef="updated">
                <th mat-header-cell *matHeaderCellDef>Updated</th>
                <td mat-cell *matCellDef="let t">
                  <div class="cell-center">{{ displayUpdated(t.id) }}</div>
                </td>
              </ng-container>

              <!-- Actions -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let t">
                  <div class="cell-center">
                    <div class="d-grid d-md-block">
                      <button mat-stroked-button class="apply-btn action-btn w-100 w-md-auto" (click)="startEdit(t)">Edit</button>
                    </div>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols; trackBy: trackById"></tr>
            </table>

            <div class="empty" *ngIf="!dataSource.filteredData.length">
              <div class="stat-icon indigo">🧹</div>
              <div class="fw-bold mt-2">No tasks found</div>
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

    /* helper: clamp description preview to one line */
    .ellipsis{
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* --- Responsive enhancements for the Edit form (no layout changes) --- */
    .form-card mat-form-field { width: 100%; }

    @media (max-width: 992px) {
      .status-ff { width: 100%; }
    }

    @media (max-width: 768px) {
      .form-card .col-12,
      .form-card .col-md-3,
      .form-card .col-md-6 {
        flex: 0 0 100%;
        max-width: 100%;
      }
      .form-card .d-md-block { display: grid !important; }
      .form-card .w-md-auto { width: 100% !important; }
      .apply-btn { width: 100%; }
      .form-card .d-flex.justify-content-end.gap-2 > button { width: 100%; }
      .form-card textarea[matInput] { min-height: 120px; }
    }

    @media (max-width: 576px) {
      .hero-badge { width: 100%; justify-content: center; }
    }
  `]
})
export class HousekeepingTasksComponent {
  private fb = inject(NonNullableFormBuilder);
  private cdr = inject(ChangeDetectorRef);

  // Optional service to show assignee names like your other screens
  constructor(private users: UserService) {
    this.initFilterPredicate();
    this.reload();
  }

  // Base data – can be replaced by a service later
  rows: Task[] = [
    { id: 'T1', title: 'Clean Room 101', description: 'Bedsheets + bathroom', status: 'OPEN' },
    { id: 'T2', title: 'Restock towels', description: 'Floor 2 store', status: 'IN_PROGRESS' },
    { id: 'T3', title: 'Sanitize Room 209', description: 'Deep clean', status: 'OPEN' }
  ];

  // Data source for MatTable
  dataSource = new MatTableDataSource<Task>([]);

  // Locally enhanced metadata
  private metas = new Map<string | number, TaskMeta>();

  // Staff options + cache (no repeated lookups)
  staffOptions: any[] = [];
  private userNameCache = new Map<string | number, string>();

  // Filters
  query = '';
  statusFilter: StatusFilter = '';
  priorityFilter: PriorityFilter = '';

  cols = ['room', 'title', 'priority', 'status', 'assignee', 'due', 'updated', 'actions'] as const;

  // Edit
  showForm = false;
  editingId: string | number | null = null;

  editForm: FormGroup<{
    title: FormControl<string>;
    description: FormControl<string>;
    status: FormControl<HKStatus | ''>;
    priority: FormControl<HKPriority | ''>;
    room: FormControl<string>;
    dueAt: FormControl<Date | null>;
    assignedToId: FormControl<string | number | ''>;
    completionNote: FormControl<string>;
  }> = this.fb.group(
    {
      title: this.fb.control('', { validators: [Validators.required, Validators.minLength(3)] }),
      description: this.fb.control(''),
      status: this.fb.control<HKStatus | ''>('', [Validators.required]),
      priority: this.fb.control<HKPriority | ''>('MEDIUM', [Validators.required]),
      room: this.fb.control(''),
      dueAt: this.fb.control<Date | null>(null),
      assignedToId: this.fb.control<string | number | ''>(''),
      completionNote: this.fb.control('')
    },
    { validators: [taskEditValidator()] }
  );

  // -------- lifecycle --------
  reload() { this.refresh(); }

  refresh() {
    // seed minimal metas if missing
    for (const t of this.rows) {
      const m = this.metaOf(t.id);
      if (!m.updatedAt) {
        // set default values
        this.setMeta(t.id, {
          updatedAt: new Date().toISOString(),
          priority: m.priority || 'MEDIUM',
          room: m.room || (String(t.title || '').match(/\b\d{3}\b/)?.[0] ?? undefined)
        });
      }
    }

    // cache users / staff options (optional)
    const allUsers = this.safeArray(this.users.list?.() ?? []);
    this.staffOptions = allUsers.filter((u: any) => {
      const role = String(u?.role ?? '').toUpperCase();
      return role === 'STAFF' || role === 'ADMIN' || role === 'HOUSEKEEPING';
    });
    this.userNameCache.clear();
    for (const u of allUsers) {
      const id = this.getUserId(u);
      if (id !== undefined) {
        const name = u?.fullName ?? u?.email ?? String(id);
        this.userNameCache.set(id, name);
      }
    }

    this.dataSource.data = this.rows;
    this.applyFilters();
    this.cdr.markForCheck();
  }

  // -------- filters --------
  setQuery(v: string) { this.query = v; this.applyFilters(); }
  setStatusFilter(v: StatusFilter) { this.statusFilter = v; this.applyFilters(); }
  setPriorityFilter(v: PriorityFilter) { this.priorityFilter = v; this.applyFilters(); }
  clearFilters() { this.query = ''; this.statusFilter = ''; this.priorityFilter = ''; this.applyFilters(); }

  private initFilterPredicate() {
    this.dataSource.filterPredicate = (t: Task, filterJson: string) => {
      const f = JSON.parse(filterJson) as { q: string; status: StatusFilter; priority: PriorityFilter };
      const statusOk = !f.status || t.status === f.status;
      const pr = (this.metaOf(t.id).priority || 'MEDIUM') as HKPriority;
      const prOk = !f.priority || pr === f.priority;
      if (!statusOk || !prOk) return false;

      const q = (f.q || '').toLowerCase().trim();
      if (!q) return true;

      const title = (t.title || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const room = (this.metaOf(t.id).room || '').toLowerCase();

      return title.includes(q) || desc.includes(q) || room.includes(q);
    };
  }

  private applyFilters() {
    this.dataSource.filter = JSON.stringify({ q: this.query, status: this.statusFilter, priority: this.priorityFilter });
    this.cdr.markForCheck();
  }

  // -------- computed --------
  get openCount(): number {
    return this.rows.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
  }

  // -------- table helpers --------
  trackById = (_: number, row: Task) => row.id;

  metaOf(id: string | number): TaskMeta { return this.metas.get(id) || {}; }
  setMeta(id: string | number, patch: TaskMeta) {
    const cur = this.metas.get(id) || {};
    this.metas.set(id, { ...cur, ...patch });
  }

  displayAssignee(id: string | number): string {
    const assignedId = this.metaOf(id).assignedToId;
    if (!assignedId) return '—';
    return this.userNameCache.get(assignedId) ?? (this.users as any).byId?.(assignedId)?.fullName ?? String(assignedId);
  }

  displayDue(id: string | number): string {
    const iso = this.metaOf(id).dueAt;
    if (!iso) return '—';
    const d = toDate(iso);
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d);
    } catch {
      return d.toISOString().slice(0,10);
    }
  }

  displayUpdated(id: string | number): string {
    const ts = this.metaOf(id).updatedAt;
    if (!ts) return '—';
    const d = toDate(ts);
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d);
    } catch {
      return d.toISOString().slice(0,10);
    }
  }

  // -------- quick status change --------
  onStatusQuickChange(t: Task, newStatus: HKStatus) {
    // If moving to DONE, require completion note (guard)
    if (newStatus === 'DONE' && !(this.metaOf(t.id).completionNote || '').trim()) {
      this.startEdit(t);
      this.editForm.controls.status.setValue(newStatus, { emitEvent: false });
      return;
    }
    this.setStatus(t, newStatus);
  }

  // -------- edit flow --------
  startEdit(t: Task) {
    const m = this.metaOf(t.id);

    const dueValue: Date | null = (() => {
      const d = m.dueAt ? toDate(m.dueAt) : undefined;
      return d || null;
    })();

    this.editingId = t.id;
    this.editForm.reset({
      title: t.title || '',
      description: t.description || '',
      status: t.status,
      priority: (m.priority || 'MEDIUM') as HKPriority,
      room: m.room || '',
      dueAt: dueValue,
      assignedToId: (m.assignedToId ?? '') as any,
      completionNote: m.completionNote || ''
    }, { emitEvent: false });

    this.showForm = true;
    this.cdr.markForCheck();
  }

  cancelEdit() {
    this.showForm = false;
    this.editingId = null;
    this.cdr.markForCheck();
  }

  saveEdit() {
    if (this.editForm.invalid || this.editingId === null) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.editForm.getRawValue();
    const idx = this.rows.findIndex(x => x.id === this.editingId);
    if (idx >= 0) {
      // Update base task
      this.rows[idx] = {
        ...this.rows[idx],
        title: (v.title || '').trim(),
        description: (v.description || '').trim(),
        status: (v.status || 'OPEN') as HKStatus
      };
    }

    // Update metas
    this.setMeta(this.editingId, {
      priority: (v.priority || 'MEDIUM') as HKPriority,
      room: (v.room || '').trim() || undefined,
      dueAt: v.dueAt ? new Date(v.dueAt).toISOString() : undefined,
      assignedToId: v.assignedToId || undefined,
      completionNote: (v.completionNote || '').trim() || undefined,
      updatedAt: new Date().toISOString()
    });

    // Refresh view
    this.dataSource.data = this.rows;
    this.applyFilters();
    this.cancelEdit();
  }

  setStatus(t: Task, status: HKStatus) {
    // simple update + updated timestamp
    t.status = status;
    this.setMeta(t.id, { updatedAt: new Date().toISOString() });
    this.dataSource.data = this.rows;
    this.applyFilters();
  }

  // -------- utils --------
  getUserId(u: any): string | number | undefined { return u?.id ?? u?._id ?? u?.userId ?? u?.uid; }
  private safeArray(v: any): any[] { return Array.isArray(v) ? v : []; }
}