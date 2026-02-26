import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap, map, finalize, tap, catchError } from 'rxjs/operators'; 
import { RoomService } from '../../../core/services/room.service';
import { BookingService } from '../../../core/services/booking.service';
import { AuthService } from '../../../core/services/auth.service';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';



import { PaymentApiService } from '../../../core/services/payment-api.service';
// NEW: backend booking API
import { BookingApiService, toDateOnly } from '../../../core/services/booking-api.service';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule
  ],
  template: `
    <div class="dash-bg">
      <div class="container-fluid p-0">

        <!-- HERO HEADER -->
        <div class="app-card p-3 p-md-4 mb-4 hero">
          <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
            <div>
              <div class="kicker">Booking</div>
              <h2 class="fw-bold mb-1 title">Confirm Your Reservation</h2>
              <p class="text-muted mb-0">
                Review details, add contact info, and proceed to payment.
              </p>
            </div>

            <div class="hero-badge" *ngIf="room() as r">
              <span class="badge-dot"></span>
              <span class="text-muted small">Selected:</span>
              <span class="small fw-semibold">{{ r.name }} • {{ r.type }}</span>
            </div>
          </div>
        </div>

        <!-- INVALID STATE -->
        <div class="app-card p-3 p-md-4" *ngIf="invalidLink()">
          <h5 class="fw-bold mb-2">Invalid booking link</h5>
          <p class="text-muted mb-3">
            Some required details are missing or invalid (room, dates, or guests).
          </p>
          <button mat-raised-button class="btn-app" (click)="back()">Go to Search</button>
        </div>

        <!-- MAIN CONTENT -->
        <div class="row g-3 g-md-4" *ngIf="!invalidLink() && room() as r">

          <!-- LEFT: SUMMARY -->
          <div class="col-12 col-lg-7">
            <div class="app-card p-3 p-md-4 h-100">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h5 class="fw-bold mb-0">Reservation Summary</h5>
                <span class="badge text-bg-light border pill-badge">{{ nights() }} night(s)</span>
              </div>

              <div class="kv-grid">
                <div class="kv">
                  <div class="kv-label">Room</div>
                  <div class="kv-value">{{ r.name }} <span class="muted">({{ r.type }})</span></div>
                </div>

                <div class="kv">
                  <div class="kv-label">Check-in</div>
                  <div class="kv-value">{{ fromDate() | date:'mediumDate' }}</div>
                </div>

                <div class="kv">
                  <div class="kv-label">Check-out</div>
                  <div class="kv-value">{{ toDate() | date:'mediumDate' }}</div>
                </div>

                <div class="kv">
                  <div class="kv-label">Guests</div>
                  <div class="kv-value">{{ guests() }}</div>
                </div>
              </div>

              <mat-divider class="my-3"></mat-divider>

              <!-- PRICE -->
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="fw-bold mb-0">Price Breakdown</h6>
                <span class="text-muted small">Estimated</span>
              </div>

              <div class="price-row">
                <span class="text-muted">₹{{ r.pricePerNight }} × {{ nights() }} night(s)</span>
                <b>₹{{ subtotal() }}</b>
              </div>

              <div class="price-row">
                <span class="text-muted">Taxes & fees</span>
                <b>₹{{ fees() }}</b>
              </div>

              <mat-divider class="my-2"></mat-divider>

              <div class="price-row total">
                <span>Total</span>
                <span>₹{{ total() }}</span>
              </div>

              <div class="warn mt-3" *ngIf="dateRangeInvalid()">
                ⚠️ Check-in date must be earlier than check-out date.
              </div>

              <div class="warn mt-2" *ngIf="guestInvalid()">
                ⚠️ Guests must be between 1 and {{ maxGuests() }} for this room.
              </div>
            </div>
          </div>

          <!-- RIGHT: FORM -->
          <div class="col-12 col-lg-5">
            <div class="app-card p-3 p-md-4">
              <h5 class="fw-bold mb-2">Guest & Contact Details</h5>
              <p class="text-muted small mb-3">
                These details will be used for check-in and booking communications.
              </p>

              <form [formGroup]="form" class="grid-form" novalidate>

                <mat-form-field appearance="outline">
                  <mat-label>Contact Email</mat-label>
                  <input matInput formControlName="email" placeholder="name@example.com" />
                  <mat-error *ngIf="form.controls.email.touched && form.controls.email.hasError('required')">
                    Email is required.
                  </mat-error>
                  <mat-error *ngIf="form.controls.email.touched && form.controls.email.hasError('email')">
                    Enter a valid email.
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Contact Phone</mat-label>
                  <input matInput formControlName="phone" placeholder="10-digit number" />
                  <mat-error *ngIf="form.controls.phone.touched && form.controls.phone.hasError('required')">
                    Phone is required.
                  </mat-error>
                  <mat-error *ngIf="form.controls.phone.touched && form.controls.phone.hasError('pattern')">
                    Enter a valid phone number.
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Expected Arrival Time</mat-label>
                  <mat-select formControlName="arrival">
                    <mat-option value="Morning (8am–12pm)">Morning (8am–12pm)</mat-option>
                    <mat-option value="Afternoon (12pm–4pm)">Afternoon (12pm–4pm)</mat-option>
                    <mat-option value="Evening (4pm–8pm)">Evening (4pm–8pm)</mat-option>
                    <mat-option value="Night (8pm–12am)">Night (8pm–12am)</mat-option>
                  </mat-select>
                  <mat-error *ngIf="form.controls.arrival.touched && form.controls.arrival.hasError('required')">
                    Arrival time is required.
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Special Requests (optional)</mat-label>
                  <textarea matInput rows="3" formControlName="requests"
                    placeholder="Eg: late check-in, extra pillow, high-floor room"></textarea>
                  <mat-hint align="end">{{ form.controls.requests.value?.length || 0 }}/250</mat-hint>
                  <mat-error *ngIf="form.controls.requests.touched && form.controls.requests.hasError('maxlength')">
                    Maximum 250 characters.
                  </mat-error>
                </mat-form-field>

                <div class="policy">
                  <div class="policy-title">Policy</div>
                  <div class="text-muted small">
                    • Check-in: 12:00 PM • Check-out: 11:00 AM<br>
                    • You may be asked to present a valid ID at check-in.
                  </div>
                </div>

                <mat-checkbox formControlName="terms" class="mt-1">
                  I agree to the booking terms & hotel policies.
                </mat-checkbox>
                <div class="warn" *ngIf="form.controls.terms.touched && form.controls.terms.invalid">
                  ⚠️ You must accept the terms to continue.
                </div>
              </form>

              <div class="mt-4 d-flex gap-2">
                <!-- ✅ click always fires; blocked only by loading -->
                <button mat-raised-button class="btn-app flex-grow-1"
                        [disabled]="loading()"
                        (click)="confirm()">
                  {{ loading() ? 'Processing...' : 'Confirm Booking' }}
                </button>
                <button mat-stroked-button (click)="back()">Back</button>
              </div>

              <div class="text-muted small mt-3">
                Tip: Your booking will be reserved only after payment is completed.
              </div>
            </div>
          </div>

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
      border-radius: 18px;
    }

    .hero{
      background: #fff !important;
      border: 1px solid var(--app-border);
      border-radius: 18px;
      box-shadow: 0 10px 25px rgba(2, 8, 23, 0.08);
      overflow: hidden;
    }
    .hero::before, .hero::after{ content:none !important; display:none !important; }

    .kicker{
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: rgba(15,23,42,0.55);
      margin-bottom: 6px;
    }
    .title{ letter-spacing: -0.01em; }

    .hero-badge{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 999px;
      border: 1px solid rgba(15,23,42,0.08);
      background: rgba(15,23,42,0.02);
      white-space: nowrap;
    }
    .badge-dot{
      width: 8px; height: 8px; border-radius: 999px;
      background: var(--app-secondary);
      box-shadow: 0 0 0 4px rgba(6,182,212,0.12);
    }

    .pill-badge{ border-radius: 999px; padding: 6px 10px; font-weight: 700; }

    .kv-grid{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-top: 10px;
    }
    @media (max-width: 576px){ .kv-grid{ grid-template-columns: 1fr; } }

    .kv{
      border: 1px solid rgba(15,23,42,0.08);
      background: rgba(255,255,255,0.7);
      border-radius: 14px;
      padding: 12px;
    }
    .kv-label{
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: rgba(15,23,42,0.55);
      margin-bottom: 4px;
    }
    .kv-value{ font-weight: 900; color: rgba(15,23,42,0.92); }
    .muted{ font-weight: 700; color: rgba(15,23,42,0.60); }

    .price-row{ display:flex; justify-content: space-between; padding: 6px 0; }
    .price-row.total{ font-size: 18px; font-weight: 900; }

    .grid-form{ display:grid; gap: 12px; }

    .policy{
      border: 1px dashed rgba(15,23,42,0.14);
      background: rgba(15,23,42,0.02);
      border-radius: 14px;
      padding: 12px;
    }
    .policy-title{ font-weight: 900; margin-bottom: 6px; }

    .warn{ color: rgba(239,68,68,0.95); font-weight: 700; font-size: 13px; }

    .btn-app{
      background: var(--app-primary);
      color: #fff;
    }
  `]
})
export class BookRoomComponent {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rooms: RoomService,
    private bookings: BookingService,         // kept for calcNights (no changes)
    private bookingApi: BookingApiService,    // NEW: backend api
    private auth: AuthService,
    private paymentApi: PaymentApiService,   // 👈 add this
  
