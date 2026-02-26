// src/app/features/admin/manage-bookings/manage-bookings.component.ts
import { Component, ViewChild, AfterViewInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import {
  ReactiveFormsModule,
  Validators,
  NonNullableFormBuilder,
  AbstractControl,
  ValidationErrors,
  FormGroup,
  FormControl,
} from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';

// Service as value import
import { BookingApiService, toDateOnly } from '../../../core/services/booking-api.service';

import type {
  AdminBookingRow,
  BookingStatus,
  PaginatedResponse,
} from '../../../core/services/booking-api.service';

import { RoomService } from '../../../core/services/room.service';
import { UserService } from '../../../core/services/user.service';

/** Cross-field validator: fromDate <= toDate */
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const from = group.get('fromDate')?.value as Date | undefined;
  const to = group.get('toDate')?.value as Date | undefined;
  if (!from || !to) return null;
  return from.getTime() <= to.getTime() ? null : { dateRange: true };
}

/** Optional enriched row for table rendering */
type BookingRow = AdminBookingRow & {
  createdAt?: string | number | Date;
  checkInDate?: string | number | Date;
  checkOutDate?: string | number | Date;
  roomId?: string | number;
  userId?: string | number;
};

@Component({
  standalone: true,
  selector: 'app-manage-bookings',
  imports: [
    CommonModule,
    ReactiveFormsModule,

    // Material
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatSortModule,
  ],
  template: `
  <div class="dash-bg">
    <div class="container-fluid p-0">

      <!-- HERO -->
      <div class="app-card p-3 p-md-4 mb-4 hero">
        <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <div>
            <div class="kicker">Admin Portal</div>
            <h2 class="fw-bold mb-1 title">Manage Bookings</h2>
            <p class="text-muted mb-0">
              Search, filter and manage hotel bookings with validated date range and status actions.
            </p>
          </div>

          <div class="hero-badge">
            <span class="badge-dot"></span>
            <span class="text-muted small">Total:</span>
            <span class="small fw-semibold">{{ totalBookings() }}</span>
          </div>
        </div>
      </div>

      <!-- FILTERS -->
      <div class="app-card p-3 p-md-4 mb-4">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h5 class="fw-bold mb-0">Quick Filters</h5>
          <span class="badge text-bg-light border pill-badge" *ngIf="filterForm.valid">Validated</span>
        </div>

        <form class="row g-3 align-items-center" [formGroup]="filterForm" (ngSubmit)="applyFilters()">
          <!-- Query -->
          <div class="col-12 col-md-4">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Search (booking id / customer / room)</mat-label>
              <input matInput formControlName="query" placeholder="Type to search…" />
            </mat-form-field>
          </div>

          <!-- Status -->
          <div class="col-6 col-md-2">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Status</mat-label>
              <mat-select formControlName="status">
                <mat-option value="">All</mat-option>
                <mat-option value="CONFIRMED">Confirmed</mat-option>
                <mat-option value="PENDING">Pending</mat-option>
                <mat-option value="CANCELLED">Cancelled</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- From Date -->
          <div class="col-6 col-md-3">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>From date</mat-label>
              <input matInput [matDatepicker]="dpFrom" formControlName="fromDate" required>
              <mat-datepicker-toggle matSuffix [for]="dpFrom"></mat-datepicker-toggle>
              <mat-datepicker #dpFrom></mat-datepicker>
              <mat-error *ngIf="filterForm.controls.fromDate.hasError('required')">From date is required</mat-error>
            </mat-form-field>
          </div>

          <!-- To Date -->
          <div class="col-6 col-md-3">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>To date</mat-label>
              <input matInput [matDatepicker]="dpTo" formControlName="toDate" required>
              <mat-datepicker-toggle matSuffix [for]="dpTo"></mat-datepicker-toggle>
              <mat-datepicker #dpTo></mat-datepicker>
              <mat-error *ngIf="filterForm.controls.toDate.hasError('required')">To date is required</mat-error>
              <mat-error *ngIf="filterForm.hasError('dateRange')">To date must be after (or same as) From date</mat-error>
            </mat-form-field>
          </div>

          <!-- Apply -->
          <div class="col-12 col-md-1 d-grid ms-md-auto text-md-end">
            <button mat-stroked-button class="apply-btn" type="submit" [disabled]="filterForm.invalid">
              Apply
            </button>
          </div>
        </form>

        <div class="text-muted small mt-2">
          Showing {{ dataSource.data.length }} of {{ totalBookings() }} bookings.
        </div>
      </div>

      <!-- CARD: Summary + Table -->
      <div class="app-card p-3 p-md-4">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h5 class="fw-bold mb-0">Bookings</h5>
          <div class="d-flex gap-2">
            <button mat-stroked-button class="apply-btn" (click)="resetFilters()">Reset</button>
            <button mat-stroked-button color="primary" class="apply-btn" (click)="reload()">Reload</button>
          </div>
        </div>

        <!-- Summary strip -->
        <div class="summary-row mb-3">
          <div class="summary-item">
            <div class="summary-label">Total bookings (page)</div>
            <div class="summary-value">{{ dataSource.data.length }}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total amount (page)</div>
            <div class="summary-value">
              {{ totalAmountFiltered | currency:'INR':'symbol':'1.0-0':'en-IN' }}
            </div>
          </div>
        </div>

        <!-- TABLE -->
        <div class="table-wrap">
          <table mat-table [dataSource]="dataSource" matSort class="w-100 bookings-table">

            <!-- Room -->
            <ng-container matColumnDef="room">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="th-center">Room</th>
              <td mat-cell *matCellDef="let b" class="td-center">
                <div class="cell-center">{{ room(b.roomId) }}</div>
              </td>
            </ng-container>

            <!-- Dates -->
            <ng-container matColumnDef="dates">
              <th mat-header-cell *matHeaderCellDef class="th-center">Dates</th>
              <td mat-cell *matCellDef="let b" class="td-center">
                <div class="cell-center nowrap">
                  {{ checkIn(b)  | date:'d MMM yyyy' }} → {{ checkOut(b) | date:'d MMM yyyy' }}
                </div>
              </td>
            </ng-container>

            <!-- Nights -->
            <ng-container matColumnDef="nights">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="th-center">Nights</th>
              <td mat-cell *matCellDef="let b" class="td-center">
                <div class="cell-center">{{ nights(b) }}</div>
              </td>
            </ng-container>

            <!-- Guests -->
            <ng-container matColumnDef="guests">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="th-center">Guests</th>
              <td mat-cell *matCellDef="let b" class="td-center">
                <div class="cell-center">{{ guests(b) }}</div>
              </td>
            </ng-container>

            <!-- Amount -->
            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="th-center">Amount</th>
              <td mat-cell *matCellDef="let b" class="td-center">
                <div class="cell-center">
                  {{ amountOf(b) | currency:'INR':'symbol':'1.0-0':'en-IN' }}
                </div>
              </td>
            </ng-container>

            <!-- Status -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef class="th-center">Status</th>
              <td mat-cell *matCellDef="let b" class="td-center">
                <div class="cell-center">
                  <span class="status-chip"
                        [ngClass]="{
                          'status-confirmed': isStatus(b, 'CONFIRMED'),
                          'status-pending'  : isStatus(b, 'PENDING'),
                          'status-cancelled': isStatus(b, 'CANCELLED')
                        }">
                    {{ (b.status || '') | uppercase }}
                  </span>
                </div>
              </td>
            </ng-container>

            <!-- Actions: Only Cancel -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="th-center">Actions</th>
              <td mat-cell *matCellDef="let b" class="td-center">
                <div class="cell-center actions-wrap">
                  <button
                    mat-stroked-button
                    color="warn"
                    class="action-btn"
                    (click)="cancel(b)"
                    [disabled]="isStatus(b, 'CANCELLED')"
                    [matTooltip]="isStatus(b,'CANCELLED') ? 'Already cancelled' : 'Cancel this booking'">
                    Cancel
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols" class="sticky"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;"></tr>

            <tr class="empty" *ngIf="dataSource.data.length === 0">
              <td [attr.colspan]="cols.length" class="text-center text-muted py-4">
                No bookings found for the selected filters.
              </td>
            </tr>
          </table>

          <mat-paginator
            [length]="total"
            [pageSize]="10"
            [pageSizeOptions]="[5,10,25,50]"
            showFirstLastButtons>
          </mat-paginator>
        </div>
      </div>

    </div>
  </div>
  `,
  styles: [`
    /* Page background & card style (matches Manage Customers) */
    .dash-bg{
      background:
        radial-gradient(1000px 500px at 10% 10%, rgba(79, 70, 229, 0.08), transparent 60%),
        radial-gradient(900px 450px at 90% 20%, rgba(6, 182, 212, 0.08), transparent 55%),
        radial-gradient(700px 400px at 50% 100%, rgba(34, 197, 94, 0.05), transparent 55%),
        var(--app-bg);
      padding-bottom: 16px;
      border-radius: 18px;
    }
    .app-card{
      background: #fff;
      border: 1px solid var(--app-border);
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(2, 8, 23, 0.08);
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
      box-shadow: 0 0 0 4px rgba(6,182,212,0.12);
    }
    .pill-badge{
      border-radius:999px;
      padding:6px 10px;
      font-weight:700;
      color: rgba(15,23,42,0.7);
    }

    /* Buttons like Manage Customers */
    .apply-btn{
      border-color: rgba(79,70,229,0.35) !important;
      color: var(--app-primary) !important;
      border-radius: 999px !important;
      height: 40px;
    }

    /* Summary strip */
    .summary-row{
      display:grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    @media (min-width: 768px){
      .summary-row{ grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
    .summary-item{
      border: 1px solid var(--app-border);
      border-radius: 12px;
      background: #fff;
      padding: 10px 12px;
    }
    .summary-label{
      font-size:12px; font-weight:800;
      letter-spacing:.06em; text-transform:uppercase;
      color: rgba(15,23,42,0.55);
      margin-bottom: 4px;
    }
    .summary-value{
      font-size:18px; font-weight:900;
      color: rgba(15,23,42,0.92);
    }

    /* Table container */
    .table-wrap{
      border: 1px solid var(--app-border);
      border-radius: 14px;
      background: #fff;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
    }

    table.bookings-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      min-width: 980px;
      table-layout: auto;
    }

    .mat-column-dates { min-width: 260px; }

    th.mat-mdc-header-cell{
      background: rgba(15,23,42,0.02);
      color: rgba(15,23,42,0.70);
      font-weight: 800;
      letter-spacing: .04em;
      text-transform: uppercase;
      font-size: 12px;
      text-align: center;
      white-space: nowrap;
    }
    .mat-mdc-header-row, .mat-mdc-row{
      border-bottom: 1px solid var(--app-border);
    }
    td.mat-mdc-cell, th.mat-mdc-header-cell{
      padding: 14px 16px;
      vertical-align: middle;
    }
    td.mat-mdc-cell{ text-align: center; }
    tr.sticky th{
      position: sticky;
      top: 0;
      z-index: 1;
      background: rgba(15,23,42,0.02);
      border-bottom: 1px solid var(--app-border);
    }

    .cell-center{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      font-variant-numeric: tabular-nums;
    }
    .nowrap{ white-space: nowrap; }

    .actions-wrap{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
      width: 100%;
    }
    .action-btn{
      border-radius: 12px !important;
      height: 34px;
      white-space: nowrap;
      padding: 0 12px;
    }

    .status-chip{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(15,23,42,0.08);
      background: rgba(15,23,42,0.02);
    }
    .status-confirmed{ border-color: rgba(34,197,94,0.24); background: rgba(34,197,94,0.10); color: #166534; }
    .status-pending  { border-color: rgba(245,158,11,0.28); background: rgba(245,158,11,0.10); color: #92400e; }
    .status-cancelled{ border-color: rgba(239,68,68,0.28); background: rgba(239,68,68,0.10); color: #7f1d1d; }

    .empty td{ background: #fff; }
    .d-grid{ display: grid; }
    .gap-2{ gap: .5rem; }
  `],
})
export class ManageBookingsComponent implements AfterViewInit {
  cols: string[] = ['room', 'dates', 'nights', 'guests', 'amount', 'status', 'actions'];
  dataSource = new MatTableDataSource<BookingRow>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Filters – server-side query/status/date range
  filterForm: FormGroup<{
    query: FormControl<string>;
    status: FormControl<BookingStatus>;
    fromDate: FormControl<Date>;
    toDate: FormControl<Date>;
  }>;

