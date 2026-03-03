import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  Validators,
  FormGroup,
  FormControl,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';

import { BookingApiService } from '../../../core/services/booking-api.service';

/** Cross-field validator: fromDate must be <= toDate */
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const from = group.get('fromDate')?.value as Date | undefined;
  const to = group.get('toDate')?.value as Date | undefined;
  if (!from || !to) return null;
  return from.getTime() <= to.getTime() ? null : { dateRange: true };
}

type PaidFilter = '' | 'PAID' | 'UNPAID' | 'REFUNDED';

@Component({
  standalone: true,
  selector: 'app-reports',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatButtonModule,
    MatTableModule
  ],
  template: `
  <div class="dash-bg">
    <div class="container-fluid p-0">

      <!-- HERO -->
      <div class="app-card p-3 p-md-4 mb-4 hero">
        <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <div>
            <div class="kicker">Admin Portal</div>
            <h2 class="fw-bold mb-1 title">Revenue &amp; Reports</h2>
            <p class="text-muted mb-0">
              Monitor paid revenue and booking trends in a selected date range.
            </p>
          </div>

          <div class="hero-badge">
            <span class="badge-dot"></span>
            <span class="text-muted small">This period:</span>
            <span class="small fw-semibold">{{ periodLabel }}</span>
          </div>
        </div>
      </div>

      <!-- FILTERS -->
      <div class="app-card p-3 p-md-4 mb-4">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h5 class="fw-bold mb-0">Quick Filters</h5>
          <span class="badge text-bg-light border pill-badge">Validated</span>
        </div>

        <form class="row g-3 align-items-end" [formGroup]="filterForm" (ngSubmit)="apply()">
          <div class="col-12 col-md-4">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>From date</mat-label>
              <input matInput [matDatepicker]="dpFrom" formControlName="fromDate" required>
              <mat-datepicker-toggle matSuffix [for]="dpFrom"></mat-datepicker-toggle>
              <mat-datepicker #dpFrom></mat-datepicker>
              <mat-error *ngIf="filterForm.controls.fromDate.hasError('required')">From date is required</mat-error>
            </mat-form-field>
          </div>

          <div class="col-12 col-md-4">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>To date</mat-label>
              <input matInput [matDatepicker]="dpTo" formControlName="toDate" required>
              <mat-datepicker-toggle matSuffix [for]="dpTo"></mat-datepicker-toggle>
              <mat-datepicker #dpTo></mat-datepicker>
              <mat-error *ngIf="filterForm.controls.toDate.hasError('required')">To date is required</mat-error>
              <mat-error *ngIf="filterForm.hasError('dateRange')">To date must be after (or same as) From date</mat-error>
            </mat-form-field>
          </div>

          <div class="col-12 col-md-3">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Payment status</mat-label>
              <mat-select formControlName="paidFilter">
                <mat-option value="">All</mat-option>
                <mat-option value="PAID">Paid only</mat-option>
                <mat-option value="UNPAID">Unpaid only</mat-option>
                <mat-option value="REFUNDED">Refunded</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="col-12 col-md-1 d-grid">
            <button mat-stroked-button class="apply-btn" type="submit" [disabled]="filterForm.invalid">Apply</button>
          </div>
        </form>

        <div class="text-muted small mt-2" *ngIf="filterForm.valid">
          KPIs reflect bookings that fall within the selected range.
        </div>
      </div>

      <!-- KPIs -->
      <div class="row g-3 g-md-4 mb-4">

        <div class="col-12 col-sm-6 col-xl-3">
          <div class="app-card p-3 stat-card h-100">
            <div class="d-flex align-items-center justify-content-between">
              <div>
                <div class="stat-label">Revenue (Paid)</div>
                <div class="stat-value">{{ kpis.revenue }}</div>
              </div>
              <div class="stat-icon green">₹</div>
            </div>
            <div class="stat-foot text-muted small mt-2">Sum of paid booking totals</div>
          </div>
        </div>

        <div class="col-12 col-sm-6 col-xl-3">
          <div class="app-card p-3 stat-card h-100">
            <div class="d-flex align-items-center justify-content-between">
              <div>
                <div class="stat-label">Paid Bookings</div>
                <div class="stat-value">{{ kpis.paidCount }}</div>
              </div>
              <div class="stat-icon indigo">✅</div>
            </div>
            <div class="stat-foot text-muted small mt-2">Count with status PAID</div>
          </div>
        </div>

        <div class="col-12 col-sm-6 col-xl-3">
          <div class="app-card p-3 stat-card h-100">
            <div class="d-flex align-items-center justify-content-between">
              <div>
                <div class="stat-label">Avg Booking Value</div>
                <div class="stat-value">{{ kpis.avgBookingValue }}</div>
              </div>
              <div class="stat-icon cyan">∅</div>
            </div>
            <div class="stat-foot text-muted small mt-2">Revenue / paid bookings</div>
          </div>
        </div>

        <div class="col-12 col-sm-6 col-xl-3">
          <div class="app-card p-3 stat-card h-100">
            <div class="d-flex align-items-center justify-content-between">
              <div>
                <div class="stat-label">Refunded</div>
                <div class="stat-value">{{ kpis.refundedCount }}</div>
              </div>
              <div class="stat-icon orange">↩</div>
            </div>
            <div class="stat-foot text-muted small mt-2">Bookings with status REFUNDED</div>
          </div>
        </div>

      </div>

      <!-- DETAILS -->
      <div class="app-card p-3 p-md-4">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h5 class="fw-bold mb-0">Bookings (Filtered)</h5>
          <span class="badge text-bg-light border pill-badge">{{ filtered.length }} results</span>
        </div>

        <div class="table-wrap">
          <table mat-table [dataSource]="filtered" class="w-100">

            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let b">{{ displayId(b) }}</td>
            </ng-container>

            <ng-container matColumnDef="customer">
              <th mat-header-cell *matHeaderCellDef>Customer</th>
              <td mat-cell *matCellDef="let b">{{ displayCustomer(b) }}</td>
            </ng-container>

            <ng-container matColumnDef="dates">
              <th mat-header-cell *matHeaderCellDef>Dates</th>
              <td mat-cell *matCellDef="let b">{{ displayDates(b) }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let b">{{ statusOf(b) }}</td>
            </ng-container>

            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef>Amount</th>
              <td mat-cell *matCellDef="let b">
  {{ amountOf(b) | currency:'INR':'symbol':'1.0-0':'en-IN' }}
</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;"></tr>
          </table>

          <div class="empty" *ngIf="!filtered.length">
            <div class="stat-icon indigo">📄</div>
            <div class="fw-bold mt-2">No bookings in this period</div>
            <div class="text-muted small">Adjust dates or status filters to see results.</div>
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
      box-shadow: 0 0 0 4px rgba(6,182,212,0.12);
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

    .table-wrap{
      border: 1px solid var(--app-border);
      border-radius: 14px;
      overflow: hidden;
      background: #fff;
    }
    table{ border-collapse: separate; border-spacing: 0; }
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
    td.mat-mdc-cell, th.mat-mdc-header-cell{
      padding: 14px 16px !important;
    }

    .empty{
      padding: 36px 16px;
      display:flex; flex-direction:column; align-items:center; text-align:center;
      color: rgba(15,23,42,0.7);
    }
  `]
})
export class ReportsComponent implements OnInit {
  cols: string[] = ['id', 'customer', 'dates', 'status', 'amount'];

