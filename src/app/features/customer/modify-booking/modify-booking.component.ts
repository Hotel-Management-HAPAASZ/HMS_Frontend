// src/app/features/customer/modify/modify-booking.component.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { BookingService, BookingRow, ModifyBookingRequestDto } from '../../../core/services/booking.service';
import { RoomService } from '../../../core/services/room.service';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  template: `
  <div class="dash-bg py-3 py-md-4">
    <div class="container-fluid p-0">

      <!-- Header / Hero -->
      <div class="app-card p-3 p-md-4 mb-4 hero">
        <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <div>
            <div class="kicker">Customer Portal</div>
            <h2 class="fw-bold mb-1 title">Modify Booking</h2>
            <p class="text-muted mb-0">
              Update your stay dates and guest count. Review the updated total before saving.
            </p>
          </div>

          <div class="d-flex gap-2">
            <button mat-stroked-button type="button" (click)="back()" class="btn-ghost">
              ← Back
            </button>
            <button mat-raised-button color="primary"
              class="btn-app"
              [disabled]="form.invalid || loading() || !bookingNow()"
              (click)="save()">
              {{ loading() ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Body -->
      <ng-container *ngIf="bookingNow() as b; else notFound">
        <div class="row g-3 g-md-4">

          <!-- Left: Form -->
          <div class="col-12 col-lg-7">
            <div class="app-card p-3 p-md-4 h-100">
              <div class="d-flex align-items-start justify-content-between gap-3 mb-2">
                <div>
                  <h5 class="fw-bold mb-1">Booking Details</h5>
                  <div class="text-muted small">
                    Room: <span class="fw-semibold">{{ roomName() || '—' }}</span>
                  </div>
                </div>

                <!-- compact status -->
                <div class="status-wrap">
                  <span class="status-label">Status</span>
                  <span class="status-pill" [class.paid]="(b.status ?? '').toString().toUpperCase() === 'PAID'">
                    {{ b.status }}
                  </span>
                </div>
              </div>

              <mat-divider class="my-3"></mat-divider>

              <form [formGroup]="form" class="row g-3" (ngSubmit)="save()">

                <!-- From -->
                <div class="col-12 col-md-6">
                  <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Check-in</mat-label>
                    <input matInput [matDatepicker]="dp1"
                      [min]="minDate"
                      formControlName="from" />
                    <mat-datepicker-toggle matSuffix [for]="dp1"></mat-datepicker-toggle>
                    <mat-datepicker #dp1></mat-datepicker>

                    <mat-error *ngIf="fromCtrl.touched && fromCtrl.hasError('required')">
                      Check-in date is required
                    </mat-error>
                    <mat-error *ngIf="fromCtrl.touched && fromCtrl.hasError('pastDate')">
                      Check-in cannot be in the past
                    </mat-error>
                  </mat-form-field>
                </div>

                <!-- To -->
                <div class="col-12 col-md-6">
                  <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Check-out</mat-label>
                    <input matInput [matDatepicker]="dp2"
                      [min]="toMinDate()"
                      formControlName="to" />
                    <mat-datepicker-toggle matSuffix [for]="dp2"></mat-datepicker-toggle>
                    <mat-datepicker #dp2></mat-datepicker>

                    <mat-error *ngIf="toCtrl.touched && toCtrl.hasError('required')">
                      Check-out date is required
                    </mat-error>
                    <mat-error *ngIf="form.touched && form.hasError('dateRange')">
                      Check-out must be after check-in (minimum 1 night)
                    </mat-error>
                  </mat-form-field>
                </div>

                <!-- Guests -->
                <div class="col-12 col-md-6">
                  <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Guests</mat-label>
                    <input matInput type="number" min="1"
                      [max]="maxGuests()"
                      formControlName="guests" />

                    <mat-error *ngIf="guestsCtrl.touched && guestsCtrl.hasError('required')">
                      Guest count is required
                    </mat-error>
                    <mat-error *ngIf="guestsCtrl.touched && guestsCtrl.hasError('min')">
                      Minimum 1 guest is required
                    </mat-error>
                    <mat-error *ngIf="guestsCtrl.touched && guestsCtrl.hasError('max')">
                      Maximum allowed guests for this room is {{ maxGuests() }}
                    </mat-error>
                  </mat-form-field>

                  <div class="hint text-muted small mt-1">
                    Tip: Guest limit is based on room capacity (if configured).
                  </div>
                </div>

                <!-- Reason (Required) -->
                <div class="col-12 col-md-6">
                  <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Reason for change</mat-label>
                    <input matInput placeholder="E.g., travel dates changed"
                      formControlName="reason" />
                    <mat-error *ngIf="reasonCtrl.touched && reasonCtrl.hasError('required')">
                      Reason is required
                    </mat-error>
                    <mat-error *ngIf="reasonCtrl.touched && reasonCtrl.hasError('minlength')">
                      Please enter at least 5 characters
                    </mat-error>
                  </mat-form-field>
                </div>

                <!-- Special Requests (Optional) -->
                <div class="col-12">
                  <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Special requests (optional)</mat-label>
                    <textarea matInput rows="3"
                      placeholder="Any requests you want the hotel to know…"
                      formControlName="notes"></textarea>
                    <mat-hint align="end">{{ notesLength() }}/250</mat-hint>

                    <mat-error *ngIf="notesCtrl.touched && notesCtrl.hasError('maxlength')">
                      Max 250 characters allowed
                    </mat-error>
                  </mat-form-field>
                </div>

                <!-- Footer buttons (inside card for mobile) -->
                <div class="col-12 d-flex gap-2 mt-1">
                  <button mat-raised-button color="primary"
                    class="btn-app"
                    [disabled]="form.invalid || loading()">
                    {{ loading() ? 'Saving...' : 'Save Changes' }}
                  </button>
                  <button mat-stroked-button type="button" (click)="back()" class="btn-ghost">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Right: Summary -->
          <div class="col-12 col-lg-5">
            <div class="app-card p-3 p-md-4">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h5 class="fw-bold mb-0">Price Summary</h5>
                <span class="live-pill">Live preview</span>
              </div>

              <div class="summary-pro">
                <div class="mini-grid">
                  <div class="mini">
                    <div class="mini-label">Nights</div>
                    <div class="mini-value">{{ previewNights() }}</div>
                  </div>
                  <div class="mini">
                    <div class="mini-label">Rate / night</div>
                    <div class="mini-value">₹{{ pricePerNight() }}</div>
                  </div>
                  <div class="mini">
                    <div class="mini-label">Guests</div>
                    <div class="mini-value">{{ form.value.guests || 1 }}</div>
                  </div>
                </div>

                <div class="divider-soft"></div>

                <div class="total-row">
                  <div>
                    <div class="total-label">Estimated total</div>
                    <div class="total-sub text-muted small">
                      Based on selected dates
                    </div>
                  </div>
                  <div class="total-amount">₹{{ previewTotal() }}</div>
                </div>

                <div class="delta-row">
                  <div class="text-muted small">
                    Current total: <span class="fw-semibold">₹{{ b.totalAmount }}</span>
                  </div>

                  <div class="delta"
                    [class.pos]="deltaAmount(b.totalAmount) > 0"
                    [class.neg]="deltaAmount(b.totalAmount) < 0"
                    *ngIf="form.valid && previewNights() > 0">
                    <span class="delta-tag">Δ</span>
                    <span>
                      {{ deltaLabel(b.totalAmount) }}
                      ₹{{ abs(deltaAmount(b.totalAmount)) }}
                    </span>
                  </div>
                </div>

                <div class="info mt-3">
                  <div class="info-dot"></div>
                  <div class="small text-muted">
                    Totals update automatically based on the new dates.
                    Availability and pricing will be validated at save.
                  </div>
                </div>
              </div>
            </div>

            <div class="app-card p-3 p-md-4 mt-3">
              <h6 class="fw-bold mb-2">Policy reminders</h6>
              <ul class="list-unstyled mb-0 small text-muted">
                <li class="d-flex gap-2 mb-2"><span class="tip-dot"></span><span>Date changes depend on availability.</span></li>
                <li class="d-flex gap-2 mb-2"><span class="tip-dot"></span><span>Check-out must be after check-in.</span></li>
                <li class="d-flex gap-2"><span class="tip-dot"></span><span>Guest count should not exceed room capacity.</span></li>
              </ul>
            </div>
          </div>

        </div>
      </ng-container>

      <ng-template #notFound>
        <div class="app-card p-3 p-md-4">
          <h5 class="fw-bold mb-1">Booking not found</h5>
          <p class="text-muted mb-0">We couldn't locate this booking. Please return to history and try again.</p>
          <div class="mt-3">
            <button mat-raised-button color="primary" class="btn-app" (click)="back()">
              Go to Booking History
            </button>
          </div>
        </div>
      </ng-template>

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
      min-height: calc(100vh - 1px);
    }
    .hero{
      background: #fff !important;
      border: 1px solid var(--app-border);
      border-radius: 18px;
      box-shadow: 0 10px 25px rgba(2, 8, 23, 0.08);
      overflow: hidden;
    }
    .kicker{
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 12px; font-weight: 800; letter-spacing:.08em;
      text-transform: uppercase; color: rgba(15,23,42,0.55);
      margin-bottom: 6px;
    }
    .btn-ghost{ border-color: rgba(15,23,42,0.12) !important; }
    .status-wrap{
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 14px;
      border: 1px solid rgba(15,23,42,0.08);
      background: rgba(15,23,42,0.02);
      height: fit-content;
    }
    .status-label{
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: rgba(15,23,42,0.55);
    }
    .status-pill{
      padding: 4px 10px; border-radius: 999px;
      border: 1px solid rgba(15,23,42,0.12);
      background: rgba(15,23,42,0.03);
      font-weight: 900; font-size: 12px; line-height:1; letter-spacing:.03em;
      white-space: nowrap;
    }
    .status-pill.paid{
      border-color: rgba(34,197,94,0.25);
      background: rgba(34,197,94,0.10);
      color: rgba(21,128,61,1);
    }
    .summary-pro{
      margin-top: 12px;
      border-radius: 16px;
      border: 1px solid rgba(15,23,42,0.08);
      background:
        radial-gradient(700px 220px at 10% 0%, rgba(79,70,229,0.08), transparent 55%),
        radial-gradient(700px 220px at 100% 10%, rgba(6,182,212,0.08), transparent 55%),
        rgba(255,255,255,0.7);
      padding: 14px;
    }
    .mini-grid{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .mini{
      border-radius: 14px; border: 1px solid rgba(15,23,42,0.08);
      background: rgba(255,255,255,0.72); padding: 10px 12px;
    }
    .mini-label{
      font-size: 11px; font-weight: 800; letter-spacing:.06em; text-transform: uppercase;
      color: rgba(15,23,42,0.55); margin-bottom: 4px;
    }
    .mini-value{ font-size: 16px; font-weight: 900; color: rgba(15,23,42,0.92); }
    .divider-soft{ height: 1px; background: rgba(15,23,42,0.08); margin: 12px 0; }
    .total-row{ display:flex; justify-content:space-between; align-items:center; gap:12px; padding: 2px 0 6px; }
    .total-label{ font-weight: 900; font-size: 14px; color: rgba(15,23,42,0.92); }
    .total-amount{ font-weight: 950; font-size: 18px; color: rgba(15,23,42,0.95); }
    .delta-row{ display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; }
    .delta{
      display:inline-flex; align-items:center; gap:8px; padding:6px 10px;
      border-radius: 999px; border: 1px solid rgba(15,23,42,0.10); background: rgba(15,23,42,0.03);
      font-weight: 800; font-size: 12px; color: rgba(15,23,42,0.78);
    }
    .delta-tag{
      width:18px; height:18px; border-radius:999px; display:grid; place-items:center;
      font-size:12px; font-weight:900; background: rgba(15,23,42,0.08); color: rgba(15,23,42,0.75);
    }
    .delta.pos{ border-color: rgba(245,158,11,0.22); background: rgba(245,158,11,0.12); color: rgba(120,53,15,1); }
    .delta.pos .delta-tag{ background: rgba(245,158,11,0.22); color: rgba(120,53,15,1); }
    .delta.neg{ border-color: rgba(34,197,94,0.22); background: rgba(34,197,94,0.12); color: rgba(21,128,61,1); }
    .delta.neg .delta-tag{ background: rgba(34,197,94,0.22); color: rgba(21,128,61,1); }

    .info{ display:flex; gap:10px; align-items:flex-start; border:1px solid rgba(15,23,42,0.08);
      background: rgba(255,255,255,0.70); padding:10px 12px; border-radius:14px; }
    .info-dot{
      width:10px; height:10px; border-radius:999px; margin-top:6px;
      background: linear-gradient(135deg, var(--app-primary), var(--app-secondary));
      box-shadow: 0 6px 12px rgba(79, 70, 229, 0.15);
      flex: 0 0 10px;
    }
    .tip-dot{
      width:10px; height:10px; border-radius:999px; margin-top:6px;
      background: linear-gradient(135deg, var(--app-primary), var(--app-secondary));
      box-shadow: 0 6px 12px rgba(79, 70, 229, 0.15);
      flex: 0 0 10px;
    }
    @media (max-width: 576px){ .mini-grid{ grid-template-columns: 1fr; } }
  `]
})
export class ModifyBookingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private bookings = inject(BookingService);
  private rooms = inject(RoomService);
  private snack = inject(MatSnackBar);

  // UI state
  loading = signal(false);

  // today at 00:00 local (for min date)
  minDate = new Date(new Date().setHours(0, 0, 0, 0));

  // bookingId from query param
  bookingId = computed(() => this.route.snapshot.queryParamMap.get('bookingId') ?? '');

  // read from service cache (loadOne will populate it)
  bookingNow = computed<BookingRow | undefined>(() => this.bookings.byId(this.bookingId()));

  // form
  form = this.fb.group({
    from: [null as Date | null, [Validators.required, this.pastDateValidator()]],
    to: [null as Date | null, [Validators.required]],
    guests: [1, [Validators.required, Validators.min(1)]],
    reason: ['', [Validators.required, Validators.minLength(5)]],
    notes: ['', [Validators.maxLength(250)]]
  }, { validators: [this.dateRangeValidator()] });

  // handy accessors
  get fromCtrl() { return this.form.get('from')!; }
  get toCtrl() { return this.form.get('to')!; }
  get guestsCtrl() { return this.form.get('guests')!; }
  get reasonCtrl() { return this.form.get('reason')!; }
  get notesCtrl() { return this.form.get('notes')!; }

  ngOnInit() {
    const id = this.bookingId();
    if (!id) return;

    // load booking into cache
    this.bookings.loadOne(id);

    // patch form when booking arrives (simple retry loop for cache fill)
    const start = Date.now();
    const timer = setInterval(() => {
      const b = this.bookingNow();
      if (b) {
        this.form.patchValue({
          from: this.safeDate(b.fromDate),
          to: this.safeDate(b.toDate),
          guests: b.guests ?? 1,
          reason: '',
          notes: ''
        });
        // adjust guest max validator based on room capacity, if known
        const max = this.maxGuests();
        if (Number.isFinite(max)) {
          this.guestsCtrl.addValidators(Validators.max(max));
          this.guestsCtrl.updateValueAndValidity({ emitEvent: false });
        }
        clearInterval(timer);
      } else if (Date.now() - start > 4000) {
        // timeout after 4s
        clearInterval(timer);
      }
    }, 120);
  }

  // ---- Helpers ----
  private safeDate(s: string | Date | null): Date | null {
    if (!s) return null;
    const d = (s instanceof Date) ? s : new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  toMinDate() {
    const from = this.form.value.from;
    if (!from) return this.minDate;
    const d = new Date(from);
    d.setDate(d.getDate() + 1);
    return d;
  }

  notesLength() {
    return (this.form.value.notes ?? '').length;
  }

  // ---- Currency / formatting helpers for consistent UX in dialogs/snacks ----
  private inr(n: number) {
    // Formats in ₹ and Indian grouping
    return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
  }

  private fmtDate(d: Date | null | undefined) {
    if (!d) return '—';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ---- ID Normalization & Safe Room Lookup (prevents TS2345 and runtime nulls) ----
  private normalizeId(id: string | number | null | undefined): string | number | undefined {
    if (id == null) return undefined;
    if (typeof id === 'string' && id.trim() === '') return undefined;
    if (typeof id === 'string' && /^\d+$/.test(id)) return Number(id);
    return id;
  }

  private roomById(id: string | number | null | undefined): any | undefined {
    const norm = this.normalizeId(id);
    if (norm === undefined) return undefined;
    return this.rooms.byId(norm);
  }

  roomName = computed(() => {
    const b = this.bookingNow();
    if (!b) return '';
    return this.roomById(b.roomId)?.name ?? (typeof b.roomId === 'string' ? b.roomId : '');
  });

  maxGuests = computed(() => {
    const b = this.bookingNow();
    if (!b) return 10;
    const room: any = this.roomById(b.roomId);
    return room?.capacity ?? room?.maxGuests ?? 10;
  });

  pricePerNight() {
    const b = this.bookingNow();
    if (!b) return 0;
    const room: any = this.roomById(b.roomId);
    return room?.pricePerNight ?? 0;
  }

  previewNights() {
    const from = this.form.value.from;
    const to = this.form.value.to;
    if (!from || !to) return 0;

    const fromISO = this.toDateOnlyLocal(from);
    const toISO = this.toDateOnlyLocal(to);

    const n = this.bookings.calcNights(fromISO, toISO);
    return Math.max(0, n);
  }

  previewTotal() {
    return this.previewNights() * this.pricePerNight();
  }

  deltaAmount(currentTotal: number) {
    return this.previewTotal() - (currentTotal ?? 0);
    // positive => additional payment, negative => refund
  }
  abs(n: number) { return Math.abs(n); }
  deltaLabel(currentTotal: number) {
    const d = this.deltaAmount(currentTotal);
    if (d > 0) return 'Increase';
    if (d < 0) return 'Decrease';
    return 'No change';
  }

  // save handler: PATCH modify; redirect to pay if difference > 0 (additional payment)
  // ask user for confirmation BEFORE making the change
  save() {
    const b = this.bookingNow();
    if (!b || this.form.invalid) return;

    // --- Confirmation dialog (native confirm to avoid extra dialog components) ---
    const from = this.form.value.from ?? null;
    const to = this.form.value.to ?? null;
    const guests = Number(this.form.value.guests ?? 1);

    const currentTotal = Number(b.totalAmount ?? 0);
    const newEstimate = this.previewTotal();
    const delta = newEstimate - currentTotal;

    const deltaText =
      delta > 0 ? `Additional payment: ${this.inr(delta)}`
      : delta < 0 ? `Refund: ${this.inr(Math.abs(delta))}`
      : 'No price change';

    const confirmText =
      `Confirm modify?\n\n` +
      `Check-in: ${this.fmtDate(from)}\n` +
      `Check-out: ${this.fmtDate(to)}\n` +
      `Nights: ${this.previewNights()}\n` +
      `Guests: ${guests}\n\n` +
      `Current total: ${this.inr(currentTotal)}\n` +
      `New estimate: ${this.inr(newEstimate)}\n` +
      `Difference: ${deltaText}\n\n` +
      `Proceed with modifying this booking?`;

    const ok = window.confirm(confirmText);
    if (!ok) return;

    this.loading.set(true);

    const checkIn = this.bookings.toDateOnly(this.form.value.from!);
    const checkOut = this.bookings.toDateOnly(this.form.value.to!);

    // If you support multiple rooms, push them all. From history we likely have one room.
    const roomIdNum = Number(b.roomId);
    const roomIds = Number.isFinite(roomIdNum) ? [roomIdNum] : [];

    const payload: ModifyBookingRequestDto = {
      roomIds,
      checkIn,
      checkOut,
      numberOfGuests: guests,
      adults: guests,   // adjust if you collect adults/children separately
      children: 0
    };

    this.bookings.modifyBooking(b.id, payload).subscribe({
      next: (res) => {
        this.loading.set(false);

        // Backend returns "difference" where negative => refund, positive => addl payment
        const diffRaw = Number(res.amountDifference ?? 0);
        const roundedDiff = Math.round(diffRaw * 100) / 100;

        if (roundedDiff > 0) {
          // Additional payment required
          this.snack.open(
            `Additional payment of ${this.inr(roundedDiff)} is required. Redirecting to payment...`,
            'Close',
            { duration: 3000 }
          );

          const pid = res.paymentId;
          if (!pid) {
            this.snack.open('Additional payment required but payment reference is missing.', 'Close', { duration: 3500 });
            return;
          }

          const url = `/customer/pay?paymentId=${pid}&bookingId=${b.id}&amount=${roundedDiff}`;
          this.router.navigateByUrl(url);
          return;
        }

        if (roundedDiff < 0) {
          // Refund due
          const refund = Math.abs(roundedDiff);
          this.snack.open(
            res.message || `Refund of ${this.inr(refund)} will be processed to your original payment method.`,
            'Close',
            { duration: 3500 }
          );
          this.router.navigateByUrl('/customer/history');
          return;
        }

        // No price change
        this.snack.open(res.message || 'Booking modified successfully (no price change).', 'Close', { duration: 3000 });
        this.router.navigateByUrl('/customer/history');
      },
      error: (err) => {
        this.loading.set(false);
        console.error('[Modify] failed', err);
        this.snack.open(
          err?.error?.message ?? err?.error ?? err?.message ?? 'Unable to modify booking. Please try again.',
          'Close',
          { duration: 4000 }
        );
      }
    });
  }

  back() { this.router.navigateByUrl('/customer/history'); }

  // ========= Validators =========
  private dateRangeValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const from = group.get('from')?.value as Date | null;
      const to = group.get('to')?.value as Date | null;
      if (!from || !to) return null;

      // compare by date only
      const fromD = new Date(from); fromD.setHours(0,0,0,0);
      const toD = new Date(to); toD.setHours(0,0,0,0);

      if (toD <= fromD) return { dateRange: true };
      return null;
    };
  }

  private pastDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = control.value as Date | null;
      if (!v) return null;
      const d = new Date(v); d.setHours(0,0,0,0);
      const today = new Date(); today.setHours(0,0,0,0);
      return d < today ? { pastDate: true } : null;
    };
  }

  /** Converts picked local date to yyyy-MM-dd (local midnight), for stable day comparison */
  private toDateOnlyLocal(d: Date) {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