  total = 0; // server-side total
  totalBookings = computed(() => this.total);

  constructor(
    private api: BookingApiService,
    private rooms: RoomService,
    private users: UserService,
    fb: NonNullableFormBuilder
  ) {
    const now = new Date();
    const from = new Date(now); from.setDate(now.getDate() - 30);

    this.filterForm = fb.group(
      {
        query: fb.control(''),
        status: fb.control('' as BookingStatus),
        fromDate: fb.control(from, { validators: [Validators.required] }),
        toDate: fb.control(now,  { validators: [Validators.required] }),
      },
      { validators: [dateRangeValidator] }
    );

    this.reload();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Re-fetch on paginator or sort change
    this.paginator.page.subscribe(() => this.reload());
    this.sort.sortChange.subscribe(() => {
      if (this.paginator) this.paginator.firstPage();
      this.reload();
    });
  }

  /** Load bookings from backend with current filters, page, and sort */
  reload() {
    if (this.filterForm.invalid) return;

    const f = this.filterForm.getRawValue();
    const page = this.paginator?.pageIndex ?? 0;          // 0-based
    const size = this.paginator?.pageSize ?? 10;
    const sortBy = this.sort?.active || 'createdAt';
    const sortDir = (this.sort?.direction || 'desc') as 'asc' | 'desc';

    this.api.list({
      query: f.query,
      status: f.status || undefined,
      from: toDateOnly(f.fromDate.toISOString()),
      to: toDateOnly(f.toDate.toISOString()),
      page,
      pageSize: size,
      sortBy,
      sortDir,
    }).subscribe((res: PaginatedResponse<AdminBookingRow>) => {
      this.total = res.totalElements;
      const rows: BookingRow[] = (res.content || []).map(b => ({
        ...b,
        roomId: (b as any).roomId ?? (b as any).room?.id, // defensive in case backend nests
      }));
      this.dataSource.data = rows;
    });
  }