    private fb: FormBuilder
  ) {
    const u = this.auth.user();
    if (u) {
      this.form.patchValue({
        email: (u as any).email ?? '',
        phone: (u as any).phone ?? ''
      });
    }
  }

  loading = signal(false);

  roomId = computed(() => this.route.snapshot.queryParamMap.get('roomId') ?? '');
  fromISO = computed(() => this.route.snapshot.queryParamMap.get('from') ?? '');
  toISO = computed(() => this.route.snapshot.queryParamMap.get('to') ?? '');
  guests = computed(() => Number(this.route.snapshot.queryParamMap.get('guests') ?? 1));

  // Replace your existing `room` computed with this:

  room = computed(() => {
    const idStr = this.roomId();
    if (!idStr) return undefined;

    const idNum = Number(idStr);
    // Try numeric lookup first
    if (Number.isFinite(idNum)) {
      const rNum = (this.rooms as any).byId(idNum);
      if (rNum) return rNum;
    }
    // Fallback to string lookup if your service supports it
    return (this.rooms as any).byId(idStr);
  });


  // Add these two helpers in the class:
  private parseDateOnly(s: string): Date | null {
    if (!s) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    const y = Number(m[1]), mo = Number(m[2]), da = Number(m[3]);
    // Construct UTC date to avoid TZ issues
    return new Date(Date.UTC(y, mo - 1, da));
  }

  private safeDate(iso: string): Date | null {
    return this.parseDateOnly(iso);
  }

  fromDate = computed(() => this.safeDate(this.fromISO()));
  toDate = computed(() => this.safeDate(this.toISO()));

  nights = computed(() => this.bookings.calcNights(this.fromISO(), this.toISO()));
  subtotal = computed(() => (this.room()?.pricePerNight ?? 0) * (this.nights() ?? 0));
  fees = computed(() => 0);
  total = computed(() => this.subtotal() + this.fees());

  maxGuests = computed(() => (this.room() as any)?.maxGuests ?? 6);

  dateRangeInvalid = computed(() => {
    const f = this.fromDate();
    const t = this.toDate();
    if (!f || !t) return true;
    return f.getTime() >= t.getTime();
  });

  guestInvalid = computed(() => {
    const g = this.guests();
    return !Number.isFinite(g) || g < 1 || g > this.maxGuests();
  });

  invalidLink = computed(() => {
    return !this.room()
      || !this.fromISO()
      || !this.toISO()
      || this.dateRangeInvalid()
      || this.nights() <= 0
      || this.guestInvalid();
  });

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    arrival: ['', [Validators.required]],
    requests: ['', [Validators.maxLength(250)]],
    terms: [false, [Validators.requiredTrue]]
  });