  filterForm: FormGroup<{
    fromDate: FormControl<Date>;
    toDate: FormControl<Date>;
    paidFilter: FormControl<PaidFilter>;
  }>;

  all: any[] = [];
  filtered: any[] = [];

  kpis = { revenue: '₹0', paidCount: 0, avgBookingValue: '₹0', refundedCount: 0 };
  periodLabel = '';

  constructor(
    private fb: NonNullableFormBuilder,
    private bookingsSvc: BookingApiService
  ) {
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 30);
    this.filterForm = this.fb.group(
      {
        fromDate: this.fb.control(from, { validators: [Validators.required] }),
        toDate:   this.fb.control(now,  { validators: [Validators.required] }),
        paidFilter: this.fb.control<PaidFilter>('')
      },
      { validators: [dateRangeValidator] }
    );
  }

  ngOnInit(): void {
    this.bookingsSvc.adminHistory().subscribe({
      next: (rows: any) => { this.all = Array.isArray(rows) ? rows : []; this.computeFiltered(); },
      error: ()         => { this.all = []; this.computeFiltered(); }
    });
  }

  apply() { if (this.filterForm.valid) this.computeFiltered(); }

  private computeFiltered() {
    if (this.filterForm.invalid) return;
    const f = this.filterForm.getRawValue();
    const from = this.dayStart(f.fromDate);
    const to   = this.dayEnd(f.toDate);

    const byDate = this.all.filter((b: any) => {
      const d = this.toDate(b?.checkInDate ?? b?.checkIn ?? b?.createdAt);
      return !d || (d >= from && d <= to);
    });

    let slice = byDate;
    if (f.paidFilter === 'PAID')    slice = slice.filter((b: any) => this.sOf(b) === 'PAID');
    else if (f.paidFilter === 'UNPAID')   slice = slice.filter((b: any) => this.sOf(b) !== 'PAID');
    else if (f.paidFilter === 'REFUNDED') slice = slice.filter((b: any) => this.sOf(b) === 'REFUNDED');

    this.filtered = slice.sort((a: any, b: any) =>
      (this.toDate(b?.checkInDate ?? b?.createdAt)?.getTime() ?? 0) -
      (this.toDate(a?.checkInDate ?? a?.createdAt)?.getTime() ?? 0)
    );

    const paid     = this.filtered.filter((b: any) => this.sOf(b) === 'PAID');
    const refunded = this.filtered.filter((b: any) => this.sOf(b) === 'REFUNDED');
    const rev      = paid.reduce((s: number, b: any) => s + this.amountOf(b), 0);
    const avg      = paid.length ? Math.round(rev / paid.length) : 0;

    this.kpis = {
      revenue: this.inr(rev), paidCount: paid.length,
      avgBookingValue: this.inr(avg), refundedCount: refunded.length
    };
    this.periodLabel = `${this.fmt(from)} – ${this.fmt(to)}`;
  }

  statusOf(b: any)       { return this.sOf(b); }
  amountOf(b: any)       { const v = b?.totalAmount ?? b?.amount ?? 0; return typeof v === 'number' ? v : Number(v) || 0; }
  displayId(b: any)      { return String(b?.id ?? b?.bookingId ?? '—'); }
  displayCustomer(b: any) {
    const u = b?.user ?? b?.customer;
    return u?.fullName ?? b?.customerName ?? u?.email ?? b?.email ?? 'Customer';
  }
  displayDates(b: any) {
    const ci = this.toDate(b?.checkInDate ?? b?.checkIn);
    const co = this.toDate(b?.checkOutDate ?? b?.checkOut);
    if (!ci && !co) return '—';
    if (ci && !co) return this.fmt(ci);
    if (!ci && co) return this.fmt(co);
    return `${this.fmt(ci!)} → ${this.fmt(co!)}`;
  }

  private sOf(b: any)       { return String(b?.status ?? '').toUpperCase(); }
  private fmt(d: Date)      { try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d); } catch { return d.toISOString().slice(0,10); } }
  private dayStart(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
  private dayEnd(d: Date)   { const x = new Date(d); x.setHours(23,59,59,999); return x; }
  private inr(v: number)    { try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v); } catch { return `₹${Math.round(v)}`; } }
  private toDate(v: any): Date | undefined {
    if (!v) return undefined;
    if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
    const d = new Date(v); return isNaN(d.getTime()) ? undefined : d;
  }
}