  /** Apply validated filters: go to first page and reload from backend */
  applyFilters() {
    if (this.paginator) this.paginator.firstPage();
    this.reload();
  }

  resetFilters() {
    const now = new Date();
    const from = new Date(now); from.setDate(now.getDate() - 30);
    this.filterForm.reset({
      query: '',
      status: '' as BookingStatus,
      fromDate: from,
      toDate: now,
    });
    if (this.paginator) this.paginator.firstPage();
    this.reload();
  }

  // ---------- computed summary (page only) ----------
  get totalAmountFiltered(): number {
    return this.dataSource.data.reduce((sum, b) => sum + this.amountOf(b), 0);
  }

  // ---------- table helpers / renderers ----------
  customer(userId: string | number | null | undefined): string {
    if (userId === null || userId === undefined) return 'Customer';
    return this.users.byId?.(userId as any)?.fullName ?? 'Customer';
  }

  room(roomId: string | number | null | undefined): string {
    if (roomId === null || roomId === undefined) return 'Room';
    // If your RoomService no longer has 'name', adjust accordingly.
    return (this.rooms.byId?.(roomId as any) as any)?.name ?? 'Room';
  }

  checkIn(b: any): Date | undefined {
    return this.toDate(b?.checkInDate) ?? this.toDate(b?.fromDate) ?? this.toDate(b?.checkIn);
  }