confirm() {
  console.log('[ConfirmBooking] clicked');

  const user = this.auth.user();
  const r = this.room();
  if (!user || !r) {
    console.warn('[ConfirmBooking] Missing user or room', { user: !!user, room: !!r });
    alert('Missing user or room. Please try again.');
    return;
  }

  this.form.markAllAsTouched();
  if (this.invalidLink()) {
    console.warn('[ConfirmBooking] invalidLink()', {
      room: !!this.room(),
      fromISO: this.fromISO(),
      toISO: this.toISO(),
      nights: this.nights(),
      guestInvalid: this.guestInvalid(),
      dateRangeInvalid: this.dateRangeInvalid()
    });
    alert('Invalid booking details. Please go back and search again.');
    this.back();
    return;
  }
  if (this.form.invalid) {
    console.warn('[ConfirmBooking] form invalid', this.form.value);
    alert('Please fix the form errors.');
    return;
  }

  this.loading.set(true);

  const guests = this.guests();
  const checkIn = toDateOnly(this.fromISO());  // must be 'YYYY-MM-DD'
  const checkOut = toDateOnly(this.toISO());

  const payload = {
    userId: Number((user as any).id),
    roomIds: [Number((r as any).id)],
    checkIn,
    checkOut,
    adults: guests,
    children: 0,
    numberOfGuests: guests
  };
  console.log('[ConfirmBooking] /api/bookings/check →', payload);

  this.bookingApi.createBooking(payload).subscribe({
    next: (resp: any) => {
      this.loading.set(false);
      console.log('[ConfirmBooking] booking created ✔', resp);
      const url = `/customer/pay?bookingId=${resp.bookingId}`;
      console.log('[ConfirmBooking] navigate →', url);
      this.router.navigateByUrl(url);
    },
    error: (err) => {
      this.loading.set(false);
      console.error('[ConfirmBooking] booking failed ✖', err);
      alert(
        err?.error?.message ??
        err?.message ??
        'Unable to create booking. Please try again.'
      );
    }
  });
}

  back() {
    this.router.navigateByUrl('/customer/search');
  }


  ngOnInit(): void {
    console.log('[BookRoom] incoming params', {
      roomId: this.roomId(),
      from: this.fromISO(),
      to: this.toISO(),
      guests: this.guests()
    });

    setTimeout(() => {
      console.log('[BookRoom] resolved', {
        room: this.room(),
        fromDate: this.fromDate(),
        toDate: this.toDate(),
        nights: this.nights(),
        dateRangeInvalid: this.dateRangeInvalid(),
        guestInvalid: this.guestInvalid()
      });
    }, 0);
  }

}
