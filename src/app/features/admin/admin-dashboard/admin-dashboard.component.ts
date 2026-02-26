import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  AbstractControl,
  ValidationErrors,
  Validators,
  ReactiveFormsModule,
  NonNullableFormBuilder,
  FormControl,
  FormGroup
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { AuthService } from '../../../core/services/auth.service';
import { RoomService } from '../../../core/services/room.service';
import { BookingService } from '../../../core/services/booking.service';
import { ComplaintService } from '../../../core/services/complaint.service';
import { UserService } from '../../../core/services/user.service';

type BookingStatus = '' | 'CONFIRMED' | 'PENDING' | 'CANCELLED';

/** ✅ Cross-field validator: fromDate must be <= toDate */
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const from = group.get('fromDate')?.value as Date | undefined;
  const to = group.get('toDate')?.value as Date | undefined;
  if (!from || !to) return null;
  return from.getTime() <= to.getTime() ? null : { dateRange: true };
}

@Component({
  standalone: true,
  selector: 'app-admin-dashboard',
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
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
              <div class="kicker">Admin Portal</div>
              <h2 class="fw-bold mb-1 title">Operations Overview</h2>
              <p class="text-muted mb-0">
                Welcome back, <span class="fw-semibold">{{ name() }}</span>.
                Track occupancy, manage bookings and resolve complaints.
              </p>
            </div>

            <div class="hero-badge">
              <span class="badge-dot"></span>
              <span class="text-muted small">Today:</span>
              <span class="small fw-semibold">{{ todayLabel }}</span>
            </div>
          </div>
        </div>

        <!-- FILTERS (Validated) -->
        <div class="app-card p-3 p-md-4 mb-4">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <h5 class="fw-bold mb-0">Quick Filters</h5>
            <span class="badge text-bg-light border pill-badge">Validated</span>
          </div>

          <form class="row g-3 align-items-end"
                [formGroup]="filterForm"
                (ngSubmit)="applyFilters()">

            <div class="col-12 col-md-4">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>From date</mat-label>
                <input matInput [matDatepicker]="dpFrom" formControlName="fromDate" required>
                <mat-datepicker-toggle matSuffix [for]="dpFrom"></mat-datepicker-toggle>
                <mat-datepicker #dpFrom></mat-datepicker>
                <mat-error *ngIf="filterForm.controls.fromDate.hasError('required')">
                  From date is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-12 col-md-4">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>To date</mat-label>
                <input matInput [matDatepicker]="dpTo" formControlName="toDate" required>
                <mat-datepicker-toggle matSuffix [for]="dpTo"></mat-datepicker-toggle>
                <mat-datepicker #dpTo></mat-datepicker>

                <mat-error *ngIf="filterForm.controls.toDate.hasError('required')">
                  To date is required
                </mat-error>
                <mat-error *ngIf="filterForm.hasError('dateRange')">
                  To date must be after (or same as) From date
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-12 col-md-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Booking status (optional)</mat-label>
                <mat-select formControlName="status">
                  <mat-option value="">All</mat-option>
                  <mat-option value="CONFIRMED">Confirmed</mat-option>
                  <mat-option value="PENDING">Pending</mat-option>
                  <mat-option value="CANCELLED">Cancelled</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="col-12 col-md-1 d-grid">
              <button mat-stroked-button class="apply-btn"
                      type="submit"
                      [disabled]="filterForm.invalid">
                Apply
              </button>
            </div>

          </form>

          <div class="text-muted small mt-2" *ngIf="filterForm.valid">
            KPIs are calculated for the selected range.
          </div>
        </div>

        <!-- STATS -->
        <div class="row g-3 g-md-4 mb-4">

          <div class="col-12 col-sm-6 col-xl-3">
            <div class="app-card p-3 stat-card h-100">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <div class="stat-label">Active Rooms</div>
                  <div class="stat-value">{{ kpi.activeRooms }}</div>
                </div>
                <div class="stat-icon indigo">🏨</div>
              </div>
              <div class="stat-foot text-muted small mt-2">Rooms currently active</div>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-xl-3">
            <div class="app-card p-3 stat-card h-100">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <div class="stat-label">Bookings</div>
                  <div class="stat-value">{{ kpi.totalBookings }}</div>
                </div>
                <div class="stat-icon cyan">📦</div>
              </div>
              <div class="stat-foot text-muted small mt-2">Filtered by date/status</div>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-xl-3">
            <div class="app-card p-3 stat-card h-100">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <div class="stat-label">Open Complaints</div>
                  <div class="stat-value">{{ kpi.openComplaints }}</div>
                </div>
                <div class="stat-icon orange">🎫</div>
              </div>
              <div class="stat-foot text-muted small mt-2">Pending resolution</div>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-xl-3">
            <div class="app-card p-3 stat-card h-100">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <div class="stat-label">Occupancy</div>
                  <div class="stat-value">{{ kpi.occupancyRate }}%</div>
                </div>
                <div class="stat-icon green">📊</div>
              </div>
              <div class="stat-foot text-muted small mt-2">Occupied / active rooms</div>
            </div>
          </div>

        </div>

        <!-- MAIN CONTENT -->
        <div class="row g-3 g-md-4">

          <!-- Quick actions -->
          <div class="col-12 col-lg-7">
            <div class="app-card p-3 p-md-4 h-100">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h5 class="fw-bold mb-0">Quick Actions</h5>
                <span class="badge text-bg-light border pill-badge">Admin tools</span>
              </div>

              <p class="text-muted small mb-3">
                Jump to common operational tasks quickly.
              </p>

              <div class="row g-2">
                <div class="col-12 col-md-6">
                  <a routerLink="/admin/rooms" class="action-tile">
                    <div class="action-ico">🛏️</div>
                    <div>
                      <div class="action-title">Manage Rooms</div>
                      <div class="action-sub">Add/edit rooms & pricing</div>
                    </div>
                    <div class="action-go">›</div>
                  </a>
                </div>

                <div class="col-12 col-md-6">
                  <a routerLink="/admin/bookings" class="action-tile">
                    <div class="action-ico">📑</div>
                    <div>
                      <div class="action-title">Review Bookings</div>
                      <div class="action-sub">Confirm/cancel/reschedule</div>
                    </div>
                    <div class="action-go">›</div>
                  </a>
                </div>

                <div class="col-12 col-md-6">
                  <a routerLink="/admin/complaints" class="action-tile">
                    <div class="action-ico">🎫</div>
                    <div>
                      <div class="action-title">Resolve Complaints</div>
                      <div class="action-sub">Handle open customer issues</div>
                    </div>
                    <div class="action-go">›</div>
                  </a>
                </div>

                <div class="col-12 col-md-6">
                  <a routerLink="/admin/reports" class="action-tile">
                    <div class="action-ico">📈</div>
                    <div>
                      <div class="action-title">Reports</div>
                      <div class="action-sub">Revenue & occupancy analytics</div>
                    </div>
                    <div class="action-go">›</div>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Right column -->
          <div class="col-12 col-lg-5">

            <div class="app-card p-3 p-md-4 mb-3">
              <h5 class="fw-bold mb-2">People & Check-ins</h5>
              <ul class="list-unstyled mb-0">
                <li class="tip d-flex gap-2 mb-2">
                  <span class="tip-dot"></span>
                  <span class="text-muted">
                    Customers: <strong>{{ kpi.customers }}</strong>
                  </span>
                </li>
                <li class="tip d-flex gap-2 mb-2">
                  <span class="tip-dot"></span>
                  <span class="text-muted">
                    Staff: <strong>{{ kpi.staff }}</strong>
                  </span>
                </li>
                <li class="tip d-flex gap-2">
                  <span class="tip-dot"></span>
                  <span class="text-muted">
                    Today check-ins: <strong>{{ kpi.todayCheckins }}</strong>
                  </span>
                </li>
              </ul>
            </div>

            <div class="app-card p-3 p-md-4">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h5 class="fw-bold mb-0">Revenue (optional)</h5>
                <span class="small text-muted">if totals exist</span>
              </div>

              <div class="stat-value">{{ kpi.revenue }}</div>
              <div class="text-muted small mt-2">
                Calculated from booking <code>totalAmount</code> / <code>amount</code> / <code>total</code> / <code>price</code>.
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
        padding: 0px;
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
      box-shadow: 0 0 0 4px rgba(6,182,212,0.12);
    }

    .stat-card{ border-radius: 16px; }
    .stat-label{
      font-size:12px; font-weight:800;
      letter-spacing:.06em; text-transform:uppercase;
      color: rgba(15,23,42,0.55);
    }
    .stat-value{
      font-size:22px; font-weight:900;
      margin-top:4px;
      color: rgba(15,23,42,0.92);
    }
    .stat-icon{
      width:44px; height:44px; border-radius:14px;
      display:grid; place-items:center;
      font-size:18px;
      border:1px solid rgba(15,23,42,0.06);
      background: rgba(15,23,42,0.02);
    }
    .stat-icon.indigo{ background: rgba(79,70,229,0.10); border-color: rgba(79,70,229,0.18); }
    .stat-icon.cyan{ background: rgba(6,182,212,0.10); border-color: rgba(6,182,212,0.18); }
    .stat-icon.orange{ background: rgba(245,158,11,0.10); border-color: rgba(245,158,11,0.22); }
    .stat-icon.green{ background: rgba(34,197,94,0.10); border-color: rgba(34,197,94,0.18); }

    .pill-badge{
      border-radius:999px;
      padding:6px 10px;
      font-weight:700;
      color: rgba(15,23,42,0.7);
    }

    .action-tile{
      display:flex; align-items:center; gap:12px;
      padding:12px 12px;
      border-radius:14px;
      text-decoration:none;
      border:1px solid rgba(15,23,42,0.08);
      background: rgba(255,255,255,0.7);
      transition: transform .08s ease, border-color .12s ease, background .12s ease;
      color: var(--app-text);
      height:100%;
    }
    .action-tile:hover{
      transform: translateY(-1px);
      background:#fff;
      border-color: rgba(79,70,229,0.18);
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
    .action-go{
      margin-left:auto;
      font-size:18px;
      color: rgba(15,23,42,0.35);
      font-weight:900;
    }

    .tip-dot{
      width:10px; height:10px; border-radius:999px;
      margin-top:6px;
      background: linear-gradient(135deg, var(--app-primary), var(--app-secondary));
      box-shadow: 0 6px 12px rgba(79, 70, 229, 0.15);
      flex:0 0 10px;
    }

    .apply-btn{
      border-color: rgba(79,70,229,0.35) !important;
      color: var(--app-primary) !important;
      border-radius: 999px !important;
      height: 40px;
    }
  `]
})
export class AdminDashboardComponent {
  constructor(
    private auth: AuthService,
    private fb: NonNullableFormBuilder,
    private roomsService: RoomService,
    private bookingsService: BookingService,
    private complaintsService: ComplaintService,
    private usersService: UserService
  ) {
    // default filter: last 30 days
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 30);

    this.filterForm = this.fb.group(
      {
        fromDate: this.fb.control(from, { validators: [Validators.required] }),
        toDate: this.fb.control(now, { validators: [Validators.required] }),
        status: this.fb.control('' as BookingStatus)
      },
      { validators: [dateRangeValidator] }
    );

    this.recomputeKPIs();
  }

  name = computed(() => this.auth.user()?.fullName ?? 'Admin');
  todayLabel = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date());

  // ✅ Strong typed, non-nullable controls (fixes your TS2322 errors)
  filterForm: FormGroup<{
    fromDate: FormControl<Date>;
    toDate: FormControl<Date>;
    status: FormControl<BookingStatus>;
  }>;

  kpi = {
    activeRooms: 0,
    totalBookings: 0,
    openComplaints: 0,
    occupancyRate: 0,
    customers: 0,
    staff: 0,
    todayCheckins: 0,
    revenue: '₹0'
  };

  applyFilters() {
    if (this.filterForm.invalid) return;
    this.recomputeKPIs();
  }

  private recomputeKPIs() {
    const rooms = this.safeArray(this.roomsService.list?.() ?? []);
    const bookings = this.safeArray(this.bookingsService.list?.() ?? []);
    const complaints = this.safeArray(this.complaintsService.list?.() ?? []);
    const users = this.safeArray(this.usersService.list?.() ?? []);

    // ✅ No null types here (NonNullableFormBuilder)
    const fromDate = this.filterForm.controls.fromDate.value;
    const toDate = this.filterForm.controls.toDate.value;
    const status = this.filterForm.controls.status.value; // '' | CONFIRMED | PENDING | CANCELLED

    const activeRooms = rooms.filter((r: any) => !!r?.active).length;

    // Filter bookings by selected date range and optional status
    const filteredBookings = bookings.filter((b: any) => {
      const s = String(b?.status ?? '').toUpperCase();
      if (status && s !== status) return false;

      // Prefer checkInDate for filtering (since your booking includes it)
      const checkIn = this.toDate(b?.checkInDate) ?? this.toDate(b?.checkIn);
      const created = this.toDate(b?.createdAt) ?? this.toDate(b?.bookingDate);

      const basis = checkIn ?? created;
      if (!basis) return true; // safe fallback

      return basis >= this.startOfDay(fromDate) && basis <= this.endOfDay(toDate);
    });

    const totalBookings = filteredBookings.length;

    // Open complaints (based on common statuses; adjust if your statuses differ)
    const openComplaints = complaints.filter((c: any) => {
      const s = String(c?.status ?? '').toUpperCase();
      return s ? ['OPEN', 'PENDING', 'IN_PROGRESS'].includes(s) : true;
    }).length;

    // Users breakdown (uses role/userRole if present; safe fallback)
    const customers = users.filter((u: any) => {
      const r = String(u?.role ?? u?.userRole ?? '').toUpperCase();
      return r ? ['CUSTOMER', 'GUEST'].includes(r) : true;
    }).length;

    const staff = users.filter((u: any) => {
      const r = String(u?.role ?? u?.userRole ?? '').toUpperCase();
      return r ? ['STAFF', 'EMPLOYEE'].includes(r) : false;
    }).length;

    // Today check-ins: status CONFIRMED/PENDING and checkInDate is today
    const today = new Date();
    const todayCheckins = bookings.filter((b: any) => {
      const s = String(b?.status ?? '').toUpperCase();
      if (!['CONFIRMED', 'PENDING'].includes(s)) return false;

      const ci = this.toDate(b?.checkInDate) ?? this.toDate(b?.checkIn);
      return ci ? this.isSameDay(ci, today) : false;
    }).length;

    // Occupancy: bookings active today (CONFIRMED/PENDING and today between checkInDate and checkOutDate)
    const occupiedRoomIds = new Set<any>();
    for (const b of bookings) {
      const s = String(b?.status ?? '').toUpperCase();
      if (!['CONFIRMED', 'PENDING'].includes(s)) continue;

      const ci = this.toDate(b?.checkInDate) ?? this.toDate(b?.checkIn);
      const co = this.toDate(b?.checkOutDate) ?? this.toDate(b?.checkOut);
      if (!ci || !co) continue;

      if (today >= this.startOfDay(ci) && today <= this.endOfDay(co)) {
        const roomId = b?.roomId ?? b?.room?.id ?? b?.room?.roomId;
        if (roomId !== undefined && roomId !== null) occupiedRoomIds.add(roomId);
      }
    }

    const occupancyRate = activeRooms > 0
      ? Math.round((occupiedRoomIds.size / activeRooms) * 100)
      : 0;

    // Revenue (optional): sum booking totals if field exists
    const revenueNumber = filteredBookings.reduce((sum: number, b: any) => {
      const v = b?.totalAmount ?? b?.amount ?? b?.total ?? b?.price ?? b?.billAmount;
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? sum + n : sum;
    }, 0);

    this.kpi = {
      activeRooms,
      totalBookings,
      openComplaints,
      occupancyRate,
      customers,
      staff,
      todayCheckins,
      revenue: this.formatINR(revenueNumber)
    };
  }

  // ---------- helpers ----------
  private safeArray(v: any): any[] { return Array.isArray(v) ? v : []; }

  /** Parses ISO string / Date / timestamp safely into Date */
  private toDate(v: any): Date | undefined {
    if (v === null || v === undefined || v === '') return undefined;
    if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;

    // timestamp number or numeric string
    if (typeof v === 'number') {
      const d = new Date(v);
      return isNaN(d.getTime()) ? undefined : d;
    }
    if (typeof v === 'string') {
      // If numeric string, treat as timestamp
      const maybeNum = Number(v);
      if (Number.isFinite(maybeNum) && v.trim() !== '') {
        const d = new Date(maybeNum);
        if (!isNaN(d.getTime())) return d;
      }
      const d = new Date(v);
      return isNaN(d.getTime()) ? undefined : d;
    }

    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  }

  private startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private endOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  private formatINR(value: number): string {
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(value);
    } catch {
      return `₹${Math.round(value)}`;
    }
  }
}