  checkOut(b: any): Date | undefined {
    return this.toDate(b?.checkOutDate) ?? this.toDate(b?.toDate) ?? this.toDate(b?.checkOut);
  }

  nights(b: any): number {
    const ci = this.checkIn(b);
    const co = this.checkOut(b);
    if (!ci || !co) return 0;
    const ms = this.startOfDay(co).getTime() - this.startOfDay(ci).getTime();
    return Math.max(0, Math.round(ms / 86400000));
  }

  guests(b: any): number {
    const g = b?.guests ?? b?.noOfGuests ?? ((b?.adults ?? 0) + (b?.children ?? 0));
    const n = Number(g);
    return Number.isFinite(n) ? n : 1;
  }

  amountOf(b: any): number {
    const raw = b?.totalAmount ?? b?.amount ?? b?.total ?? b?.price ?? b?.billAmount;
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  isStatus(b: any, expected: BookingStatus): boolean {
    return String(b?.status ?? '').toUpperCase() === expected;
  }

  // ---------- actions (only cancel) ----------
  cancel(b: AdminBookingRow) {
    if (this.isStatus(b, 'CANCELLED')) return;
    this.api.cancel(b.id).subscribe(() => this.reload());
  }

  // ---------- utils ----------
  private toDate(v: any): Date | undefined {
    if (v === null || v === undefined || v === '') return undefined;
    if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
    if (typeof v === 'number') {
      const d = new Date(v); return isNaN(d.getTime()) ? undefined : d;
    }
    if (typeof v === 'string') {
      const num = Number(v);
      if (Number.isFinite(num) && v.trim() !== '') {
        const d = new Date(num); if (!isNaN(d.getTime())) return d;
      }
      const d = new Date(v); return isNaN(d.getTime()) ? undefined : d;
    }
    const d = new Date(v); return isNaN(d.getTime()) ? undefined : d;
  }
  private startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0,0,0,0); return x; }
  private endOfDay(d: Date): Date { const x = new Date(d); x.setHours(23,59,59,999); return x; }
}