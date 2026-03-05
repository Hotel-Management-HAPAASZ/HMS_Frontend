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
import { MatProgressBarModule } from '@angular/material/progress-bar';

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
    MatProgressBarModule
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
              Update your stay dates and guest count. Changes are validated at save.
            </p>
          </div>

          <div class="d-flex gap-2">
            <button mat-stroked-button type="button" (click)="back()" class="btn-ghost">
              ← Back
            </button>
            <button mat-raised-button color="primary"
              class="btn-app"
              [disabled]="form.invalid || loading() || !bookingNow()"
              type="submit"
              form="modifyForm">
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

              <form [formGroup]="form" class="row g-3" (ngSubmit)="openConfirmOverlay()" id="modifyForm">

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

                <!-- Reason (Optional now) -->
                <div class="col-12 col-md-6">
                  <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Reason for change (optional)</mat-label>
                    <input matInput placeholder="E.g., travel dates changed"
                      formControlName="reason" />
                  </mat-form-field>
                </div>

                <!-- Footer buttons (inside card for mobile) -->
                <div class="col-12 d-flex gap-2 mt-1">
                  <button mat-raised-button color="primary"
                    class="btn-app"
                    [disabled]="form.invalid || loading()"
                    type="submit">
                    {{ loading() ? 'Saving...' : 'Save Changes' }}
                  </button>
                  <button mat-stroked-button type="button" (click)="back()" class="btn-ghost">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Right: (No price summary) -->
          <div class="col-12 col-lg-5">
            <div class="app-card p-3 p-md-4">
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

  <!-- ===== Overlay (confirm + processing/refund/status) ===== -->
  <div class="overlay-backdrop" *ngIf="overlayVisible()">
    <div class="overlay-card app-card p-3 p-md-4">
      <!-- Confirm overlay -->
      <ng-container *ngIf="overlayKind() === 'confirm'">
        <h5 class="fw-bold mb-1">Confirm modification</h5>
        <p class="text-muted small mb-3">Please review and confirm your changes.</p>

        <div class="mini-grid">
          <div class="mini">
            <div class="mini-label">Check-in</div>
            <div class="mini-value">{{ fmtDate(form.value.from) }}</div>
          </div>
          <div class="mini">
            <div class="mini-label">Check-out</div>
            <div class="mini-value">{{ fmtDate(form.value.to) }}</div>
          </div>
          <div class="mini">
            <div class="mini-label">Guests</div>
            <div class="mini-value">{{ form.value.guests || 1 }}</div>
          </div>
        </div>

        <div class="d-flex gap-2 mt-3">
          <button mat-raised-button color="primary" class="btn-app"
                  (click)="confirmSave()" [disabled]="loading()">Confirm</button>
          <button mat-stroked-button class="btn-ghost" (click)="closeOverlay()"
                  [disabled]="loading()">Cancel</button>
        </div>
      </ng-container>

      <!-- Processing / Refund progress -->
      <ng-container *ngIf="overlayKind() === 'processing' || overlayKind() === 'refund'">
        <h5 class="fw-bold mb-1">{{ overlayTitle() }}</h5>
        <div class="text-muted small" *ngIf="overlayMessage()">{{ overlayMessage() }}</div>
        <div class="mt-3"><mat-progress-bar mode="indeterminate"></mat-progress-bar></div>
      </ng-container>

      <!-- Success -->
      <ng-container *ngIf="overlayKind() === 'success'">
        <h5 class="fw-bold mb-1">{{ overlayTitle() }}</h5>
        <div class="text-muted small" *ngIf="overlayMessage()">{{ overlayMessage() }}</div>
        <div class="d-flex gap-2 mt-3">
          <button mat-raised-button color="primary" class="btn-app" (click)="goHistory()">Go to History</button>
        </div>
      </ng-container>

      <!-- Error -->
      <ng-container *ngIf="overlayKind() === 'error'">
        <h5 class="fw-bold mb-1">{{ overlayTitle() }}</h5>
        <div class="text-muted small" *ngIf="overlayMessage()">{{ overlayMessage() }}</div>
        <div class="d-flex gap-2 mt-3">
          <button mat-raised-button color="primary" class="btn-app" (click)="closeOverlay()">Close</button>
        </div>
      </ng-container>
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

    /* Overlay */
    .overlay-backdrop{
      position: fixed; inset: 0; z-index: 1050;
      background: rgba(2,8,23,0.45);
      display: grid; place-items: center;
      padding: 14px;
    }
    .overlay-card{
      width: 100%;
      max-width: 560px;
      border: 1px solid var(--app-border);
      border-radius: 18px;
      background: #fff;
      box-shadow: 0 20px 40px rgba(2,8,23,0.18);
      animation: pop 0.12s ease-out;
    }
    @keyframes pop {
      from { transform: scale(0.98); opacity: 0.6; }
      to { transform: scale(1); opacity: 1; }
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

  // UI state
  loading = signal(false);

  // Overlay state
  overlayVisible = signal(false);
  overlayKind = signal<'confirm' | 'processing' | 'refund' | 'success' | 'error' | 'payment'>('confirm');
  overlayTitle = signal<string>('');
  overlayMessage = signal<string>('');

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
    // Reason is optional now (no required/minLength)
    reason: ['']
  }, { validators: [this.dateRangeValidator()] });

  // handy accessors
  get fromCtrl() { return this.form.get('from')!; }
  get toCtrl() { return this.form.get('to')!; }
  get guestsCtrl() { return this.form.get('guests')!; }
  get reasonCtrl() { return this.form.get('reason')!; }

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
          reason: ''
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

  fmtDate(d: Date | null | undefined) {
    if (!d) return '—';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ---- ID Normalization & Safe Room Lookup ----
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

  // ===== Overlay controls =====
  openConfirmOverlay() {
    if (this.form.invalid || this.loading()) return;
    this.overlayTitle.set('Confirm modification');
    this.overlayMessage.set('Are you sure you want to modify this booking?');
    this.overlayKind.set('confirm');
    this.overlayVisible.set(true);
  }

  closeOverlay() {
    if (this.loading()) return; // don't allow closing during processing
    this.overlayVisible.set(false);
  }

  private async delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
  }

  // ===== Save flow (overlay confirm -> call API -> overlay buffer/status) =====
  confirmSave() {
    const b = this.bookingNow();
    if (!b || this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.overlayKind.set('processing');
    this.overlayTitle.set('Saving changes…');
    this.overlayMessage.set('Please wait while we update your booking.');
    this.overlayVisible.set(true);

    const guests = Number(this.form.value.guests ?? 1);
    const checkIn = this.bookings.toDateOnly(this.form.value.from!);
    const checkOut = this.bookings.toDateOnly(this.form.value.to!);

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
      next: async (res) => {
        this.loading.set(false);

        const msg = (res?.message ?? '').toLowerCase();
        const paymentId = res?.paymentId ?? null;
        const amount = Number(res?.amountDifference ?? 0);

        // ---- Refund flow (use message to decide) ----
        if (msg.includes('refund')) {
          // Never redirect to payment for refunds, even if paymentId exists
          const inrAmount = this.inr(Math.abs(amount));
          this.overlayKind.set('refund');
          this.overlayTitle.set('Processing refund…');
          this.overlayMessage.set(`Initiating refund of ${inrAmount} to your original payment method.`);
          // 5-second buffer
          await this.delay(5000);
          this.overlayKind.set('success');
          this.overlayTitle.set('Refund completed');
          this.overlayMessage.set(res?.message || `Refund of ${inrAmount} has been completed.`);
          // navigate to history
          this.router.navigateByUrl('/customer/history');
          return;
        }

        // ---- Additional payment flow (require BOTH: message indicates + paymentId present) ----
        if (msg.includes('additional') && msg.includes('payment')) {
          if (!paymentId) {
            // Defensive: message says additional payment but no paymentId
            this.overlayKind.set('error');
            this.overlayTitle.set('Payment reference missing');
            this.overlayMessage.set('Additional payment is required but payment reference was not provided by the server.');
            return;
          }
          this.overlayKind.set('payment');
          this.overlayTitle.set('Additional payment required');
          this.overlayMessage.set(`Redirecting to complete payment of ${this.inr(Math.abs(amount))}.`);
          const url = `/customer/pay?paymentId=${paymentId}&bookingId=${b.id}&amount=${Math.abs(amount)}`;
          this.router.navigateByUrl(url);
          return;
        }

        // ---- No price change or generic success ----
        this.overlayKind.set('success');
        this.overlayTitle.set('Booking modified');
        this.overlayMessage.set(res?.message || 'Your booking was updated. No price change.');
        this.router.navigateByUrl('/customer/history');
      },
      error: (err) => {
        this.loading.set(false);
        console.error('[Modify] failed', err);
        this.overlayKind.set('error');
        this.overlayTitle.set('Unable to modify booking');
        this.overlayMessage.set(err?.error?.message ?? err?.error ?? err?.message ?? 'Please try again.');
      }
    });
  }

  goHistory() {
    this.router.navigateByUrl('/customer/history');
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

  /** INR currency formatting */
  private inr(n: number) {
    return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
  }
}
